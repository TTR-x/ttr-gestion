
"use client";

import { cn } from '@/lib/utils';
import { AppLogo } from './app-logo';

export function WelcomeSplash() {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-background'
      )}
    >
      <div className="animate-pulse">
        <AppLogo
          className="w-48 h-auto"
        />
      </div>
      <h1 className="mt-4 text-2xl font-headline font-bold text-foreground">
          TTR GESTION
      </h1>
       <p className="text-sm text-muted-foreground">Chargement de votre espace...</p>
    </div>
  );
}
