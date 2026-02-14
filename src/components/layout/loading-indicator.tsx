"use client";

import { cn } from "@/lib/utils";

export function LoadingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <svg
        className="h-12 w-12"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>
          {`
            .dot {
              transform-origin: 50% 50%;
              animation: spin 2s linear infinite;
            }
            .dot-1 { fill: hsl(var(--chart-1)); animation-delay: -0.2s; }
            .dot-2 { fill: hsl(var(--chart-2)); animation-delay: -0.4s; }
            .dot-3 { fill: hsl(var(--chart-3)); animation-delay: -0.6s; }
            .dot-4 { fill: hsl(var(--chart-4)); animation-delay: -0.8s; }
            .dot-5 { fill: hsl(var(--chart-5)); animation-delay: -1.0s; }

            @keyframes spin {
              0%, 100% {
                transform: translateY(0) scale(0.8);
                animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
              }
              50% {
                transform: translateY(20px) scale(1.2);
                animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
              }
            }
          `}
        </style>
        <circle className="dot dot-1" cx="50" cy="20" r="8" />
        <circle className="dot dot-2" cx="78" cy="35" r="8" />
        <circle className="dot dot-3" cx="68" cy="75" r="8" />
        <circle className="dot dot-4" cx="32" cy="75" r="8" />
        <circle className="dot dot-5" cx="22" cy="35" r="8" />
      </svg>
    </div>
  );
}
