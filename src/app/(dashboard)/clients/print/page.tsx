
"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getClients as fetchClients } from '@/lib/firebase/database';
import type { Client } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AppLogo } from '@/components/layout/app-logo';
import { ResolvedImage } from '@/components/ui/resolved-image';
import { Building, Phone, Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type Period = '24h' | '7d' | '1m' | '6m' | '12m' | 'all';

function ClientPrintContent() {
    const { businessId, businessProfile, loading: authLoading, getCurrencySymbol, activeWorkspaceId } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const period = (searchParams.get('period') as Period) || 'all';

    const [clients, setClients] = useState<Client[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [printed, setPrinted] = useState(false);

    const currencySymbol = getCurrencySymbol();

    const loadData = useCallback(async () => {
        if (!businessId || !activeWorkspaceId) {
            setError("Informations manquantes pour charger la liste.");
            setLoadingData(false);
            return;
        }
        setLoadingData(true);
        setError(null);
        try {
            const allClients = await fetchClients(businessId, activeWorkspaceId);
            const now = new Date();
            let startDate: Date;

            switch (period) {
                case '24h': startDate = subDays(now, 1); break;
                case '7d': startDate = subDays(now, 7); break;
                case '1m': startDate = startOfMonth(now); break;
                case '6m': startDate = subDays(now, 180); break;
                case '12m': startDate = startOfYear(now); break;
                case 'all':
                default:
                    startDate = new Date(0);
            }

            const filteredClients = (allClients || []).filter(c => c.createdAt && c.createdAt >= startDate.getTime());
            setClients(filteredClients.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));

        } catch (err) {
            console.error("Failed to fetch clients for printing:", err);
            setError("Impossible de charger les données pour l'impression.");
        } finally {
            setLoadingData(false);
        }
    }, [businessId, activeWorkspaceId, period]);

    useEffect(() => {
        if (!authLoading) {
            loadData();
        }
    }, [authLoading, loadData]);

    useEffect(() => {
        if (!loadingData && !error && clients.length > 0 && !printed) {
            setTimeout(() => {
                // window.print();
                toast({ title: "Bientôt disponible", description: "L'impression de la liste des clients sera activée prochainement." });
                setPrinted(true);
            }, 500);
        }
    }, [loadingData, error, clients, printed]);

    if (authLoading || loadingData) {
        return (
            <div className="print-container p-8">
                <h1 className="text-2xl font-bold mb-4">Chargement de la liste des clients...</h1>
                {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-8 w-full mb-2" />)}
            </div>
        );
    }

    if (error) {
        return <div className="print-container p-8 text-red-500">Erreur: {error}</div>;
    }

    const periodLabels: Record<string, string> = {
        '24h': 'des dernières 24 heures',
        '7d': 'des 7 derniers jours',
        '1m': 'de ce mois',
        '6m': 'des 6 derniers mois',
        '12m': 'de cette année',
        'all': 'de toute la période',
    };

    return (
        <div className="bg-white p-4 md:p-8">
            <header className="mb-8 text-center no-print">
                <h1 className="text-3xl font-bold">Aperçu avant impression</h1>
                <p className="text-muted-foreground">Liste des clients</p>
            </header>

            <div className="print-container mx-auto max-w-4xl">
                <header className="flex justify-between items-start mb-8 border-b pb-4">
                    <div>
                        {businessProfile?.logoUrl ? (
                            <ResolvedImage src={businessProfile.logoUrl} alt={`${businessProfile.name} Logo`} width={80} height={80} className="object-contain mb-2" />
                        ) : (
                            <AppLogo className="h-16 w-16 mb-2" />
                        )}
                        <h1 className="text-2xl font-bold">{businessProfile?.name}</h1>
                        <p className="text-gray-500 text-sm">{businessProfile?.type}</p>
                    </div>
                    <div className="text-right text-xs text-gray-600 space-y-1">
                        {businessProfile?.businessAddress && <div className="flex justify-end items-center gap-2"><p>{businessProfile.businessAddress}</p><Building className="h-3 w-3" /></div>}
                        {businessProfile?.businessPhoneNumber && <div className="flex justify-end items-center gap-2"><p>{businessProfile.businessPhoneNumber}</p><Phone className="h-3 w-3" /></div>}
                        {businessProfile?.professionalEmail && <div className="flex justify-end items-center gap-2"><p>{businessProfile.professionalEmail}</p><Mail className="h-3 w-3" /></div>}
                        {businessProfile?.website && <div className="flex justify-end items-center gap-2"><p>{businessProfile.website}</p><Globe className="h-3 w-3" /></div>}
                    </div>
                </header>

                <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold uppercase tracking-wider">Liste des Clients</h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Liste {periodLabels[period]} - Générée le: {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr })}
                    </p>
                </div>

                {clients.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">Aucun client à afficher pour cette période.</div>
                ) : (
                    <table className="w-full text-sm border-collapse border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 p-2 text-left">Nom du Client</th>
                                <th className="border border-gray-300 p-2 text-left">Téléphone</th>
                                <th className="border border-gray-300 p-2 text-left">Email</th>
                                <th className="border border-gray-300 p-2 text-left">Date d'ajout</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map((client) => (
                                <tr key={client.id} className="even:bg-gray-50">
                                    <td className="border border-gray-300 p-2 font-medium">{client.name}</td>
                                    <td className="border border-gray-300 p-2">{client.phoneNumber}</td>
                                    <td className="border border-gray-300 p-2">{client.email || 'N/A'}</td>
                                    <td className="border border-gray-300 p-2">{client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yyyy', { locale: fr }) : 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <footer className="mt-8 text-center text-xs text-gray-500 print-only">
                    {businessProfile?.name || 'TTR Gestion'} - {new Date().getFullYear()}
                </footer>
            </div>

            <div className="text-center mt-8 no-print space-x-4">
                <Button onClick={() => toast({ title: "Bientôt disponible", description: "L'impression sera activée prochainement." })}>Imprimer</Button>
                <Button variant="link" onClick={() => window.close()}>Fermer</Button>
            </div>
        </div>
    );
}

export default function ClientPrintPage() {
    return (
        <Suspense fallback={<Skeleton className="h-[80vh] w-full" />}>
            <ClientPrintContent />
        </Suspense>
    )
}
