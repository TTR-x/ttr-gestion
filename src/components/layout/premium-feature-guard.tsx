"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Sparkles, TrendingUp, ShieldCheck, Zap, ArrowRight, Play, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { updateBusinessProfile } from '@/lib/firebase/database';

interface PremiumFeatureGuardProps {
    children: React.ReactNode;
    pathname: string;
}

const PREMIUM_FEATURES_MAP: Record<string, { title: string; description: string; features: string[]; icon: any }> = {
    '/financial-health': {
        title: 'Santé Financière',
        description: 'Une vision claire et analytique de votre rentabilité réelle.',
        icon: TrendingUp,
        features: [
            'Graphiques de rentabilité mensuelle',
            'Analyse des marges par produit/service',
            'Indicateurs de performance (KPI)',
            'Prévisions de trésorerie'
        ]
    },
    '/investments': {
        title: 'Gestion des Investissements',
        description: 'Optimisez la croissance de votre entreprise avec des outils d\'analyse avancés.',
        icon: Sparkles,
        features: [
            'Suivi complet des projets d\'investissement',
            'Calcul automatique du ROI',
            'Analyse des risques et opportunités',
            'Rapports de performance détaillés'
        ]
    },
    'administration': {
        title: 'Administration Avancée',
        description: 'Prenez le plein contrôle de votre structure et de votre équipe.',
        icon: ShieldCheck,
        features: [
            'Gestion multi-utilisateurs et rôles',
            'Historique complet des actions (Audit log)',
            'Paramètres de personnalisation avancés',
            'Gestion centralisée des espaces de travail'
        ]
    }
};

export function PremiumFeatureGuard({ children, pathname }: PremiumFeatureGuardProps) {
    const { businessProfile, businessId, currentUser, isSuperAdmin, refreshAuthContext } = useAuth();
    const [isTrialing, setIsTrialing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Identify if current path is a premium feature
    let featureKey = '';
    if (pathname === '/financial-health') featureKey = '/financial-health';
    else if (pathname === '/investments') featureKey = '/investments';
    else if (pathname.startsWith('/admin') && !pathname.includes('subscription') && !pathname.includes('number-validation')) featureKey = 'administration';

    const feature = featureKey ? PREMIUM_FEATURES_MAP[featureKey] : null;
    const isFreePlan = !businessProfile?.subscriptionType || businessProfile?.subscriptionType === 'gratuit';

    const isBlocked = feature && isFreePlan && !isSuperAdmin && !isTrialing;

    const testsUsed = businessProfile?.premiumTestsUsed || 0;
    const testsRemaining = Math.max(0, 35 - testsUsed);
    const hasTestsLeft = testsRemaining > 0;

    const handleStartTrial = async () => {
        if (!currentUser || !businessId || !hasTestsLeft) return;

        setIsLoading(true);
        try {
            await updateBusinessProfile(businessId, {
                premiumTestsUsed: testsUsed + 1
            }, currentUser.uid);

            setIsTrialing(true);
        } catch (error) {
            console.error("Failed to start premium trial:", error);
        } finally {
            setIsLoading(false);
        }
    };


    if (!isBlocked) {
        return <>{children}</>;
    }

    const Icon = feature.icon;

    return (
        <div className="flex flex-col items-center justify-center p-4 min-h-[70vh] animate-in fade-in duration-500">
            <Card className="max-w-xl w-full border-none shadow-2xl bg-background/95 backdrop-blur-sm overflow-hidden ring-1 ring-border">
                {/* Header with gradient line like device block */}
                <div className="h-1.5 w-full bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400" />

                <CardHeader className="text-center pb-2 pt-8">
                    <div className="mx-auto bg-yellow-400 text-black p-4 rounded-2xl w-fit mb-6 shadow-xl shadow-yellow-400/20">
                        <Icon className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-3xl font-extrabold tracking-tight">
                        {feature.title}
                    </CardTitle>
                    <CardDescription className="text-base font-medium text-muted-foreground mt-2 px-4">
                        {feature.description}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 px-8">
                    {/* Motivational Section */}
                    <div className="bg-muted/50 rounded-2xl p-6 border border-border/50">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-yellow-600 mb-4 flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 fill-current" />
                            Inclus dans le module Premium :
                        </h4>
                        <ul className="grid grid-cols-1 gap-3">
                            {feature.features.map((f, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm font-medium">
                                    <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                        <Check className="h-3.5 w-3.5 text-green-600" />
                                    </div>
                                    <span>{f}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Trial Counter UI */}
                    <div className="flex flex-col items-center gap-3 py-4 bg-yellow-400/5 rounded-2xl border border-yellow-400/10">
                        <div className="flex items-center gap-2 text-sm font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-tight">
                            <Laptop className="h-4 w-4" />
                            {testsRemaining} essais gratuits restants
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Chaque déblocage consomme 1 essai sur vos 35 offerts.
                        </p>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 p-8 pt-4">
                    {hasTestsLeft ? (
                        <Button
                            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold h-14 text-base rounded-2xl shadow-lg shadow-yellow-400/10 transition-transform active:scale-95"
                            onClick={handleStartTrial}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                "Déblocage en cours..."
                            ) : (
                                <>
                                    <Play className="mr-2 h-5 w-5 fill-current" />
                                    Débloquer maintenant
                                </>
                            )}
                        </Button>
                    ) : (
                        <div className="w-full p-4 bg-red-500/10 text-red-600 rounded-2xl text-sm font-bold text-center border border-red-500/20">
                            Limite d'essais atteinte
                        </div>
                    )}

                    <Button variant="ghost" className="w-full text-sm font-semibold text-muted-foreground hover:bg-transparent hover:text-yellow-600" asChild>
                        <Link href="/admin/standard-subscription" className="flex items-center gap-2">
                            Passer au plan Premium <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
