
"use client";

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { getExpenseById, getQuickIncomeById } from '@/lib/firebase/database';
import { db } from '@/lib/db';
import type { Expense, QuickIncome } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'next/navigation';
import { ReceiptTemplate } from '@/components/receipt/receipt-template';
import { ReceiptActions } from '@/components/receipt/receipt-actions';

function PrintTransactionContent() {
  const { businessId, businessProfile, loading: authLoading, getCurrencySymbol } = useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const transactionId = searchParams.get('id');
  const transactionType = searchParams.get('type') as 'expense' | 'income';

  const [transaction, setTransaction] = useState<Expense | QuickIncome | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currencySymbol = getCurrencySymbol();

  const loadTransaction = useCallback(async () => {
    if (!businessId || !transactionId || !transactionType) {
      setError("Informations manquantes pour charger le reçu.");
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    setError(null);
    try {
      let fetchedData: Expense | QuickIncome | undefined | null = null;

      // Try fetching from local Dexie DB first (Offline-first)
      if (transactionType === 'expense') {
        fetchedData = await db.expenses.get(transactionId);
        if (!fetchedData) {
          fetchedData = await getExpenseById(businessId, transactionId);
        }
      } else {
        fetchedData = await db.quickIncomes.get(transactionId);
        if (!fetchedData) {
          fetchedData = await getQuickIncomeById(businessId, transactionId);
        }
      }

      if (fetchedData) {
        setTransaction(fetchedData);
      } else {
        setError("Transaction non trouvée.");
      }
    } catch (err) {
      console.error("Failed to fetch transaction for printing:", err);
      setError("Impossible de charger les données pour l'impression.");
    } finally {
      setLoadingData(false);
    }
  }, [businessId, transactionId, transactionType]);

  useEffect(() => {
    if (!authLoading) {
      loadTransaction();
    }
  }, [authLoading, loadTransaction]);

  if (authLoading || loadingData) {
    return (
      <div className="print-container p-8">
        <h1 className="text-2xl font-bold mb-4">Chargement du reçu...</h1>
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full mb-2" />)}
      </div>
    );
  }

  if (error) {
    return <div className="print-container p-8 text-red-500">Erreur: {error}</div>;
  }

  if (!transaction || !businessProfile) {
    return <div className="print-container p-8">Données du reçu non disponibles.</div>;
  }

  const isExpense = transactionType === 'expense';
  const receiptData = {
    id: transaction.id,
    date: new Date(transaction.date),
    customerName: isExpense ? businessProfile.name : transaction.createdBy,
    items: [
      {
        description: 'itemName' in transaction ? transaction.itemName : transaction.description,
        quantity: 1,
        price: transaction.amount,
        name: 'itemName' in transaction ? transaction.itemName : transaction.description,
      },
    ],
    totalAmount: transaction.amount,
    amountPaid: transaction.amount,
    notes: 'description' in transaction ? (transaction as Expense).description : undefined,
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
          type={isExpense ? 'expense' : 'income'}
        />
      </div>
    </div>
  );
}


export default function PrintTreasuryPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[80vh] w-full" />}>
      <PrintTransactionContent />
    </Suspense>
  )
}
