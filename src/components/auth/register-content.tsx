"use client";

import React, { useState } from 'react';
import { RegisterForm } from "@/components/auth/register-form";
import { FeatureCarousel } from "@/components/auth/feature-carousel";
import { Button } from "@/components/ui/button";

export function RegisterContent() {
    const [showMobileForm, setShowMobileForm] = useState(false);

    return (
        <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-[45%_55%] bg-background overflow-x-hidden">
            {/* Colonne Gauche (Carousel) - Visible par défaut sur mobile, toujours visible sur desktop */}
            <div className={`relative h-screen overflow-hidden ${showMobileForm ? 'hidden lg:flex' : 'flex'}`}>
                <div className="absolute inset-0 w-full h-full">
                    <FeatureCarousel />
                </div>

                {/* Bouton pour passer au formulaire sur Mobile uniquement */}
                <div className="lg:hidden absolute bottom-8 left-0 right-0 p-6 flex flex-col items-center z-30">
                    <Button
                        size="lg"
                        className="w-full max-w-xs text-lg font-bold shadow-2xl rounded-full h-14 bg-primary text-primary-foreground animate-pulse"
                        onClick={() => setShowMobileForm(true)}
                    >
                        S'inscrire Maintenant
                    </Button>
                </div>
            </div>

            {/* Colonne Droite (Formulaire) - Cachée par défaut sur mobile, visible quand demandé ou sur desktop */}
            <div className={`flex flex-col min-h-screen lg:h-screen lg:overflow-y-auto bg-card transition-all duration-500 ease-in-out ${showMobileForm ? 'flex' : 'hidden lg:flex'}`}>

                {/* Bouton retour sur mobile */}
                {showMobileForm && (
                    <div className="lg:hidden sticky top-0 bg-card/95 backdrop-blur-xl z-50 py-4 px-6 border-b border-border/50">
                        <Button
                            variant="ghost"
                            className="gap-2 -ml-2 hover:bg-transparent"
                            onClick={() => setShowMobileForm(false)}
                        >
                            <span className="text-xl">←</span>
                            <span className="font-medium">Retour à la présentation</span>
                        </Button>
                    </div>
                )}

                <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16">
                    <div className="w-full max-w-lg mx-auto py-10 lg:py-0">
                        <RegisterForm />
                    </div>
                </div>
            </div>
        </div>
    );
}
