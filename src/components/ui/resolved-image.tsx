"use client";

import { useEffect, useState } from 'react';
import NextImage, { ImageProps } from 'next/image';
import { localImageService } from '@/lib/local-image-service';

interface ResolvedImageProps extends Omit<ImageProps, 'src'> {
    src: string;
}

/**
 * Image component that handles both local:// URLs and regular URLs
 * Automatically resolves local:// URLs to blob URLs for display
 */
export function ResolvedImage({ src, alt, ...props }: ResolvedImageProps) {
    const isLocal = src.startsWith('local://');
    const [resolvedSrc, setResolvedSrc] = useState<string | null>(isLocal ? null : src);
    const [isLoading, setIsLoading] = useState(isLocal);
    const [error, setError] = useState(false);



    useEffect(() => {
        async function resolveSrc() {
            if (!src) {
                setIsLoading(false);
                return;
            }

            try {
                const resolved = await localImageService.resolveImageUrl(src);
                if (resolved) {
                    setResolvedSrc(resolved);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error('Failed to resolve image:', err);
                setError(true);
            } finally {
                setIsLoading(false);
            }
        }

        resolveSrc();
    }, [src]);

    const isFill = props.fill;

    const FallbackDiv = ({ children, className }: { children?: React.ReactNode, className?: string }) => {
        const style = isFill
            ? { position: 'absolute' as const, top: 0, left: 0, bottom: 0, right: 0, width: '100%', height: '100%' }
            : { width: props.width, height: props.height };

        return (
            <div
                className={`${className || ''} ${isFill ? 'absolute inset-0 w-full h-full' : ''}`}
                style={style}
            >
                {children}
            </div>
        );
    };

    if (isLoading) {
        return <FallbackDiv className="animate-pulse bg-muted rounded-md" />;
    }

    if (error || !resolvedSrc) {
        return (
            <FallbackDiv className="flex items-center justify-center bg-muted rounded-md text-muted-foreground text-xs p-1 text-center">
                Image non disponible
            </FallbackDiv>
        );
    }

    // Safety check: local:// URLs should never be passed to NextImage directly
    // This handles the edge case where isLoading is false but resolvedSrc hasn't updated yet
    if (resolvedSrc.startsWith('local://')) {
        return <FallbackDiv className="animate-pulse bg-muted rounded-md" />;
    }

    // For blob URLs, we need to use unoptimized
    const isBlob = resolvedSrc.startsWith('blob:');

    return (
        <NextImage
            {...props}
            src={resolvedSrc}
            alt={alt}
            unoptimized={isBlob}
        />
    );
}
