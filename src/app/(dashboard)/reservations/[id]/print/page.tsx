"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getReservationById } from '@/lib/firebase/database';
import type { Reservation } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';
import { ReceiptTemplate } from '@/components/receipt/receipt-template';
import { ReceiptActions } from '@/components/receipt/receipt-actions';

export default function PrintReservationPage() {
    const { businessId, businessProfile, loading: authLoading, getCurrencySymbol } = useAuth();
    const params = useParams();
    const reservationId = params.id as string;

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const currencySymbol = getCurrencySymbol();

    const loadReservationData = useCallback(async () => {
        if (!businessId || !reservationId) {
            if (!authLoading) {
                setError("Informations manquantes pour charger le reçu.");
                setLoadingData(false);
            }
            return;
        }
        setLoadingData(true);
        setError(null);
        try {
            const fetchedReservation = await getReservationById(businessId, reservationId);

            if (fetchedReservation) {
                setReservation(fetchedReservation as Reservation);
            } else {
                setError("Réservation non trouvée.");
            }
        } catch (err) {
            console.error("Failed to fetch reservation for printing:", err);
            setError("Impossible de charger les données pour l'impression.");
        } finally {
            setLoadingData(false);
        }
    }, [businessId, reservationId, authLoading]);

    useEffect(() => {
        if (!authLoading) {
            loadReservationData();
        }
    }, [authLoading, loadReservationData]);


    if (authLoading || loadingData) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Chargement du reçu...</h1>
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full mb-2" />)}
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-red-500">Erreur: {error}</div>;
    }

    if (!reservation || !businessProfile) {
        return <div className="p-8">Données non disponibles.</div>;
    }

    const receiptData = {
        id: reservation.id,
        date: new Date(reservation.createdAt),
        customerName: reservation.guestName,
        items: reservation.items && reservation.items.length > 0
            ? reservation.items
            : [{ description: `Séjour: ${reservation.roomType}`, quantity: 1, price: reservation.totalAmount, name: reservation.roomType }],
        totalAmount: reservation.totalAmount,
        amountPaid: reservation.amountPaid || 0,
        notes: reservation.notes,
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
                    type="prestation"
                />
            </div>
        </div>
    );
}
