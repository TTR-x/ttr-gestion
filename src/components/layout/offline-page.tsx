"use client";

import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Home, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

export function OfflinePage() {
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = () => {
        setIsRetrying(true);
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-500">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <Card className="relative w-full max-w-lg mx-4 border-none shadow-2xl bg-card/50 backdrop-blur-md overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-destructive via-orange-500 to-destructive animate-pulse" />

                <CardContent className="pt-12 pb-10 px-6 flex flex-col items-center text-center">
                    <div className="relative w-48 h-48 mb-8 group">
                        <div className="absolute inset-0 bg-destructive/20 rounded-full scale-110 blur-2xl group-hover:bg-destructive/30 transition-colors duration-500" />
                        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner bg-muted/50 flex items-center justify-center border border-white/10">
                            <Image
                                src="/offline.gif"
                                alt="Hors ligne"
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                    </div>

                    <div className="space-y-3 mb-8">
                        <div className="flex items-center justify-center gap-2 text-destructive mb-2 px-3 py-1 bg-destructive/10 rounded-full w-fit mx-auto">
                            <WifiOff className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Erreur de Connexion</span>
                        </div>
                        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">
                            Oups ! Le réseau vous a lâché
                        </h1>
                        <p className="text-muted-foreground text-pretty max-w-sm mx-auto">
                            Nous ne parvenons pas à joindre les serveurs de TTR Gestion. Vérifiez votre Wi-Fi ou vos données mobiles.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                        <Button
                            onClick={handleRetry}
                            disabled={isRetrying}
                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 h-11"
                        >
                            {isRetrying ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Réessayer
                        </Button>
                        <Button
                            variant="outline"
                            asChild
                            className="flex-1 border-white/10 hover:bg-white/5 h-11"
                        >
                            <a href="https://wa.me/+22899974389" target="_blank" rel="noopener noreferrer">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Support
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
