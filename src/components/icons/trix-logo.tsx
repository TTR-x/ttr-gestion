import React from 'react';
import { cn } from "@/lib/utils";

export const TrixLogo = ({ className, animated, ...props }: React.SVGProps<SVGSVGElement> & { animated?: boolean }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1500 1500"
        preserveAspectRatio="xMidYMid meet"
        className={cn(className, animated && "animate-pulse")}
        {...props}
    >
        <defs>
            <clipPath id="clip0">
                <path d="M 48 48 L 1452 48 L 1452 1452 L 48 1452 Z" />
            </clipPath>
            <clipPath id="clip1">
                <path d="M 772.875 -241.453125 L 1741.453125 772.875 L 727.125 1741.453125 L -241.453125 727.125 Z" />
            </clipPath>
            <clipPath id="clip2">
                <path d="M 1257.164062 265.710938 C 989.699219 -14.386719 545.808594 -24.628906 265.710938 242.835938 C -14.386719 510.300781 -24.628906 954.191406 242.835938 1234.289062 C 510.300781 1514.386719 954.191406 1524.628906 1234.289062 1257.164062 C 1514.386719 989.699219 1524.628906 545.808594 1257.164062 265.710938 Z" />
            </clipPath>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#000000" />
                <stop offset="20%" stopColor="#2461ff" />
                <stop offset="80%" stopColor="#ffffff" />
            </linearGradient>
            <clipPath id="innerClip">
                <rect x="0" width="952" y="0" height="952" />
            </clipPath>
        </defs>

        <g clipPath="url(#clip0)">
            <g clipPath="url(#clip1)">
                <g clipPath="url(#clip2)">
                    <path
                        transform="matrix(0.517957, 0.542421, -0.542421, 0.517957, 772.874, -241.453)"
                        d="M 935 0 C 418.6 0 0 418.6 0 935 C 0 1451.3 418.6 1870 935 1870 C 1451.3 1870 1870 1451.3 1870 935 C 1870 418.6 1451.3 0 935 0 Z"
                        fill="url(#grad1)"
                        stroke="white"
                        strokeWidth="40"
                        className={cn(animated && "animate-spin origin-center")}
                        style={{ transformOrigin: 'center' }}
                    />
                </g>
            </g>
        </g>

        <g transform="translate(274, 274)">
            <g clipPath="url(#innerClip)">
                {/* Simplified nested circles for performance and clarity */}
                {[0, 23, 46, 70, 93, 117, 140, 164, 187, 211, 234, 257, 281, 304, 328, 351, 375, 398, 421].map((offset, i) => (
                    <path
                        key={i}
                        d={`M ${162 + offset} ${offset} C ${72 + offset} ${offset} ${offset} ${72 + offset} ${offset} ${162 + offset} C ${offset} ${251 + offset} ${72 + offset} ${324 + offset} ${162 + offset} ${324 + offset} C ${251 + offset} ${324 + offset} ${324 + offset} ${251 + offset} ${324 + offset} ${162 + offset} C ${324 + offset} ${72 + offset} ${251 + offset} ${offset} ${162 + offset} ${offset} Z`}
                        fill="none"
                        stroke="#2461ff"
                        strokeWidth="6"
                        strokeOpacity={1 - (i * 0.05)}
                        className={cn(animated && "animate-pulse")}
                        style={{ animationDelay: `${i * 100}ms` }}
                    />
                ))}
            </g>
        </g>
    </svg>
);
