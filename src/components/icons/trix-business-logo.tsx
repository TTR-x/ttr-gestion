
"use client";

import React, { useId } from 'react';
import { cn } from "@/lib/utils";

interface TrixBusinessLogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
    animate?: boolean;
}

export const TrixBusinessLogo = ({ className, animate = false, ...props }: TrixBusinessLogoProps) => {
    const uniqueId = useId();
    const prefix = `trix-${uniqueId.replace(/:/g, "")}`;

    // Outer gradient definition
    // Based on the user's lengthy gradient stop list: Black -> Dark Blue -> Blue -> Cyan -> White
    // Simplified for performance while maintaining the look.
    const gradientId = `${prefix}-gradient`;

    // Inner layers configuration
    // Based on SVG: start 12.33, step ~12.67, 20 layers.
    // Using a loop to generate the moiré pattern.
    const layers = Array.from({ length: 20 }, (_, i) => {
        const offset = 12.336 + (i * 12.672);
        return {
            id: i,
            offset,
            clipId: `${prefix}-clip-${i}`,
            // Just a unique key for React
            key: `layer-${i}`
        };
    });

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 810 810"
            className={cn("w-full h-full", className)}
            {...props}
        >
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform="rotate(45)">
                    <stop offset="0%" stopColor="#000000" />
                    <stop offset="15%" stopColor="#000000" />
                    <stop offset="30%" stopColor="#001293" />
                    <stop offset="50%" stopColor="#0055dd" />
                    <stop offset="70%" stopColor="#00aaff" />
                    <stop offset="85%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>

                {/* Clip paths for inner layers */}
                {layers.map((layer) => (
                    <clipPath key={layer.clipId} id={layer.clipId}>
                        <rect
                            x={layer.offset}
                            y={layer.offset}
                            width="256.58"
                            height="256.58"
                        />
                    </clipPath>
                ))}

                {/* Outer shape clip - simplified */}
                <clipPath id={`${prefix}-outer-clip`}>
                    <path d="M 678.867188 143.484375 C 534.433594 -7.769531 294.734375 -13.300781 143.484375 131.132812 C -7.769531 275.5625 -13.300781 515.261719 131.132812 666.515625 C 275.5625 817.765625 515.261719 823.296875 666.515625 678.867188 C 817.765625 534.433594 823.296875 294.734375 678.867188 143.484375 Z" clipRule="nonzero" />
                </clipPath>
            </defs>

            {/* Outer Gradient Shape */}
            <g clipPath={`url(#${prefix}-outer-clip)`}>
                <path
                    transform="matrix(0.517957, 0.542421, -0.542421, 0.517957, 417.35, -130.38)"
                    d="M 504.9 0 C 226 0 0 226 0 504.9 C 0 783.7 226 1009.8 504.9 1009.8 C 783.7 1009.8 1009.8 783.7 1009.8 504.9 C 1009.8 226 783.7 0 504.9 0 Z"
                    fill="none"
                    stroke={`url(#${gradientId})`}
                    strokeWidth="84"
                    strokeMiterlimit="4"
                />
            </g>

            {/* Inner Pattern Group */}
            <g transform="translate(144, 144)">
                {layers.map((layer, index) => (
                    <g key={layer.key} clipPath={`url(#${layer.clipId})`}>
                        <path
                            transform={`matrix(0.791919, 0, 0, 0.791919, ${layer.offset}, ${layer.offset})`}
                            d="M 162 0 C 72.5 0 0 72.5 0 162 C 0 251.5 72.5 324 162 324 C 251.5 324 324 251.5 324 162 C 324 72.5 251.5 0 162 0 Z"
                            fill="none"
                            stroke="#2461ff"
                            strokeWidth="7.58"
                            strokeOpacity="1"
                            strokeMiterlimit="4"
                            className={cn(animate && "animate-pulse")}
                            style={animate ? { animationDelay: `${index * 100}ms` } : undefined}
                        />
                    </g>
                ))}
            </g>
        </svg>
    );
};
