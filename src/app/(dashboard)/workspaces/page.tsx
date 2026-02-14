

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusCircle, CheckCircle, Briefcase, Loader2, ArrowRightLeft, Link2, Wallet } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Skeleton } from '@/components/ui/skeleton';
import { getAggregatedCashBalance } from '@/lib/firebase/database';
import { useLoading } from '@/providers/loading-provider';
import type { Workspace } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const subscriptionPlanNames: Record<string, string> = {
  gratuit: 'Gratuit',
  essentiel: 'Essentiel',
  croissance: 'Croissance',
  pro: 'Pro',
  avancé: 'Avancé',
  premium: 'Premium',
  entreprise: 'Entreprise',
  élite: 'Élite',
};

const planLimits: Record<string, number | 'Illimité'> = {
  gratuit: 1,
  essentiel: 1,
  croissance: 2,
  pro: 3,
  avancé: 5,
  premium: 10,
  entreprise: "Illimité",
  élite: "Illimité",
};

export default function WorkspacesPage() {
    const { currentUser, businessProfile, switchWorkspace, loading: authLoading, getCurrencySymbol, activeWorkspaceId, showLoader } = useAuth();
    const { isLoading } = useLoading();
    const [loadingDetails, setLoadingDetails] = useState(true);
    const [aggregatedBalance, setAggregatedBalance] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const { toast } = useToast();
    const currencySymbol = getCurrencySymbol();

    const workspaces = businessProfile?.workspaces ? Object.values(businessProfile.workspaces) : [];
    const activePlanName = businessProfile?.subscriptionType || 'gratuit';
    const activePlanLabel = subscriptionPlanNames[activePlanName] || 'Gratuit';
    const limit = planLimits[activePlanName] || 1;
    const workspaceCount = workspaces.length;
    
    useEffect(() => {
      if (!authLoading) {
        setLoadingDetails(false);
      }
    }, [authLoading]);

    const handleSwitch = async (id: string) => {
        showLoader();
        await switchWorkspace(id);
    };

    const handleAggregateBalance = async () => {
        if (!currentUser?.uid) return;
        setIsCalculating(true);
        try {
            const totalBalance = await getAggregatedCashBalance(currentUser.uid);
            setAggregatedBalance(totalBalance);
            toast({ title: "Calcul terminé", description: "Le total des caisses a été mis à jour."});
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erreur de calcul", description: error.message });
            setAggregatedBalance(null);
        } finally {
            setIsCalculating(false);
        }
    };

    const renderWorkspaceList = () => {
        if (loadingDetails) {
            return (
                <ul className="space-y-3">
                    <li className="p-4 border rounded-lg"><Skeleton className="h-10 w-full" /></li>
                    <li className="p-4 border rounded-lg"><Skeleton className="h-10 w-full" /></li>
                </ul>
            );
        }

        return (
            <ul className="space-y-3">
                {workspaces.length > 0 ? (
                    workspaces.map((workspace) => (
                        <li key={workspace.id} className="flex items-center justify-between p-4 border rounded-lg bg-secondary/30">
                            <div>
                                <p className="font-bold text-lg flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                                    {workspace.name || 'Chargement...'}
                                </p>
                                <p className="text-sm text-muted-foreground ml-7">{workspace.type}</p>
                            </div>
                            {workspace.id === activeWorkspaceId ? (
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-semibold">Actif</span>
                                </div>
                            ) : (
                                <Button size="sm" onClick={() => handleSwitch(workspace.id)} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
                                    <span className="ml-2">Changer</span>
                                </Button>
                            )}
                        </li>
                    ))
                ) : (
                    <li>
                        <p className="text-muted-foreground text-center py-4">Aucun espace de travail trouvé.</p>
                    </li>
                )}
            </ul>
        );
    };


    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/settings" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-3xl font-headline font-semibold tracking-tight">Mes Espaces de Travail</h1>
            </div>

            <Card className="shadow-lg bg-gradient-to-br from-primary/10 to-accent/10">
                <CardHeader className="flex-row justify-between items-center">
                    <div>
                        <CardTitle className="text-sm font-medium tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Total des Caisses
                        </CardTitle>
                        <CardDescription>Solde consolidé de tous vos espaces de travail.</CardDescription>
                    </div>
                    <Button onClick={handleAggregateBalance} disabled={isCalculating}>
                        {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Link2 className="mr-2 h-4 w-4"/>}
                        Lier tous les espaces
                    </Button>
                </CardHeader>
                <CardContent>
                    {aggregatedBalance !== null ? (
                        <p className="text-4xl font-bold tracking-tight">
                            {aggregatedBalance.toLocaleString('fr-FR')} {currencySymbol}
                        </p>
                    ) : (
                        <p className="text-lg text-muted-foreground italic">Cliquez sur "Lier" pour calculer le total.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Liste de vos espaces</CardTitle>
                    <CardDescription>Voici la liste de toutes les entreprises que vous gérez. Vous pouvez basculer entre elles ou en créer une nouvelle, dans la limite de votre forfait.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-3 mb-4 text-sm text-center bg-primary/10 text-primary-foreground rounded-lg">
                        Forfait actuel de l'espace actif : <span className="font-bold">{activePlanLabel}</span>. 
                        Vous avez <span className="font-bold">{workspaceCount}</span> sur <span className="font-bold">{limit}</span> espace(s) de travail autorisé(s).
                    </div>
                    {renderWorkspaceList()}
                </CardContent>
                <CardFooter>
                     <Button asChild disabled={isLoading || (typeof limit === 'number' && workspaceCount >= limit)}>
                        <Link href="/workspaces/new" onClick={showLoader}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Créer un nouvel espace de travail
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
