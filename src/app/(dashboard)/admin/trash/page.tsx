"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, XCircle, Search, Eraser, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/auth-provider";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { deletionService } from "@/lib/deletion-service";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/providers/loading-provider";
import type { DeletionHistory } from "@/lib/types";

export default function TrashPage() {
    const { isAdmin, activeWorkspaceId, businessId, currentUser, getCurrencySymbol } = useAuth();
    const { toast } = useToast();
    const { showLoader, hideLoader } = useLoading();
    const [searchTerm, setSearchTerm] = useState("");
    const currencySymbol = getCurrencySymbol();

    const deletionHistory = useLiveQuery(
        () => activeWorkspaceId ? deletionService.getDeletionHistory(activeWorkspaceId) : [],
        [activeWorkspaceId]
    );

    const [isRestoring, setIsRestoring] = useState<string | null>(null);

    const filteredHistory = deletionHistory?.filter(item =>
        !item.restoredAt && // Only show non-restored items
        (item.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.deletedBy.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    const handleRestore = async (item: DeletionHistory) => {
        if (!isAdmin || !businessId || !activeWorkspaceId || !currentUser?.uid) return;

        setIsRestoring(item.id);
        showLoader();
        try {
            const result = await deletionService.restore(
                item.entityType,
                item.entityId,
                businessId,
                activeWorkspaceId,
                currentUser.displayName || "Admin",
                currentUser.uid
            );

            if (result.success) {
                toast({
                    title: "Élément restauré",
                    description: (
                        <div className="flex flex-col gap-1">
                            <span>{item.entityName} a été restauré avec succès.</span>
                            {result.calculations.treasuryAdjustment != null && result.calculations.treasuryAdjustment !== 0 && (
                                <span className={result.calculations.treasuryAdjustment > 0 ? "text-green-600" : "text-red-600"}>
                                    Ajustement trésorerie: {result.calculations.treasuryAdjustment > 0 ? "+" : ""}
                                    {result.calculations.treasuryAdjustment.toLocaleString('fr-FR')} {currencySymbol}
                                </span>
                            )}
                        </div>
                    )
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Échec de la restauration", description: error.message });
        } finally {
            hideLoader();
            setIsRestoring(null);
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'client': return 'Client';
            case 'reservation': return 'Prestation';
            case 'stock': return 'Stock';
            case 'expense': return 'Dépense';
            case 'investment': return 'Investissement';
            case 'quickIncome': return 'Revenu Rapide';
            default: return type;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-headline font-semibold tracking-tight">Corbeille</h1>
                    <p className="text-muted-foreground">
                        Historique des suppressions et restauration.
                    </p>
                </div>
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                            <CardTitle>Éléments supprimés</CardTitle>
                            <CardDescription>
                                Vous pouvez restaurer les éléments supprimés récemment.
                            </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-autoflex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par nom..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Nom / Description</TableHead>
                                <TableHead>Supprimé par</TableHead>
                                <TableHead>Impact Trésorerie</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredHistory.length > 0 ? (
                                filteredHistory.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{format(item.deletedAt, 'dd MMM yyyy', { locale: fr })}</span>
                                                <span className="text-xs text-muted-foreground">{format(item.deletedAt, 'HH:mm')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {getTypeLabel(item.entityType)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{item.entityName}</TableCell>
                                        <TableCell>{item.deletedBy}</TableCell>
                                        <TableCell>
                                            {item.calculations.treasuryAdjustment ? (
                                                <span className={cn("font-medium", item.calculations.treasuryAdjustment > 0 ? "text-green-600" : "text-red-600")}>
                                                    {item.calculations.treasuryAdjustment > 0 ? "+" : ""}
                                                    {item.calculations.treasuryAdjustment.toLocaleString('fr-FR')} {currencySymbol}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isAdmin && item.canRestore && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleRestore(item)}
                                                    disabled={isRestoring === item.id}
                                                    className="gap-2"
                                                >
                                                    {isRestoring === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                                    Restaurer
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Trash2 className="h-8 w-8 opacity-20" />
                                            <span>Aucun élément supprimé trouvé.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function cn(arg0: string, arg1: string): string | undefined {
    throw new Error("Function not implemented.");
}
