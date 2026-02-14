
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Package, Wallet, ClipboardList, Sparkles, Briefcase, CalendarCheck, CheckCircle, AlertTriangle, Store } from "lucide-react";
import { useAuth } from '@/providers/auth-provider';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { AppLogo } from '@/components/layout/app-logo';
import type { SubscriptionRequest } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { onValue, ref } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import { getLastSubscriptionRequest } from '@/lib/firebase/database';
import { useToast } from '@/hooks/use-toast';


const features = [
    {
        icon: Store,
        title: "ORIFAKE Market Bientôt !",
        description: "Vendez vos produits en ligne, attirez des clients à proximité et boostez vos ventes. Gratuit pour tous les utilisateurs.",
        gradient: "from-green-700 to-green-900",
        iconColor: "text-green-300",
        borderColor: "border-green-400/20 hover:border-green-400/50",
    },
    {
        icon: ClipboardList,
        title: "Gestion des Prestations",
        description: "Suivez vos réservations, commandes ou ventes avec une vue claire et un statut précis pour chaque transaction.",
        gradient: "from-blue-700 to-blue-900",
        iconColor: "text-blue-300",
        borderColor: "border-blue-400/20 hover:border-blue-400/50",
    },
    {
        icon: Wallet,
        title: "Trésorerie Simplifiée",
        description: "Enregistrez vos dépenses et revenus en un clin d'œil pour toujours savoir où en sont vos finances.",
        gradient: "from-orange-600 to-orange-800",
        iconColor: "text-orange-300",
        borderColor: "border-orange-400/20 hover:border-orange-400/50",
    },
    {
        icon: Package,
        title: "Inventaire Intelligent",
        description: "Gardez un œil sur votre stock, soyez alerté avant les ruptures et vendez vos produits rapidement.",
        gradient: "from-purple-700 to-purple-900",
        iconColor: "text-purple-300",
        borderColor: "border-purple-400/20 hover:border-purple-400/50",
    },
];

