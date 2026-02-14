
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Briefcase, DollarSign, TrendingUp, BarChart, ShieldCheck, ShieldAlert, Shield, AlertTriangle, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { syncService } from "@/lib/sync-service";
import type { Investment } from "@/lib/types";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { deletionService } from "@/lib/deletion-service";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLoading } from "@/providers/loading-provider";

const getStatusVariant = (status: Investment['status']) => {
    switch (status) {
        case "Actif": return "default";
        case "Planification": return "secondary";
        case "Terminé": return "outline";
        case "En attente": return "destructive";
        default: return "outline";
    }
};

const getRiskInfo = (risk: Investment['riskLevel']) => {
    switch (risk) {
        case "Faible": return { Icon: ShieldCheck, color: "text-green-500", text: "Faible Risque" };
        case "Moyen": return { Icon: ShieldAlert, color: "text-yellow-500", text: "Risque Moyen" };
        case "Élevé": return { Icon: Shield, color: "text-red-500", text: "Risque Élevé" };
        default: return { Icon: Shield, color: "text-muted-foreground", text: "Risque Indéfini" };
    }
};

const InvestmentCard = ({ investment, onDelete, currencySymbol }: { investment: Investment, onDelete: (investment: Investment) => void, currencySymbol: string }) => {
    const { isAdmin } = useAuth();
    const { isLoading, showLoader } = useLoading();

    const { Icon: RiskIcon, color: riskColor, text: riskText } = getRiskInfo(investment.riskLevel);

    const roi = investment.initialAmount > 0
        ? ((investment.expectedReturn - investment.initialAmount) / investment.initialAmount) * 100
        : 0;

    return (
        <Card className="shadow-lg flex flex-col h-full hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-xl">{investment.name}</CardTitle>
                    <Badge variant={getStatusVariant(investment.status)} className="capitalize shrink-0">
                        {investment.status}
                    </Badge>
                </div>
                <CardDescription className="line-clamp-2 pt-1">{investment.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
                <div className="flex justify-between items-baseline p-3 bg-secondary/30 rounded-md">
                    <span className="text-sm text-muted-foreground">Investissement Initial</span>
                    <span className="font-bold text-lg">{investment.initialAmount.toLocaleString('fr-FR')} {currencySymbol}</span>
                </div>
                <div className="flex justify-between items-baseline p-3 bg-secondary/30 rounded-md">
                    <span className="text-sm text-muted-foreground">Retour Attendu</span>
                    <span className="font-bold text-lg">{investment.expectedReturn.toLocaleString('fr-FR')} {currencySymbol}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-sm">
                    <span className="font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" /> ROI Estimé</span>
                    <span className={cn("font-bold", roi >= 0 ? "text-green-600" : "text-red-600")}>
                        {roi.toFixed(1)}%
                    </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="font-medium flex items-center gap-2"><RiskIcon className={cn("h-4 w-4", riskColor)} /> Niveau de Risque</span>
                    <span className="font-bold">{riskText}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-muted-foreground">Durée</span>
                    <span>{investment.timeframeMonths} mois</span>
                </div>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-end gap-2">
                <Button variant="ghost" size="sm" asChild disabled={isLoading}>
                    <Link href={`/investments/${investment.id}/edit`} onClick={showLoader}><Edit className="h-4 w-4 mr-1" /> Modifier</Link>
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" disabled={!isAdmin || isLoading} onClick={() => onDelete(investment)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                </Button>
            </CardFooter>
        </Card>
    );
};

export default function InvestmentsPage() {
    const { isAdmin, currentUser, businessId, loading: authLoading, getCurrencySymbol, activeWorkspaceId } = useAuth();
    const { toast } = useToast();
    const { showLoader, hideLoader } = useLoading();
    const currencySymbol = getCurrencySymbol();

    const [investmentToDelete, setInvestmentToDelete] = React.useState<Investment | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);

    const investments = useLiveQuery(() => {
        if (!activeWorkspaceId) return [];
        return db.investments.where('workspaceId').equals(activeWorkspaceId).reverse().toArray();
    }, [activeWorkspaceId]) || [];

    const handleDelete = async (investment: Investment) => {
        if (!currentUser?.uid || !isAdmin || !businessId || !activeWorkspaceId) {
            toast({ variant: "destructive", title: "Action non autorisée" });
            return;
        }
        setInvestmentToDelete(investment);
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!investmentToDelete || !currentUser?.uid || !businessId || !currentUser.displayName || !activeWorkspaceId) return;

        showLoader();
        try {
            const result = await deletionService.deleteInvestment(
                investmentToDelete.id,
                businessId,
                activeWorkspaceId,
                currentUser.displayName,
                currentUser.uid
            );

            if (result.success) {
                toast({
                    title: "Investissement supprimé",
                    description: `Déplacé vers la corbeille. ${result.calculations.treasuryAdjustment ? `Ajustement trésorerie: ${result.calculations.treasuryAdjustment} ${currencySymbol}` : ''}`
                });
                setIsDeleteConfirmOpen(false);
                setInvestmentToDelete(null);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Échec de la suppression", description: error.message });
        } finally {
            hideLoader();
        }
    };

    const summary = useMemo(() => {
        const activeInvestments = investments.filter(inv => inv.status === 'Actif');
        const totalInvested = activeInvestments.reduce((sum, inv) => sum + inv.initialAmount, 0);
        return {
            count: investments.length,
            totalInvested,
        };
    }, [investments]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-headline font-semibold tracking-tight">Suivi des Investissements</h1>
                <Button asChild>
                    <Link href="/investments/new" onClick={showLoader}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un investissement
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Projets en cours</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.count}</div>
                        <p className="text-xs text-muted-foreground">Total des investissements enregistrés</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Capital Actif</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalInvested.toLocaleString('fr-FR')} {currencySymbol}</div>
                        <p className="text-xs text-muted-foreground">Montant total des projets actifs</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Analyse de Rentabilité</CardTitle>
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-muted-foreground">Bientôt...</div>
                        <p className="text-xs text-muted-foreground">Graphiques et analyses IA à venir</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {investments.length > 0 ? (
                    investments.map(inv => (
                        <InvestmentCard key={inv.id} investment={inv} onDelete={handleDelete} currencySymbol={currencySymbol} />
                    ))
                ) : (
                    <Card className="md:col-span-2 xl:col-span-3 text-center py-12 bg-secondary/30 border-dashed">
                        <CardHeader>
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background mb-4">
                                <Briefcase className="h-10 w-10 text-primary" />
                            </div>
                            <CardTitle>Commencez à suivre vos investissements</CardTitle>
                            <CardDescription>Enregistrez votre premier projet d'investissement pour analyser sa rentabilité.</CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-center">
                            <Button asChild>
                                <Link href="/investments/new" onClick={showLoader}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Ajouter votre premier investissement
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>

            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Supprimer l'investissement ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Vous êtes sur le point de supprimer le projet <strong>{investmentToDelete?.name}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {investmentToDelete && (investmentToDelete.initialAmount) > 0 && (
                        <div className="bg-destructive/10 p-4 rounded-md space-y-2 text-sm text-destructive">
                            <div className="flex justify-between font-bold">
                                <span>Montant à restituer à la trésorerie:</span>
                                <span>+{(investmentToDelete.initialAmount).toLocaleString('fr-FR')} {currencySymbol}</span>
                            </div>
                            <p className="text-xs opacity-90">Ce montant sera rajouté au solde de la trésorerie.</p>
                        </div>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Confirmer la suppression
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
