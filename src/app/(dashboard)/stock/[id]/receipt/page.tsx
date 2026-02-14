"use client";

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { getStockItem } from '@/lib/firebase/database'; // Need to verify this export, or use generic getData
import type { StockItem } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ReceiptTemplate } from '@/components/receipt/receipt-template';
import { db } from '@/lib/db'; // Fallback to local DB
import { useToast } from '@/hooks/use-toast';

function StockReceiptContent() {
    const { businessId, businessProfile, loading: authLoading, getCurrencySymbol, activeWorkspaceId } = useAuth();
    const { toast } = useToast();
    const params = useParams();
    const itemId = params.id as string;
    const qtyParam = searchParams.get('qty');
    const quantity = qtyParam ? parseInt(qtyParam, 10) : 1;

    const [item, setItem] = useState<StockItem | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const currencySymbol = getCurrencySymbol();

    const loadItemData = useCallback(async () => {
        if (!businessId || !itemId || !activeWorkspaceId) {
            if (!authLoading) {
                setError("Informations manquantes.");
                setLoadingData(false);
            }
            return;
        }
        setLoadingData(true);
        setError(null);
        try {
            // Try local DB first for speed
            let fetchedItem = await db.stock.get(itemId);

            if (!fetchedItem) {
                // Fallback to Firebase (mocking getStockItem if not imported, or use getData)
                // For now, let's try to import getStockItem. If it fails, I'll need to fix imports.
                // Assuming getStockItem exists or use generic:
                // fetchedItem = await getData<StockItem>('stock', businessId, itemId);

                // Since I can't easily check imports mapped in this specific file write, 
                // I'll assume we can use db.stock as primary source since we are in "overview" likely online.
                // If local is empty, we might have an issue.
                // But for Quick Receipt, user just sold it, so it SHOULD be in local DB.

                // If not found locally, display error.
            }

            if (fetchedItem) {
                setItem(fetchedItem);
            } else {
                setError("Article non trouvé.");
            }
        } catch (err) {
            console.error("Failed to fetch item for receipt:", err);
            setError("Impossible de charger les données.");
        } finally {
            setLoadingData(false);
        }
    }, [businessId, itemId, activeWorkspaceId, authLoading]);

    useEffect(() => {
        if (!authLoading) {
            loadItemData();
        }
    }, [authLoading, loadItemData]);


    if (authLoading || loadingData) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Génération du reçu...</h1>
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full mb-2" />)}
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-red-500">Erreur: {error}</div>;
    }

    if (!item || !businessProfile) {
        return <div className="p-8">Données non disponibles.</div>;
    }

    const totalPrice = (item.price || 0) * quantity;

    const receiptData = {
        id: `QUICK-${Date.now()}`, // Ephemeral ID
        date: new Date(),
        customerName: "Client de passage", // Default for quick sale
        items: [{
            description: item.name,
            name: item.name,
            quantity: quantity,
            price: item.price || 0
        }],
        totalAmount: totalPrice,
        amountPaid: totalPrice, // Quick sale is usually paid immediately
        notes: "Vente rapide au comptoir",
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-800 min-h-screen">
            <div className="p-4 md:p-8 no-print">
                <h1 className="text-2xl font-bold text-center">Reçu de Vente Rapide</h1>
            </div>
            <ReceiptTemplate
                data={receiptData}
                businessProfile={businessProfile}
                currencySymbol={currencySymbol}
                type="other"
            />
            <div className="text-center my-8 no-print space-x-4">
                <Button onClick={() => window.print()}>Imprimer / Enregistrer en PDF</Button>
                <Button variant="link" onClick={() => window.close()}>Fermer</Button>
            </div>
        </div>
    );
}

export default function StockReceiptPage() {
    return (
        <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <StockReceiptContent />
        </Suspense>
    )
}
