"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getClientById, getReservations, getStockItemById, getExpenseById } from '@/lib/firebase/database';
import type { Client, Reservation, StockItem, Expense } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ReceiptTemplate } from '@/components/receipt/receipt-template';
import { useToast } from '@/hooks/use-toast';

type ReceiptType = 'client' | 'reservation' | 'stock' | 'expense';

export default function UnifiedReceiptPage() {
    const { businessId, businessProfile, loading: authLoading, getCurrencySymbol, activeWorkspaceId } = useAuth();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const type = (searchParams.get('type') || 'client') as ReceiptType;
    const id = searchParams.get('id') || '';

    const [data, setData] = useState<any>(null);
    const [relatedData, setRelatedData] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const currencySymbol = getCurrencySymbol();

    const loadReceiptData = useCallback(async () => {
        if (!businessId || !id || !activeWorkspaceId) {
            setError("Informations manquantes pour charger le reçu.");
            setLoadingData(false);
            return;
        }

        setLoadingData(true);
        setError(null);

        try {
            switch (type) {
                case 'client': {
                    const [clientData, allReservations] = await Promise.all([
                        getClientById(businessId, id),
                        getReservations(businessId, activeWorkspaceId)
                    ]);

                    if (clientData) {
                        setData(clientData);
                        const clientReservations = (allReservations || []).filter(
                            res => res.clientId === id || (res.guestName === clientData.name && !res.clientId)
                        );
                        setRelatedData(clientReservations);
                    } else {
                        setError("Client non trouvé.");
                    }
                    break;
                }

                case 'reservation': {
                    const allReservations = await getReservations(businessId, activeWorkspaceId);
                    const reservation = allReservations?.find(r => r.id === id);

                    if (reservation) {
                        setData(reservation);
                    } else {
                        setError("Réservation non trouvée.");
                    }
                    break;
                }

                case 'stock': {
                    const stockItem = await getStockItemById(businessId, id);

                    if (stockItem) {
                        setData(stockItem);
                    } else {
                        setError("Article non trouvé.");
                    }
                    break;
                }

                case 'expense': {
                    const expense = await getExpenseById(businessId, id);

                    if (expense) {
                        setData(expense);
                    } else {
                        setError("Dépense non trouvée.");
                    }
                    break;
                }

                default:
                    setError("Type de reçu invalide.");
            }
        } catch (err) {
            console.error("Failed to fetch receipt data:", err);
            setError("Impossible de charger les données pour l'impression.");
        } finally {
            setLoadingData(false);
        }
    }, [businessId, id, activeWorkspaceId, type]);

    useEffect(() => {
        if (!authLoading) {
            loadReceiptData();
        }
    }, [authLoading, loadReceiptData]);

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

    if (!data || !businessProfile) {
        return <div className="p-8">Données du reçu non disponibles.</div>;
    }

    // Préparer les données du reçu selon le type
    let receiptData: any = {};

    switch (type) {
        case 'client': {
            const allItems = relatedData.flatMap((res: Reservation) => res.items || []);
            receiptData = {
                id: data.id,
                date: new Date(),
                customerName: data.name,
                items: allItems.length > 0
                    ? allItems
                    : [{ description: `Total des prestations/achats`, quantity: 1, price: data.totalAmount || 0 }],
                totalAmount: data.totalAmount || 0,
                amountPaid: data.amountPaid || 0,
                notes: data.notes,
            };
            break;
        }

        case 'reservation': {
            receiptData = {
                id: data.id,
                date: new Date(data.checkInDate),
                customerName: data.guestName,
                items: data.items || [],
                totalAmount: data.totalAmount || 0,
                amountPaid: data.amountPaid || 0,
                notes: data.notes,
            };
            break;
        }

        case 'stock': {
            receiptData = {
                id: data.id,
                date: new Date(),
                customerName: 'Stock',
                items: [{
                    description: data.name,
                    quantity: data.quantity || 0,
                    price: data.price || 0
                }],
                totalAmount: (data.quantity || 0) * (data.price || 0),
                amountPaid: 0,
                notes: data.description,
            };
            break;
        }

        case 'expense': {
            receiptData = {
                id: data.id,
                date: new Date(data.date),
                customerName: 'Dépense',
                items: [{
                    description: data.description,
                    quantity: 1,
                    price: data.amount || 0
                }],
                totalAmount: data.amount || 0,
                amountPaid: data.amount || 0,
                notes: data.category,
            };
            break;
        }
    }

    return (
        <div className="bg-gray-100 dark:bg-gray-800">
            <div className="p-4 md:p-8 no-print">
                <h1 className="text-2xl font-bold text-center">Aperçu avant impression</h1>
            </div>
            <ReceiptTemplate
                data={data}
                businessProfile={businessProfile}
                currencySymbol={currencySymbol}
                type={type === 'reservation' ? 'prestation' : (type === 'stock' ? 'other' : type)}
            />
            <div className="text-center my-8 no-print space-x-4">
                <Button onClick={() => window.print()}>Imprimer / Enregistrer en PDF</Button>
                <Button variant="link" onClick={() => window.history.back()}>Retour</Button>
            </div>
        </div>
    );
}
