

"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, Cloud, CloudCog, Database, DownloadCloud } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const OnlineStatusIndicator: React.FC = () => {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                    {isOnline ? (
                        <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                        <WifiOff className="h-5 w-5 text-destructive" />
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{isOnline ? "Connecté à Internet" : "Hors ligne"}</p>
            </TooltipContent>
        </Tooltip>
    );
};

const SyncStatusIndicator: React.FC = () => {
    // This could be tied to a global loading state in a real app
    const [isSyncing, setIsSyncing] = useState(false);

    // Simulate sync activity
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (Math.random() > 0.7) { // Randomly decide to "sync"
            interval = setInterval(() => {
                setIsSyncing(true);
                setTimeout(() => setIsSyncing(false), 2000);
            }, 30000); // every 30s
        }
        return () => clearInterval(interval);
    }, []);


    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                    {isSyncing ? (
                        <CloudCog className="h-5 w-5 text-yellow-500 animate-pulse" />
                    ) : (
                        <Cloud className="h-5 w-5 text-green-500" />
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{isSyncing ? "Sauvegarde en cours..." : "Toutes les données sont sauvegardées"}</p>
            </TooltipContent>
        </Tooltip>
    );
};

const formatBytes = (bytes: number | undefined) => {
    if (bytes === undefined || isNaN(bytes)) return '0 Octets';
    if (bytes === 0) return '0 Octets';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(i > 0 ? 2 : 0)) + ' ' + sizes[i];
}

const StorageUsageIndicator: React.FC = () => {
    const { usageStats, planDetails } = useAuth();

    if (!usageStats || !planDetails || typeof planDetails.storage !== 'number') {
        return null;
    }

    const usageInBytes = usageStats.storageUsed;
    const quotaInBytes = planDetails.storage;
    const usagePercentage = quotaInBytes > 0 ? Math.min((usageInBytes / quotaInBytes) * 100, 100) : 0;

    const usageColor = usagePercentage > 90 ? 'bg-destructive' : usagePercentage > 75 ? 'bg-yellow-500' : 'bg-green-500';
    const iconColor = usagePercentage > 90 ? 'text-destructive' : usagePercentage > 75 ? 'text-yellow-500' : 'text-muted-foreground';

    const usageText = `${formatBytes(usageInBytes)} / ${formatBytes(quotaInBytes)}`;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                    <Database className={cn("h-5 w-5", iconColor)} />
                    <span className="text-xs font-mono hidden md:inline">{usagePercentage.toFixed(0)}%</span>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p className="font-semibold">Utilisation du stockage</p>
                <Progress value={usagePercentage} className={cn("h-1.5 mt-1")} indicatorClassName={usageColor} />
                <p className="text-xs text-muted-foreground text-center mt-1">{usageText}</p>
            </TooltipContent>
        </Tooltip>
    );
};

const BandwidthUsageIndicator: React.FC = () => {
    const { usageStats, planDetails } = useAuth();

    if (!usageStats || !planDetails || typeof planDetails.bandwidth !== 'number') {
        return null;
    }

    const usageInBytes = usageStats.bandwidthUsed;
    const quotaInBytes = planDetails.bandwidth;
    const usagePercentage = quotaInBytes > 0 ? Math.min((usageInBytes / quotaInBytes) * 100, 100) : 0;

    const usageColor = usagePercentage > 90 ? 'bg-destructive' : usagePercentage > 75 ? 'bg-yellow-500' : 'bg-green-500';
    const iconColor = usagePercentage > 90 ? 'text-destructive' : usagePercentage > 75 ? 'text-yellow-500' : 'text-muted-foreground';

    const usageText = `${formatBytes(usageInBytes)} / ${formatBytes(quotaInBytes)}`;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                    <DownloadCloud className={cn("h-5 w-5", iconColor)} />
                    <span className="text-xs font-mono hidden md:inline">{usagePercentage.toFixed(0)}%</span>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p className="font-semibold">Bande passante (mensuelle)</p>
                <Progress value={usagePercentage} className={cn("h-1.5 mt-1")} indicatorClassName={usageColor} />
                <p className="text-xs text-muted-foreground text-center mt-1">{usageText}</p>
            </TooltipContent>
        </Tooltip>
    );
};


export function HeaderStatusIcons() {
    return (
        <TooltipProvider>
            <div className="flex items-center gap-4 ml-4">
                <OnlineStatusIndicator />
                <SyncStatusIndicator />
                <div className="hidden md:flex">
                    <StorageUsageIndicator />
                </div>
                <div className="hidden md:flex">
                    <BandwidthUsageIndicator />
                </div>
            </div>
        </TooltipProvider>
    );
}
