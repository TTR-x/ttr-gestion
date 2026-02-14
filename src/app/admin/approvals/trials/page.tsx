
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useLoading } from '@/providers/loading-provider';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { processNumberValidationRequest, getNumberValidationRequests } from '@/lib/firebase/database';
import type { NumberValidationRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, RefreshCw, AlertCircle, Copy, Building, Phone, History, UserCheck, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow, isWithinInterval, subHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
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
} from "@/components/ui/alert-dialog"

export default function NumberValidationApprovalPage() {
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const { showLoader, hideLoader, isLoading } = useLoading();
    const router = useRouter();
    const { toast } = useToast();

    const [requests, setRequests] = useState<NumberValidationRequest[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const fetchRequests = useCallback(async () => {
        setLoadingData(true);
        try {
            const pendingRequests = await getNumberValidationRequests('pending');
            setRequests(pendingRequests);
        } catch (error) {
            console.error("Firebase error:", error);
            toast({ variant: 'destructive', title: "Erreur de chargement", description: (error as Error).message });
        } finally {
            setLoadingData(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            toast({ variant: 'destructive', title: 'Accès Interdit' });
            router.replace('/overview');
            return;
        } 
        
        if (!authLoading && isSuperAdmin) {
            fetchRequests();
        }
    }, [authLoading, isSuperAdmin, router, toast, fetchRequests]);

    const handleProcessRequest = async (requestId: string, businessId: string, action: 'approve' | 'reject') => {
        showLoader();
        try {
            await processNumberValidationRequest(requestId, businessId, action);
            toast({ title: "Action réussie", description: `La demande a été ${action === 'approve' ? 'approuvée' : 'rejetée'}.` });
            fetchRequests(); // Refresh the list
        } catch(error: any) {
            toast({ variant: 'destructive', title: "Erreur", description: error.message });
        } finally {
            hideLoader();
        }
    };
    
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: `${label} copié !` });
    };

    if (authLoading || !isSuperAdmin) {
        return <Skeleton className="h-96 w-full" />;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                 <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/approvals" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-3xl font-headline font-semibold tracking-tight flex items-center gap-2">
                    <UserCheck className="h-8 w-8 text-primary" />
                    Validation de Numéro WhatsApp
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Demandes en Attente</CardTitle>
                    <CardDescription>Validez ou rejetez les numéros WhatsApp soumis par les nouveaux administrateurs.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingData && requests.length === 0 ? <Skeleton className="h-48 w-full" /> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Entreprise</TableHead>
                                    <TableHead>Numéro Soumis</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.length > 0 ? (
                                    requests.map(req => {
                                        const isNew = isWithinInterval(new Date(req.createdAt), { start: subHours(new Date(), 24), end: new Date() });
                                        return (
                                            <TableRow key={req.id}>
                                                <TableCell>
                                                    <div className="font-medium">{req.businessName}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1 group" title="ID de l'entreprise">
                                                        <Building className="h-3 w-3" />
                                                        <span className="truncate">{req.businessId}</span>
                                                        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(req.businessId, "ID Entreprise")}>
                                                            <Copy className="h-3 w-3"/>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium flex items-center gap-2 group">
                                                        <Phone className="h-4 w-4 text-muted-foreground"/> 
                                                        <span className="font-mono">{req.phoneNumber}</span>
                                                         <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(req.phoneNumber, "Numéro")}>
                                                            <Copy className="h-3 w-3"/>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: fr })}
                                                    {isNew && <Badge variant="destructive" className="ml-2">Nouveau</Badge>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={isLoading}><Check className="h-4 w-4" /> <span className="sr-only sm:not-sr-only sm:ml-2">Approuver</span></Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Confirmer l'approbation ?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Cette action validera le numéro WhatsApp pour {req.businessName}.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleProcessRequest(req.id, req.businessId, 'approve')}>Confirmer</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                         <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button size="sm" variant="destructive" disabled={isLoading}><X className="h-4 w-4" /> <span className="sr-only sm:not-sr-only sm:ml-2">Rejeter</span></Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Confirmer le rejet ?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Cette action marquera le numéro comme rejeté et forcera l'utilisateur à en soumettre un nouveau.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleProcessRequest(req.id, req.businessId, 'reject')}>Confirmer</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                                            Aucune demande de validation de numéro en attente.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

