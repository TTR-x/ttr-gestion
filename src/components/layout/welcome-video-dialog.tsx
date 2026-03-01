"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper, Play, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from '@/providers/auth-provider';
import { AppLogo } from '@/components/layout/app-logo';
import { updateUserProfile } from '@/lib/firebase/database';
import { useToast } from '@/hooks/use-toast';

export function WelcomeVideoDialog() {
    const { currentUser, refreshAuthContext, businessId } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Show dialog if user hasn't completed onboarding and is an admin
        if (currentUser && currentUser.role === 'admin' && !currentUser.onboardingCompleted) {
            // Check how many times it was shown to this specific user
            const storageKey = `welcome_video_shown_count_${currentUser.uid}`;
            const shownCount = parseInt(localStorage.getItem(storageKey) || '0', 10);

            if (shownCount < 3) {
                setIsOpen(true);
                // Increment immediately when shown
                localStorage.setItem(storageKey, (shownCount + 1).toString());
            }
        }
    }, [currentUser?.uid, currentUser?.onboardingCompleted]);

    const handleClose = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            await updateUserProfile(currentUser.uid, {
                onboardingCompleted: true
            }, currentUser.uid, businessId || '');

            await refreshAuthContext();
            setIsOpen(false);

            toast({
                title: "C'est parti !",
                description: "Bienvenue sur votre tableau de bord.",
            });
        } catch (error) {
            console.error("Failed to complete onboarding:", error);
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open && !isLoading) {
                // We don't want them to just close it without marking as completed?
                // Or maybe we do? Let's allow closing it if they want.
                // handleClose(); 
                setIsOpen(open);
            }
        }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none rounded-3xl overflow-hidden shadow-2xl">
                <div className="bg-primary/5 p-8 text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="relative">
                            <AppLogo className="h-16 w-16" />
                            <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                                <PartyPopper className="h-4 w-4" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <DialogTitle className="text-3xl font-black tracking-tight text-foreground text-center">
                            Félicitations !
                        </DialogTitle>
                        <DialogDescription className="text-lg text-muted-foreground font-medium text-center mt-2">
                            Votre compte TTR Gestion est prêt.
                        </DialogDescription>
                    </div>
                </div>

                <div className="p-0">
                    <div className="aspect-video bg-black relative flex items-center justify-center group cursor-pointer">
                        {/* Vidéo Placeholder */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                        <img
                            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426"
                            alt="Video thumbnail"
                            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
                        />

                        <div className="relative z-20 flex flex-col items-center gap-4">
                            <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                                <Play className="h-8 w-8 text-primary-foreground fill-current ml-1" />
                            </div>
                            <span className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-bold border border-white/20">
                                Regarder la vidéo de présentation (2 min)
                            </span>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                </div>

                <DialogFooter className="p-6 bg-muted/5 sm:flex-col gap-3">
                    <Button
                        className="w-full h-12 text-base font-bold rounded-xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                            <>
                                Accéder à mon tableau de bord
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">
                        Vous pourrez revoir cette vidéo à tout moment dans la section Aide.
                    </p>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
