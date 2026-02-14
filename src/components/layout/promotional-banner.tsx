
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { getPromotions } from '@/lib/firebase/database';
import type { Promotion } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Pause, Play } from 'lucide-react';
import type { CarouselApi } from "@/components/ui/carousel";

export function PromotionalBanner() {
    const { currentUser, isSuperAdmin } = useAuth();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [api, setApi] = useState<CarouselApi>();
    const [isPlaying, setIsPlaying] = useState(true);
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

    const autoplayPlugin = useRef(Autoplay({
        delay: 5000,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
    }));

    const fetchPromotions = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPromotions();
            setPromotions(data || []);
        } catch (error) {
            console.error("Failed to fetch promotions:", error);
            setPromotions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchPromotions();
        }
    }, [currentUser, fetchPromotions]);

    useEffect(() => {
        if (!api) return;

        const onAutoplayPlay = () => setIsPlaying(true);
        const onAutoplayStop = () => setIsPlaying(false);

        api.on("autoplay:play", onAutoplayPlay);
        api.on("autoplay:stop", onAutoplayStop);

        return () => {
            api.off("autoplay:play", onAutoplayPlay);
            api.off("autoplay:stop", onAutoplayStop);
        };
    }, [api]);

    const togglePlay = useCallback(() => {
        const autoplay = api?.plugins()?.autoplay;
        if (!autoplay) return;

        if (autoplay.isPlaying()) {
            autoplay.stop();
        } else {
            autoplay.play();
        }
    }, [api]);

    if (loading) {
        return (
            <div className="pt-4">
                <Skeleton className="h-[80px] md:h-[150px] lg:h-[200px] w-full rounded-none" />
            </div>
        )
    }

    if (promotions.length === 0 && !isSuperAdmin) {
        return null;
    }

    return (
        <div className="pt-4">
            {(promotions.length > 0 || isSuperAdmin) && (
                <Carousel
                    setApi={setApi}
                    plugins={[autoplayPlugin.current]}
                    opts={{ loop: true }}
                    className="w-full group"
                >
                    <CarouselContent>
                        {promotions.length > 0 ? (
                            promotions.map((promo) => (
                                <CarouselItem key={promo.id}>
                                    <Link href={promo.linkUrl} target="_blank" rel="noopener noreferrer">
                                        <Card className="overflow-hidden border-none shadow-md bg-muted/20 w-full rounded-none">
                                            <CardContent className="p-0 flex aspect-[1200/250] items-center justify-center relative w-full overflow-hidden bg-gradient-to-r from-primary/5 to-primary/10 rounded-none">
                                                {!imageErrors[promo.id] ? (
                                                    <Image
                                                        src={promo.imageUrl}
                                                        alt="Promotion"
                                                        fill
                                                        style={{ objectFit: 'contain' }}
                                                        className="cursor-pointer transition-transform duration-700 group-hover:scale-105"
                                                        priority
                                                        onError={() => setImageErrors(prev => ({ ...prev, [promo.id]: true }))}
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center p-6 text-center">
                                                        <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-2" />
                                                        <p className="text-sm font-medium text-muted-foreground">Promotion</p>
                                                        <p className="text-xs text-muted-foreground/70">Cliquez pour voir les détails</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Link>
                                </CarouselItem>
                            ))
                        ) : (
                            <CarouselItem>
                                <div className="flex aspect-[1200/250] items-center justify-center rounded-none border-2 border-dashed text-center p-6 bg-muted/30">
                                    <div className="space-y-2">
                                        <p className="font-semibold text-primary">Le carrousel promotionnel est vide.</p>
                                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                            En tant que super-administrateur, vous pouvez ajouter des bannières depuis les outils d'administration.
                                        </p>
                                    </div>
                                </div>
                            </CarouselItem>
                        )}
                    </CarouselContent>
                    {promotions.length > 1 && (
                        <>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                <Button size="icon" variant="secondary" className="rounded-full h-8 w-8 shadow-lg backdrop-blur-sm bg-white/80" onClick={togglePlay}>
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    <span className="sr-only">{isPlaying ? 'Mettre en pause' : 'Lire'}</span>
                                </Button>
                            </div>
                            <CarouselPrevious className="left-4 h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg backdrop-blur-sm bg-white/80 border-none" />
                            <CarouselNext className="right-4 h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg backdrop-blur-sm bg-white/80 border-none" />
                        </>
                    )}
                </Carousel>
            )}
        </div>
    );
}
