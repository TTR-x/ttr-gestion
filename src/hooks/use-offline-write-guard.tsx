"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/auth-provider';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WifiOff, AlertTriangle } from 'lucide-react';

/**
 * Hook to enforce Read-Only mode when offline AND in a multi-device environment.
 * Prevents data inconsistency (split-brain) issues.
 */
export function useOfflineWriteGuard() {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [showGuardModal, setShowGuardModal] = useState(false);
    const [deviceCount, setDeviceCount] = useState(1);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check for device count
        const count = parseInt(localStorage.getItem('ttr_known_device_count') || '1', 10);
        setDeviceCount(count);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    /**
     * Checks if a write operation is permitted.
     * Returns TRUE if allowed, FALSE if blocked (and shows modal).
     */
    const checkWritePermission = useCallback(() => {
        // Refresh device count check just in case
        const currentCount = parseInt(localStorage.getItem('ttr_known_device_count') || '1', 10);

        // If online, always allow (sync service handles it)
        if (navigator.onLine) {
            return true;
        }

        // If offline...
        // Check 1: Do we have multiple devices registered?
        if (currentCount > 1) {
            // BLOCKED!
            setShowGuardModal(true);
            return false;
        }

        // If offline but only 1 device ever known, we allow offline writes (they will sync later)
        // This assumes the user truly only uses one device.
        return true;
    }, []);

    const OfflineGuardModal = useCallback(() => (
        <AlertDialog open={showGuardModal} onOpenChange={setShowGuardModal}>
            <AlertDialogContent className="border-red-200 dark:border-red-900/50">
                <AlertDialogHeader>
                    <div className="flex items-center gap-2 text-destructive mb-2">
                        <WifiOff className="h-6 w-6" />
                        <AlertDialogTitle>Mode Lecture Seule (Hors Ligne)</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="space-y-3">
                        <p className="font-medium text-foreground">
                            Modification impossible : Plusieurs appareils sont enregistrés sur ce compte.
                        </p>
                        <p>
                            Pour éviter des conflits de données et des pertes (ex: stock incorrect),
                            vous ne pouvez pas modifier les données tant que vous êtes hors ligne.
                        </p>
                        <div className="bg-muted p-2 rounded text-xs flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                            <span>
                                Veuillez vous reconnecter à Internet pour synchroniser les dernières données avant de faire des modifications.
                            </span>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setShowGuardModal(false)}>
                        J'ai compris
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    ), [showGuardModal]);

    return {
        checkWritePermission,
        OfflineGuardModal,
        isReadOnlyMode: !isOnline && deviceCount > 1
    };
}
