"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, ShieldCheck, Database, Users, DownloadCloud } from "lucide-react";
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Progress } from "@/components/ui/progress";
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLoading } from '@/providers/loading-provider';

interface UsageStatProps {
    title: string;
    used: number | string;
    limit: number | string;
    unit: string;
    description: string;
    isBytes?: boolean;
}

const formatBytes = (bytes: number | undefined) => {
    if (bytes === undefined || isNaN(bytes)) return '0 Octets';
    if (bytes === 0) return '0 Octets';
    const k = 1024;
    const dm = bytes < k ? 0 : 2;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


const UsageStatCard: React.FC<UsageStatProps> = ({ title, used, limit, unit, description, isBytes = false }) => {
    const isUnlimited = typeof limit === 'string';
    const usedNumber = typeof used === 'string' ? Infinity : used;
    const limitNumber = isUnlimited ? Infinity : limit;

    const percentage = isUnlimited ? 0 : Math.min((usedNumber / limitNumber) * 100, 100);
    const isExceeded = !isUnlimited && usedNumber >= limitNumber;
    const isWarning = percentage >= 75 && !isExceeded;

    const usedDisplay = isBytes ? formatBytes(usedNumber) : usedNumber.toLocaleString('fr-FR');
    const limitDisplay = isUnlimited ? limit : (isBytes ? formatBytes(limitNumber) : limitNumber.toLocaleString('fr-FR'));

    return (
        <Card className={cn(
            "shadow-md",
            isExceeded ? "bg-destructive/10 border-destructive" : (isWarning ? "bg-yellow-500/10 border-yellow-500" : "bg-card")
        )}>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {isUnlimited ? (
                    <div className="text-3xl font-bold text-primary">Illimité</div>
                ) : (
                    <>
                        <div className="flex justify-between items-baseline mb-2">
                            <span className="text-3xl font-bold">{usedDisplay}</span>
                            <span className="text-muted-foreground">/ {limitDisplay} {isBytes ? "" : unit}</span>
                        </div>
                        <Progress
                            value={percentage}
                            className={cn("h-2")}
                            indicatorClassName={cn(isWarning && "bg-yellow-500", isExceeded && "bg-destructive")}
                        />
                        {isExceeded && (
                            <p className="text-destructive font-semibold text-sm mt-2 flex items-center gap-1">
                                Quota atteint
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};


export default function SubscriptionPage() {
    const { businessProfile, loading: authLoading, usageStats, planDetails } = useAuth();
    const { showLoader } = useLoading();

    if (authLoading || !businessProfile || !usageStats || !planDetails) {
        return (
            <div className="space-y-8">
                <Skeleton className="h-10 w-1/2" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { employeeCount, storageUsed } = usageStats;
    const { planName, expiresAt, employees, storage } = planDetails;

    const isTrial = businessProfile?.subscriptionType === 'gratuit' && expiresAt && expiresAt > Date.now();
    const displayName = isTrial ? "Période d'essai" : planName;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-headline font-semibold tracking-tight">Mon Forfait et Consommation</h1>

            <Card className="shadow-lg bg-gradient-to-r from-primary to-blue-700 text-primary-foreground">
                <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2"><ShieldCheck /> Forfait Actuel : {displayName}</CardTitle>
                    <CardDescription className="text-primary-foreground/80">
                        {expiresAt
                            ? `Valide jusqu'au ${new Date(expiresAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}`
                            : "Aucune date d'expiration définie."
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="secondary" asChild>
                        <Link href="/admin/standard-subscription" onClick={showLoader}>
                            <Star className="mr-2 h-4 w-4" /> Mettre à niveau ou changer de forfait <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <UsageStatCard
                    title="Employés Actifs"
                    used={employeeCount}
                    limit={employees}
                    unit="employé(s)"
                    description="Nombre de comptes employés que vous pouvez créer."
                />
                <UsageStatCard
                    title="Stockage de Données"
                    used={storageUsed}
                    limit={typeof storage === 'number' ? storage : 0}
                    unit="Octets"
                    description="Espace utilisé pour vos données (clients, ventes, images...)"
                    isBytes={true}
                />

            </div>
        </div>
    );
}
