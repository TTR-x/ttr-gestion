
"use client";

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/db';
import type { Reservation } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/layout/app-logo';
import { useToast } from '@/hooks/use-toast';

const statusTranslations: { [key: string]: string } = {
  pending: "En attente",
  confirmed: "Confirmée",
  "checked-in": "Arrivé",
  "checked-out": "Parti",
  cancelled: "Annulée",
};

type Period = '24h' | '7d' | '1m' | '6m' | '12m' | 'all';

function PrintReservationsContent() {
  const { currentUser, businessId, businessProfile, loading: authLoading, getCurrencySymbol, activeWorkspaceId } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const period = (searchParams.get('period') as Period) || 'all';

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printed, setPrinted] = useState(false);

  const loadReservations = useCallback(async () => {
    if (!currentUser || !businessId || !activeWorkspaceId) {
      setError("Utilisateur non authentifié ou espace de travail non identifié.");
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    setError(null);
    try {
      // Use local DB first
      const allReservations = await db.reservations.where('workspaceId').equals(activeWorkspaceId).toArray();

      // Fallback or Sync check could happen here, but we rely on syncService for that.
      // If local is empty and we have internet, maybe fetch? 
      // For now, consistent with dashboard, use local.

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

      const filtered = (allReservations || []).filter(r => new Date(r.createdAt) >= startDate);
      setReservations(filtered.sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime()));

    } catch (err) {
      console.error("Failed to fetch reservations for printing:", err);
      setError("Impossible de charger les réservations pour l'impression.");
    } finally {
      setLoadingData(false);
    }
  }, [currentUser, businessId, activeWorkspaceId, period]);

  useEffect(() => {
    if (!authLoading) {
      loadReservations();
    }
  }, [authLoading, loadReservations]);

  useEffect(() => {
    if (!loadingData && !error && reservations.length > 0 && !printed) {
      setTimeout(() => {
        // window.print();
        toast({ title: "Bientôt disponible", description: "La fonctionnalité d'impression sera activée prochainement." });
        setPrinted(true);
      }, 500);
    }
  }, [loadingData, error, reservations, printed]);

  if (authLoading || loadingData) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Chargement des réservations pour impression...</h1>
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full mb-2" />)}
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-red-500">Erreur: {error}</div>;
  }

  if (reservations.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4">Aucune prestation à imprimer pour cette période.</p>
        <Button variant="link" onClick={() => window.close()}>Fermer</Button>
      </div>
    );
  }

  const totalAmount = reservations.reduce((sum, res) => sum + res.totalAmount, 0);
  const currencySymbol = getCurrencySymbol();

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
        <h1 className="text-3xl font-bold">{businessProfile?.name || 'TTR Gestion'}</h1>
        <p className="text-muted-foreground">Aperçu avant impression</p>
      </header>

      <div className="print-container mx-auto max-w-4xl">
        <div className="print-only mb-6">
          <h1 className="text-2xl font-bold text-center">Liste des Prestations</h1>
          <p className="text-sm text-center text-gray-500">
            Liste {periodLabels[period]} - Générée le: {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr })} pour {businessProfile?.name}
          </p>
        </div>

        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Client</th>
              <th className="border border-gray-300 p-2 text-left">Dates</th>
              <th className="border border-gray-300 p-2 text-left">Chambre/Prestation</th>
              <th className="border border-gray-300 p-2 text-right">Montant ({currencySymbol})</th>
              <th className="border border-gray-300 p-2 text-left">Statut</th>
              <th className="border border-gray-300 p-2 text-left">Créé par</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((res) => (
              <tr key={res.id} className="even:bg-gray-50">
                <td className="border border-gray-300 p-2 font-medium">{res.guestName}</td>
                <td className="border border-gray-300 p-2">{format(new Date(res.checkInDate), 'dd/MM/yy')} - {format(new Date(res.checkOutDate), 'dd/MM/yy')}</td>
                <td className="border border-gray-300 p-2">{res.roomType}</td>
                <td className="border border-gray-300 p-2 text-right">{res.totalAmount.toLocaleString('fr-FR')}</td>
                <td className="border border-gray-300 p-2">{statusTranslations[res.status] || res.status}</td>
                <td className="border border-gray-300 p-2 text-xs">{res.createdBy}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-gray-100">
              <td colSpan={3} className="border border-gray-300 p-2 text-right">Total des Prestations:</td>
              <td className="border border-gray-300 p-2 text-right">{totalAmount.toLocaleString('fr-FR')} {currencySymbol}</td>
              <td colSpan={2} className="border border-gray-300 p-2"></td>
            </tr>
          </tfoot>
        </table>
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

export default function PrintReservationsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <PrintReservationsContent />
    </Suspense>
  )
}
