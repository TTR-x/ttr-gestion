"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getClientById, getReservations } from '@/lib/firebase/database';
import type { Client, Reservation } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';
import { ReceiptTemplate } from '@/components/receipt/receipt-template';
import { ReceiptActions } from '@/components/receipt/receipt-actions';

export default function PrintClientReceiptPage() {
    const { businessId, businessProfile, loading: authLoading, getCurrencySymbol, activeWorkspaceId } = useAuth();
    const params = useParams();
    const clientId = params.clientId as string;

    const [client, setClient] = useState<Client | null>(null);
    const [relatedReservations, setRelatedReservations] = useState<Reservation[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const currencySymbol = getCurrencySymbol();

    const loadClientAndReservations = useCallback(async () => {
        if (!businessId || !clientId || !activeWorkspaceId) {
            if (!authLoading) {
                setError("Informations manquantes pour charger le reçu.");
                setLoadingData(false);
            }
            return;
        }
        setLoadingData(true);
        setError(null);
        try {
            const [fetchedClientData, allReservations] = await Promise.all([
                getClientById(businessId, clientId),
                getReservations(businessId, activeWorkspaceId)
            ]);

            if (fetchedClientData) {
                setClient(fetchedClientData as Client);

                const clientReservations = (allReservations || []).filter(
                    res => res.clientId === clientId || (res.guestName === fetchedClientData.name && !res.clientId)
                );
                setRelatedReservations(clientReservations);

            } else {
                setError("Reçu client non trouvé.");
            }
        } catch (err) {
            console.error("Failed to fetch client/reservations for printing:", err);
            setError("Impossible de charger les données pour l'impression.");
        } finally {
            setLoadingData(false);
        }
    }, [businessId, clientId, activeWorkspaceId, authLoading]);

    useEffect(() => {
        if (!authLoading) {
            loadClientAndReservations();
        }
    }, [authLoading, loadClientAndReservations]);


    if (authLoading || loadingData) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Chargement du relevé...</h1>
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full mb-2" />)}
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-red-500">Erreur: {error}</div>;
    }

    if (!client || !businessProfile) {
        return <div className="p-8">Données du relevé non disponibles.</div>;
    }

    // Consolidate all items from all related reservations
    const allItems = relatedReservations.flatMap(res => res.items || []);

    const receiptData = {
        id: client.id,
        date: new Date(),
        customerName: client.name,
        items: allItems.length > 0
            ? allItems
            : [{ description: `Total des prestations/achats`, quantity: 1, price: client.totalAmount || 0, name: 'Service' }],
        totalAmount: client.totalAmount || 0,
        amountPaid: client.amountPaid || 0,
        notes: client.notes,
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <ReceiptActions
                receiptData={receiptData}
                businessProfile={businessProfile}
            />
            <div className="py-8" id="receipt-print-area">
                <ReceiptTemplate
                    data={receiptData}
                    businessProfile={businessProfile}
                    currencySymbol={currencySymbol}
                    type="client"
                />
            </div>
        </div>
    );
}
