"use client";

import React, { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, ShieldCheck, Zap, Users, HardDrive, Smartphone, Store, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function SubscriptionPage() {
    const { businessProfile, currentUser, loading, showLoader } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const currentPlan = businessProfile?.subscriptionType || 'gratuit';

    // State for billing cycle toggle if we want to add monthly/yearly later. 
    // For now user gave specific yearly prices so we stick to that.

    const plans = [
        {
            id: 'gratuit',
            name: 'Gratuit',
            price: 'Gratuit',
            description: 'Pour découvrir TTR Gestion',
            features: [
                { name: '100 Mo de stockage', allowed: true },
                { name: 'IA très limitée', allowed: true },
                { name: '1 Appareil connecté', allowed: true },
                { name: '1 Espace de travail', allowed: true },
                { name: 'Service client standard', allowed: true },
                { name: 'Accès My PME Zone', allowed: true },
                { name: '0 Employé', allowed: true, info: "Solo uniquement" },
                { name: 'Personnalisation avancée', allowed: false },
                { name: 'Rapports financiers', allowed: false },
            ],
            highlight: false,
            color: 'bg-slate-100 dark:bg-slate-800'
        },
        {
            id: 'particulier',
            name: 'Particulier',
            price: '1 500 FCFA',
            period: '/an',
            description: 'Pour les indépendants actifs',
            features: [
                { name: '1 Go de stockage', allowed: true },
                { name: 'IA Standard', allowed: true },
                { name: '3 Appareils connectés', allowed: true },
                { name: '2 Espaces de travail', allowed: true },
                { name: 'Service client standard', allowed: true },
                { name: 'Accès My PME Zone', allowed: true },
                { name: '2 Employés', allowed: true },
                { name: 'Personnalisation avancée', allowed: true },
                { name: 'Rapports financiers', allowed: true },
            ],
            highlight: true,
            color: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
            badge: 'Populaire'
        },
        {
            id: 'entreprise',
            name: 'Entreprise',
            price: '4 800 FCFA',
            period: '/an',
            description: 'Pour les structures en croissance',
            features: [
                { name: '5 Go de stockage', allowed: true },
                { name: 'IA Avancée', allowed: true },
                { name: '10 Appareils connectés', allowed: true },
                { name: '15 Espaces de travail', allowed: true },
                { name: 'Service client normal', allowed: true },
                { name: 'Accès My PME Zone', allowed: true },
                { name: '20 Employés', allowed: true },
                { name: 'Personnalisation avancée', allowed: true },
                { name: 'Rapports financiers', allowed: true },
            ],
            highlight: false,
            color: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
        },
        {
            id: 'élite',
            name: 'Élite',
            price: '97 000 FCFA',
            period: '/an',
            description: 'La puissance illimitée',
            features: [
                { name: 'Stockage Illimité', allowed: true },
                { name: 'IA Illimitée', allowed: true },
                { name: 'Appareils Illimités', allowed: true },
                { name: 'Espaces Illimités', allowed: true },
                { name: 'Service Prioritaire', allowed: true },
                { name: 'Accès My PME Zone', allowed: true },
                { name: 'Employés Illimités', allowed: true },
                { name: 'Tout Illimité', allowed: true },
            ],
            highlight: false,
            color: 'bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-300 dark:from-amber-900/40 dark:to-yellow-900/40 dark:border-amber-700'
        }
    ];

    const handleSubscribe = async (planId: string) => {
        if (planId === currentPlan) return;
        if (!currentUser || !businessProfile) return;

        const selectedPlan = plans.find(p => p.id === planId);
        const planName = selectedPlan?.name || planId;
        const businessName = businessProfile?.name || 'mon entreprise';
        const promoCode = businessProfile.appliedPromoCode || 'Aucun';

        try {
            // 1. Register pending request in background
            const { addSubscriptionRequest } = await import('@/lib/firebase/database');

            // Extract numeric price
            const amount = selectedPlan ? parseInt(selectedPlan.price.replace(/[^0-9]/g, '')) || 0 : 0;

            await addSubscriptionRequest({
                userId: currentUser.uid,
                userName: currentUser.displayName,
                userEmail: currentUser.email,
                businessId: currentUser.businessId,
                businessName: businessProfile.name,
                plan: planName,
                amount: amount,
                currency: businessProfile.currency || 'FCFA',
                durationMonths: 12, // Standard yearly plans
                userPhoneNumber: currentUser.phoneNumber || businessProfile.businessPhoneNumber || '',
                transactionId: `WHATSAPP_CLICK_${Date.now()}_${currentUser.uid.slice(0, 5)}`
            });

            console.log(`[Subscription] Intent logged: ${businessName} (${currentUser.businessId}) - Plan: ${planName}`);
        } catch (error) {
            console.error("Failed to register subscription intent:", error);
        }

        // 2. Redirect to WhatsApp with full identification info
        const message = `Bonjour TTR Gestion,\n\n` +
            `Je souhaite souscrire au forfait "${planName}".\n\n` +
            `🔹 Entreprise: ${businessName}\n` +
            `🔹 ID Entreprise: ${currentUser.businessId}\n` +
            `🔹 Utilisateur: ${currentUser.displayName}\n` +
            `🔹 Téléphone: ${currentUser.phoneNumber || businessProfile.businessPhoneNumber || 'N/A'}\n` +
            `🔹 Code Promo: ${promoCode}\n\n` +
            `Pouvez-vous m'envoyer les modalités de paiement ? Merci !`;

        const whatsappLink = `https://wa.me/+22899974389?text=${encodeURIComponent(message)}`;

        window.open(whatsappLink, '_blank');
    };

    if (loading) return <div className="p-8 text-center">Chargement des forfaits...</div>;

    return (
        <div className="space-y-8 pb-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                    Choisissez le plan adapté à votre activité
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Des solutions flexibles pour accompagner votre croissance, du démarrage à l'expansion internationale.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-8">
                {plans.map((plan) => (
                    <Card key={plan.id} className={cn("flex flex-col relative transition-all duration-200 hover:shadow-xl hover:-translate-y-1", plan.color, currentPlan === plan.id && "ring-2 ring-primary ring-offset-2")}>
                        {plan.badge && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <Badge variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    {plan.badge}
                                </Badge>
                            </div>
                        )}

                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>{plan.name}</span>
                                {plan.id === 'élite' && <ShieldCheck className="text-amber-500 h-6 w-6" />}
                            </CardTitle>
                            <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="mb-6">
                                <span className="text-3xl font-bold">{plan.price}</span>
                                {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                            </div>

                            <ul className="space-y-3 text-sm">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        {feature.allowed ? (
                                            <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                        ) : (
                                            <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                                        )}
                                        <span className={cn(!feature.allowed && "text-muted-foreground line-through")}>
                                            {feature.name}
                                            {feature.info && <span className="block text-xs text-muted-foreground no-underline">{feature.info}</span>}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                variant={currentPlan === plan.id ? "outline" : (plan.highlight ? "default" : "secondary")}
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={currentPlan === plan.id}
                            >
                                {currentPlan === plan.id ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" /> Plan Actuel
                                    </>
                                ) : (
                                    "Choisir ce plan"
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <div className="mt-12 text-center bg-muted/50 rounded-xl p-8">
                <h3 className="text-2xl font-bold mb-4">Besoin d'une solution sur mesure ?</h3>
                <p className="text-muted-foreground mb-6">
                    Pour les grandes organisations avec des besoins spécifiques, contactez notre équipe commerciale directement sur WhatsApp.
                </p>
                <Button variant="outline" asChild>
                    <a
                        href={`https://wa.me/+22899974389?text=${encodeURIComponent(
                            `Bonjour TTR Gestion,\n\n` +
                            `Je souhaite une solution sur mesure pour mon organisation.\n\n` +
                            `🔹 Entreprise: ${businessProfile?.name || 'N/A'}\n` +
                            `🔹 ID Entreprise: ${currentUser?.businessId || 'N/A'}\n` +
                            `🔹 Utilisateur: ${currentUser?.displayName || 'N/A'}\n\n` +
                            `Pouvez-vous me recontacter pour en discuter ?`
                        )}`}
                        target="_blank"
                    >
                        Contacter l'équipe commerciale
                    </a>
                </Button>
            </div>
        </div>
    );
}
