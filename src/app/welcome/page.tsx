"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PartyPopper, Play, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from '@/providers/auth-provider';
import { AppLogo } from '@/components/layout/app-logo';
import { useRouter } from 'next/navigation';
import { updateUserProfile } from '@/lib/firebase/database';
import { RegistrationProgress } from "@/components/auth/registration-progress";
import { useToast } from '@/hooks/use-toast';

export default function WelcomePage() {
    const { currentUser, refreshAuthContext, businessId } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleGetStarted = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            await updateUserProfile(currentUser.uid, {
                onboardingCompleted: true
            }, currentUser.uid, businessId || '');

            await refreshAuthContext();

            toast({
                title: "C'est parti !",
                description: "Bienvenue sur votre tableau de bord.",
            });

            router.push('/overview');
        } catch (error) {
            console.error("Failed to complete onboarding:", error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in duration-700">
                <RegistrationProgress currentStep={5} />

                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        <div className="relative">
                            <AppLogo className="h-20 w-20" />
                            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg">
                                <PartyPopper className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                        Félicitations !
                    </h1>
                    <p className="text-xl text-muted-foreground font-medium">
                        Votre compte TTR Gestion est maintenant prêt.
                    </p>
                </div>

                <Card className="shadow-2xl border-primary/10 overflow-hidden">
                    <CardHeader className="bg-primary/5 pb-8 pt-8">
                        <CardTitle className="text-center flex flex-col items-center gap-2">
                            <span className="text-2xl">Bienvenue à bord</span>
                            <span className="text-sm font-normal text-muted-foreground">Apprenez les bases en moins de 2 minutes</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="aspect-video bg-black relative flex items-center justify-center group cursor-pointer">
                            {/* Vidéo Placeholder */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                            <img
                                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426"
                                alt="Video thumbnail"
                                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
                            />

                            <div className="relative z-20 flex flex-col items-center gap-4">
                                <div className="h-20 w-20 bg-primary rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                                    <Play className="h-10 w-10 text-primary-foreground fill-current ml-1" />
                                </div>
                                <span className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-bold border border-white/20">
                                    Regarder la vidéo de présentation
                                </span>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">Gestion du Stock</h4>
                                        <p className="text-xs text-muted-foreground">Ajoutez vos premiers produits.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <CheckCircle className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">Ventes Rapides</h4>
                                        <p className="text-xs text-muted-foreground">Enregistrez vos premières transactions.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/10 p-6 flex flex-col gap-4">
                        <Button
                            className="w-full h-14 text-lg font-bold rounded-xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                            onClick={handleGetStarted}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            ) : (
                                <>
                                    Accéder à mon tableau de bord
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            Vous pourrez revoir cette vidéo à tout moment dans la section Aide.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
