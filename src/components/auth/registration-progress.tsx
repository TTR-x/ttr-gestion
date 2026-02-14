"use client";

import React from 'react';

interface RegistrationProgressProps {
    currentStep: number; // 1 to 5
}

const steps = [
    "Création de compte",
    "Configuration",
    "Validation email",
    "WhatsApp",
    "Bienvenue"
];

export function RegistrationProgress({ currentStep }: RegistrationProgressProps) {
    return (
        <div className="w-full px-4 mb-8">
            <div className="flex gap-2 max-w-md mx-auto">
                {[1, 2, 3, 4, 5].map((step) => {
                    const isActive = step <= currentStep;
                    const isCurrent = step === currentStep;

                    return (
                        <div key={step} className="flex-1 space-y-2">
                            <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${isActive
                                    ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                                    : 'bg-muted/30'
                                    } ${isCurrent ? 'animate-pulse' : ''}`}
                            />
                            <span className={`text-[10px] font-bold uppercase tracking-wider block text-center transition-colors duration-500 ${isCurrent ? 'text-green-500' : 'text-muted-foreground/50'
                                }`}>
                                {isCurrent ? `Étape ${step}` : ''}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