export default function PendingVerificationPage() {
    const { currentUser, businessProfile, showLoader, refreshAuthContext } = useAuth();
    const [requestStatus, setRequestStatus] = useState<'loading' | 'pending' | 'approved' | 'rejected' | 'not_found'>('loading');
    const [hasRefreshedOnApproval, setHasRefreshedOnApproval] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const fetchAndListen = useCallback(async () => {
        if (!currentUser) return;
        
        const lastRequest = await getLastSubscriptionRequest(currentUser.uid);

        if (!lastRequest) {
            setRequestStatus('not_found');
            // If no request is found, it means it's been processed and maybe deleted,
            // or the user landed here by mistake. The AuthProvider should redirect anyway.
            return;
        }

        setRequestStatus(lastRequest.status);

        if (lastRequest.status === 'pending') {
            const requestRef = ref(database, `subscriptionRequests/${lastRequest.id}/status`);
            const unsubscribe = onValue(requestRef, (snapshot) => {
                if (snapshot.exists()) {
                    const newStatus = snapshot.val();
                    setRequestStatus(newStatus);
                } else {
                    // If the node is deleted, it means it was likely approved and cleaned up.
                    setRequestStatus('approved');
                }
            });
            return unsubscribe;
        }
    }, [currentUser]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        fetchAndListen().then(unsub => {
            if (unsub) unsubscribe = unsub;
        });
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [fetchAndListen]);


    // This effect handles the context refresh and redirection once the status is 'approved'
    useEffect(() => {
        if (requestStatus === 'approved' && !hasRefreshedOnApproval) {
            setHasRefreshedOnApproval(true);
            const handleApproval = async () => {
                toast({ title: "Abonnement activé !", description: "Vous allez être redirigé vers votre tableau de bord." });
                await refreshAuthContext();
                // Wait a bit for the UI to show the success message then redirect
                setTimeout(() => {
                    router.push('/overview');
                }, 1500); 
            };
            handleApproval();
        }
    }, [requestStatus, hasRefreshedOnApproval, refreshAuthContext, router, toast]);

    const createWhatsAppLink = () => {
        const phoneNumber = "+22899974389";
        const message = `Bonjour, je viens de soumettre mon paiement pour l'entreprise "${businessProfile?.name || 'inconnue'}" et j'attends la validation.`;
        return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    };

    const handleRetryPayment = () => {
        showLoader();
        router.push('/admin/standard-subscription');
    };

    if (requestStatus === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Chargement du statut de votre demande...</p>
            </div>
        );
    }
    
    if (requestStatus === 'not_found') {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 text-center">
                <h1 className="text-2xl font-bold">Aucune demande en attente trouvée.</h1>
                <p>Il est possible que votre demande ait déjà été traitée.</p>
                <Button onClick={() => router.push('/overview')}>Retour au tableau de bord</Button>
            </div>
        );
    }

    if (requestStatus === 'approved') {
        return (
             <div className="space-y-8 animate-in fade-in duration-500">
                <div className="text-center">
                    <div className="flex justify-center mb-4"><AppLogo className="h-16 w-16" /></div>
                    <h1 className="text-3xl font-headline font-bold tracking-tight">Félicitations et bienvenue !</h1>
                </div>
                <Card className="max-w-xl mx-auto text-center border-green-500/50 bg-card/80">
                    <CardHeader>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-4">
                            <CheckCircle className="h-10 w-10 text-green-500" />
                        </div>
                        <CardTitle>Votre compte est activé !</CardTitle>
                        <CardDescription>
                            Vous avez maintenant accès à toutes les fonctionnalités de votre forfait.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <p>Redirection en cours...</p>
                       <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mt-2" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (requestStatus === 'rejected') {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="text-center">
                    <div className="flex justify-center mb-4"><AppLogo className="h-16 w-16" /></div>
                    <h1 className="text-3xl font-headline font-bold tracking-tight">Action requise</h1>
                </div>
                <Card className="max-w-xl mx-auto text-center border-destructive/50 bg-card/80">
                    <CardHeader>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                        </div>
                        <CardTitle className="text-destructive">Abonnement rejeté</CardTitle>
                        <CardDescription>
                            Il semble y avoir eu un problème avec votre paiement. Votre demande d'abonnement a été rejetée.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Veuillez vérifier les informations de votre transaction et réessayez, ou contactez-nous pour obtenir de l'aide.</p>
                    </CardContent>
                    <CardFooter className="justify-center gap-4">
                         <Button variant="outline" onClick={handleRetryPayment}>
                            Recommencer le paiement
                        </Button>
                        <Button asChild>
                            <a href={createWhatsAppLink()} target="_blank" rel="noopener noreferrer">
                                <MessageSquare className="mr-2 h-4 w-4" /> Contacter le support
                            </a>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }


    // Default 'pending' state
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
                 <div className="flex justify-center mb-4">
                    <AppLogo className="h-16 w-16" />
                </div>
                <h1 className="text-3xl font-headline font-bold tracking-tight">Merci de votre confiance !</h1>
            </div>

            <Card className="max-w-xl mx-auto text-center border-primary/20 bg-card/80">
                <CardHeader>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    </div>
                    <CardTitle>Demande Prise en Compte !</CardTitle>
                    <CardDescription>
                        Votre preuve de paiement a bien été reçue. Nous allons maintenant effectuer les vérifications nécessaires pour confirmer votre abonnement. Cette page se mettra à jour automatiquement une fois la validation terminée.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex-col gap-4">
                    <p className="text-xs text-muted-foreground">
                        Un souci ? <a href={createWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="text-primary underline">Contactez-nous directement</a>.
                    </p>
                </CardFooter>
            </Card>

             <div className="pt-8 text-center">
                <h2 className="text-2xl font-semibold mb-2">En attendant, découvrez ce qui vous attend...</h2>
                <p className="text-muted-foreground mb-6">Préparez-vous à transformer votre gestion quotidienne.</p>
                <Carousel
                    plugins={[Autoplay({ delay: 3000, stopOnInteraction: false })]}
                    opts={{ align: "start", loop: true }}
                    className="w-full"
                >
                    <CarouselContent>
                        {features.map((feature, index) => {
                            const FeatureIcon = feature.icon;
                            return (
                                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                                    <div className="p-1 h-full">
                                        <Card className={cn(
                                            "flex flex-col items-center justify-center text-center p-6 h-full backdrop-blur-sm transition-colors bg-gradient-to-br",
                                            feature.gradient,
                                            feature.borderColor
                                        )}>
                                            <FeatureIcon className={cn("h-12 w-12 mb-4", feature.iconColor)} />
                                            <h3 className="text-lg font-bold text-white/90">{feature.title}</h3>
                                            <p className="text-sm text-white/70 mt-2">{feature.description}</p>
                                        </Card>
                                    </div>
                                </CarouselItem>
                            )
                        })}
                    </CarouselContent>
                </Carousel>
            </div>
        </div>
    );
}
