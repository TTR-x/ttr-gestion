
"use client";

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { Clock, RefreshCw, AlertTriangle, WifiOff, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_TIME_DRIFT = 5 * 60 * 1000; // 5 minutes

interface TimeContextType {
    serverOffset: number;
    isOnline: boolean;
    getEstimatedServerTime: () => number;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export function useTimeManagement() {
    const context = useContext(TimeContext);
    if (!context) {
        throw new Error('useTimeManagement must be used within TimeSyncGuard');
    }
    return context;
}

// Global variable for non-react usage (like sync-service or database.ts)
let globalServerOffset = 0;
export const getEstimatedServerTime = () => Date.now() + globalServerOffset;

export function TimeSyncGuard({ children }: { children: React.ReactNode }) {
    const [isTimeCorrect, setIsTimeCorrect] = useState<boolean | null>(null);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [serverTime, setServerTime] = useState<Date | null>(null);
    const [deviceTime, setDeviceTime] = useState<Date | null>(null);
    // Remove isChecking state if not used for UI feedback to reduce renders
    const [showOfflineWarning, setShowOfflineWarning] = useState(false);

    const checkTime = useCallback(async () => {
        if (!navigator.onLine) {
            setIsOnline(false);
            if (isTimeCorrect === null) {
                setShowOfflineWarning(true);
            }
            return;
        }

        setIsOnline(true);
        try {
            const start = Date.now();
            const response = await fetch('/manifest.json', { method: 'HEAD', cache: 'no-store' });
            const end = Date.now();
            const latency = (end - start) / 2;

            const dateHeader = response.headers.get('Date');
            if (dateHeader) {
                const sTime = new Date(dateHeader).getTime() + latency;
                const dTime = Date.now();
                const drift = sTime - dTime;

                globalServerOffset = drift;
                // console.log(`[TimeSync] Offset calculated: ${drift}ms`); // Reduced logging

                const isCorrect = Math.abs(drift) <= MAX_TIME_DRIFT;

                // Only update state if it actually changed
                setIsTimeCorrect(prev => prev === isCorrect ? prev : isCorrect);

                if (!isCorrect) {
                    setServerTime(new Date(sTime));
                    setDeviceTime(new Date(dTime));
                    setShowOfflineWarning(false);
                } else {
                    // If time is correct, ensure warning is hidden
                    setShowOfflineWarning(false);
                }
            } else {
                setIsTimeCorrect(true);
            }
        } catch (error) {
            // console.error('[TimeSync] Failed to check time:', error);
            setIsTimeCorrect(true);
            setShowOfflineWarning(!navigator.onLine);
        }
    }, [isTimeCorrect]); // Added isTimeCorrect to dependency if needed, or keep empty if logic is self-contained. 
    // Actually, careful with dependencies. 
    // Better to use functional state updates and keep dependency array minimal.

    useEffect(() => {
        // Initial check
        checkTime();

        const handleOnline = () => { setIsOnline(true); checkTime(); };
        const handleOffline = () => { setIsOnline(false); setShowOfflineWarning(true); };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Remove focus listener to prevent aggressive checks on tab switching
        // window.addEventListener('focus', checkTime); 

        const interval = setInterval(checkTime, 15 * 60 * 1000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            // window.removeEventListener('focus', checkTime);
            clearInterval(interval);
        };
    }, []); // Empty dependency array to run effect once

    // Memoize the context value to prevent consumers from re-rendering unless values actually change
    const contextValue = React.useMemo(() => ({
        serverOffset: globalServerOffset,
        isOnline,
        getEstimatedServerTime: () => Date.now() + globalServerOffset
    }), [isOnline]); // globalServerOffset is mutable/external, so it doesn't trigger memo update itself, but isOnline does.

    if (isTimeCorrect === false && isOnline) {
        return (
            <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                    <Clock className="w-10 h-10 text-destructive animate-pulse" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Heure locale incorrecte</h1>
                <p className="text-muted-foreground max-w-md mb-8">
                    L'heure de votre appareil est décalée de plus de 5 minutes. Veuillez la corriger pour continuer.
                </p>
                <div className="bg-muted p-4 rounded-lg w-full max-w-sm mb-8 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Appareil:</span> <span className="font-mono text-destructive">{deviceTime?.toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Réseau:</span> <span className="font-mono text-green-600">{serverTime?.toLocaleTimeString()}</span>
                    </div>
                </div>
                <Button onClick={() => window.location.reload()} size="lg" className="w-full max-w-sm">
                    Recharger après correction
                </Button>
            </div>
        );
    }

    return (
        <TimeContext.Provider value={contextValue}>
            {children}

            {/* Modal d'avertissement Hors-ligne (Non-bloquant) */}
            {showOfflineWarning && (
                <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-[400px] z-[40] bg-card border-2 border-yellow-500/50 shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-yellow-500/10 p-4 border-b border-yellow-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <WifiOff className="w-5 h-5 text-yellow-600" />
                            <span className="font-bold text-yellow-700">Mode Hors-ligne Actif</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-700" onClick={() => setShowOfflineWarning(false)}>
                            <AlertTriangle className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="p-4 space-y-4">
                        <p className="text-sm leading-relaxed text-muted-foreground italic">
                            Attention : Toute modification de l'heure locale en mode hors-ligne peut fausser la chronologie de votre journal d'activité.
                        </p>

                        <Button
                            variant="outline"
                            className="w-full text-xs h-8 border-yellow-500/50 text-yellow-700 hover:bg-yellow-500/5"
                            onClick={() => setShowOfflineWarning(false)}
                        >
                            J'ai compris, continuer
                        </Button>
                    </div>
                </div>
            )}
        </TimeContext.Provider>
    );
}
