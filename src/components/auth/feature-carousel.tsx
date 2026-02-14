"use client";

import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';

const features = [
    {
        image: "/register-png/1.png",
        title: "Gestion Simplifiée",
    },
    {
        image: "/register-png/2.png",
        title: "Analyses Précises",
    },
    {
        image: "/register-png/3.png",
        title: "Multi-Plateforme",
    }
];

export function FeatureCarousel() {
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const [emblaRef, emblaApi] = useEmblaCarousel(
        {
            loop: true,
            duration: 50, // Ultra smooth
            skipSnaps: false,
        },
        [Autoplay({ delay: 6000, stopOnInteraction: false })]
    );

    const onSelect = React.useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    React.useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect);
    }, [emblaApi, onSelect]);

    return (
        <div className="relative h-full w-full bg-black overflow-hidden" ref={emblaRef}>
            <div className="flex h-full">
                {features.map((feature, index) => (
                    <div
                        key={index}
                        className="relative flex-[0_0_100%] min-w-0 h-full overflow-hidden"
                    >
                        <div className="absolute inset-0 w-full h-full">
                            <Image
                                src={feature.image}
                                alt={feature.title}
                                fill
                                className="object-cover object-center transition-transform duration-[15000ms] ease-linear scale-105"
                                priority={index === 0}
                                sizes="(max-width: 1024px) 100vw, 45vw"
                                quality={100}
                            />
                        </div>
                        {/* Subtle vignette to maintain consistency across different image aspect ratios */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />
                    </div>
                ))}
            </div>

            {/* Pagination dots dynamic */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-3 z-10 pointer-events-none">
                {features.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-700 ease-in-out ${i === selectedIndex
                                ? 'w-12 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                                : 'w-2 bg-white/30'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
