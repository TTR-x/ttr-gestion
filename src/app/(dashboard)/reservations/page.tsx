

"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ListFilter, Search, Edit, Trash2, Printer, LineChart, Calendar as CalendarIcon, Check, ClipboardPlus, HandCoins, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { syncService } from "@/lib/sync-service";
import { deletionService } from "@/lib/deletion-service";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from "uuid";
import type { Reservation } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useLoading } from "@/providers/loading-provider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";

const statusTranslations: { [key: string]: string } = {
  pending: "En attente",
  confirmed: "Confirmée",
  "checked-in": "Effectuée/Livrée",
  "checked-out": "Terminée",
  cancelled: "Annulée",
};

const getStatusVariant = (status: Reservation['status']) => {
  switch (status) {
    case "confirmed": return "default";
    case "pending": return "secondary";
    case "checked-in": return "default";
    case "checked-out": return "outline";
    case "cancelled": return "destructive";
    default: return "outline";
  }
};

const useTerminology = () => {
  const { businessProfile } = useAuth();
  return useMemo(() => {
    const businessType = businessProfile?.type.toLowerCase() || '';
    if (businessType.includes('hôtel')) {
      return { singular: 'réservation', plural: 'réservations', guestLabel: 'Nom du client' };
    } else if (businessType.includes('restaurant') || businessType.includes('bar')) {
      return { singular: 'commande', plural: 'commandes', guestLabel: 'Nom du client' };
    } else if (businessType.includes('quincaillerie') || businessType.includes('boutique') || businessType.includes('magasin')) {
      return { singular: 'vente', plural: 'ventes', guestLabel: 'Nom du client' };
    } else if (businessType.includes('pharmacie') || businessType.includes('clinique') || businessType.includes('hôpital')) {
      return { singular: 'patient', plural: 'patients', guestLabel: 'Nom du patient' };
    } else {
      return { singular: 'prestation', plural: 'prestations', guestLabel: 'Nom du client' };
    }
  }, [businessProfile]);
};

const printPeriods = [
  { label: 'Dernières 24h', value: '24h' },
  { label: '7 derniers jours', value: '7d' },
  { label: 'Ce mois-ci', value: '1m' },
  { label: '6 derniers mois', value: '6m' },
  { label: 'Cette année', value: '12m' },
  { label: 'Tout', value: 'all' },
];

const updateFormSchema = z.object({
  newPayment: z.coerce.number().min(0, { message: "Le paiement doit être positif." }).optional(),
  status: z.string({ required_error: "Le statut est requis." }),
});
type UpdateFormValues = z.infer<typeof updateFormSchema>;


export default function ReservationsPage() {
  const { isAdmin, currentUser, businessId, loading: authLoading, getCurrencySymbol, activeWorkspaceId, businessProfile } = useAuth();
  const { toast } = useToast();
  const { showLoader, hideLoader, isLoading } = useLoading();
  // Removed explicit reservations state as we use useLiveQuery
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [statusFilter, setStatusFilter] = useState<Record<string, boolean>>({
    pending: true,
    confirmed: true,
    'checked-in': true,
    'checked-out': true,
    cancelled: false,
  });
  const terminology = useTerminology();
  const currencySymbol = getCurrencySymbol();

  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const [reservationToDelete, setReservationToDelete] = useState<Reservation | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const updateForm = useForm<UpdateFormValues>({
    resolver: zodResolver(updateFormSchema),
  });

  // Automatically update reservations from local DB
  const reservations = useLiveQuery(
    () => {
      if (!activeWorkspaceId) return [];
      return db.reservations
        .where('workspaceId')
        .equals(activeWorkspaceId)
        .reverse() // Optional: Sort by default index if needed, but we sort manually later
        .toArray();
    },
    [activeWorkspaceId]
  ) || [];

  // Initial Sync from Cloud
  useEffect(() => {
    async function init() {
      if (businessId && activeWorkspaceId) {
        try {
          await syncService.initialSync(businessId, activeWorkspaceId);
        } catch (err) {
          console.error("Initial sync failed", err);
        }
      }
    }
    if (!authLoading) {
      init();
    }
  }, [businessId, activeWorkspaceId, authLoading]);

  // Filter effect remains similar but uses the live `reservations`
  useEffect(() => {
    if (!reservations) return;
    const sorted = [...reservations].sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime());

    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = sorted.filter(res =>
      (res.guestName?.toLowerCase().includes(lowerSearchTerm) ||
        res.id?.toLowerCase().includes(lowerSearchTerm)) && // Removed items check for simplicity/perf unless essential
      statusFilter[res.status]
    );
    setFilteredReservations(filtered);
  }, [searchTerm, reservations, statusFilter]);

  const handleStatusFilterChange = (status: string, checked: boolean) => {
    setStatusFilter(prev => ({ ...prev, [status]: checked }));
  };

  const handleDeleteReservation = async (reservation: Reservation) => {
    if (!currentUser?.uid || !businessId) {
      toast({ variant: "destructive", title: "Action non autorisée", description: "Vous n'avez pas les droits pour supprimer ceci." });
      return;
    }
    setReservationToDelete(reservation);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reservationToDelete || !currentUser?.uid || !businessId || !currentUser.displayName || !activeWorkspaceId) return;

    showLoader();
    try {
      const result = await deletionService.deleteReservation(
        reservationToDelete.id,
        businessId,
        activeWorkspaceId,
        currentUser.displayName,
        currentUser.uid
      );

      if (result.success) {
        toast({
          title: "Prestation supprimée",
          description: `Supprimée avec succès. ${result.calculations.treasuryAdjustment ? `Ajustement trésorerie: ${result.calculations.treasuryAdjustment} ${currencySymbol}` : ''}`
        });
        setIsDeleteConfirmOpen(false);
        setReservationToDelete(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error deleting reservation:", error);
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Erreur lors de la suppression." });
    } finally {
      hideLoader();
    }
  };

  const handleOpenUpdateDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    updateForm.reset({
      status: reservation.status,
      newPayment: 0,
    });
    setIsUpdateDialogOpen(true);
  };

  async function onUpdateSubmit(values: UpdateFormValues) {
    if (!selectedReservation || !currentUser || !businessId) return;

    showLoader();
    try {
      const currentAmountPaid = selectedReservation.amountPaid || 0;
      const newPayment = values.newPayment || 0;
      const newTotalPaid = currentAmountPaid + newPayment;

      if (newTotalPaid > selectedReservation.totalAmount) {
        throw new Error("Le montant total payé ne peut pas dépasser le montant total de la facture.");
      }

      const updatedReservation: Reservation = {
        ...selectedReservation,
        amountPaid: newTotalPaid,
        status: values.status as Reservation['status'],
        updatedAt: Date.now(), // Assuming Reservation type has updatedAt? Or is it handled elsewhere?
        // Checking types.ts from earlier, Reservation interface likely has generic fields?
        // Step 589 file view didn't show types.ts, but database.ts usually handles this.
        // Let's assume standard object merge is fine.
      };

      await syncService.updateReservation(updatedReservation);

      // Log Activity
      await syncService.createActivityLog({
        id: uuidv4(),
        workspaceId: selectedReservation.workspaceId,
        businessId: businessId,
        timestamp: Date.now(),
        actorUid: currentUser.uid,
        actorDisplayName: currentUser.displayName || 'Unknown',
        action: `Mise à jour réservation: ${selectedReservation.guestName}`,
        details: {
          status: values.status,
          amountPaid: newTotalPaid,
          previousStatus: selectedReservation.status,
          paymentAdded: newPayment
        }
      });

      toast({ title: "Prestation mise à jour", description: `La prestation pour ${selectedReservation.guestName} a été mise à jour.` });
      setIsUpdateDialogOpen(false);
      // No need to loadReservations, live query handles it.

    } catch (error: any) {
      console.error("Update reservation error:", error);
      toast({ variant: 'destructive', title: "Erreur de mise à jour", description: error.message });
    } finally {
      hideLoader();
    }
  }


  const handlePrint = (period: string) => {
    toast({
      title: "Bientôt disponible",
      description: "L'impression de la liste des prestations sera activée prochainement.",
    });
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-headline font-semibold tracking-tight capitalize">Gestion des {terminology.plural}</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/reservations/analytics" onClick={showLoader}><LineChart className="mr-2 h-4 w-4" /> Voir les analyses</Link>
            </Button>
            <Button asChild>
              <Link href="/reservations/new" onClick={showLoader}>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une {terminology.singular}
              </Link>
            </Button>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline capitalize">Liste des {terminology.plural}</CardTitle>
            <CardDescription>Visualisez, modifiez et gérez toutes les {terminology.plural} de votre établissement.</CardDescription>
            <div className="flex items-center gap-2 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Rechercher par nom, ${terminology.singular}, ID...`}
                  className="pl-8 w-full sm:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1">
                    <ListFilter className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      Filtrer par Statut
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.keys(statusTranslations).map(status => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={statusFilter[status]}
                      onCheckedChange={(checked) => handleStatusFilterChange(status, !!checked)}
                    >
                      {statusTranslations[status]}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1">
                    <Printer className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only">Imprimer</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Imprimer la liste des prestations</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {printPeriods.map(p => (
                    <DropdownMenuItem key={p.value} onClick={() => handlePrint(p.value)} className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {p.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[150px] capitalize">{terminology.guestLabel}</TableHead>
                  <TableHead>Détails</TableHead>
                  <TableHead className="w-[120px]">Statut</TableHead>
                  <TableHead className="w-[150px] text-right">Paiement ({currencySymbol})</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.length > 0 ? (
                  filteredReservations.map((res) => {
                    const remaining = res.totalAmount - (res.amountPaid || 0);
                    const isPaid = remaining <= 0;

                    return (
                      <TableRow key={res.id}>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <span className="font-medium text-sm">{format(new Date(res.checkInDate), 'dd MMM', { locale: fr })}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(res.checkInDate), 'HH:mm')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{res.guestName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 max-w-[200px] sm:max-w-none">
                            {res.items?.map((item, idx) => (
                              <div key={idx} className="text-sm flex justify-between gap-2 border-b border-dashed last:border-0 pb-1 last:pb-0">
                                <span className="truncate">{item.name}</span>
                                <span className="text-muted-foreground whitespace-nowrap">x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(res.status)} className="whitespace-nowrap">{statusTranslations[res.status] || res.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-bold whitespace-nowrap">{res.totalAmount.toLocaleString('fr-FR')}</span>
                            {remaining > 0 ? (
                              <Badge variant="destructive" className="text-[10px] px-2 py-0.5 h-auto whitespace-nowrap">
                                Reste: {remaining.toLocaleString('fr-FR')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50 px-2 py-0.5 h-auto whitespace-nowrap">
                                Payé
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant={remaining > 0 ? "default" : "secondary"} // Highlight if payment needed
                              size="sm"
                              onClick={() => handleOpenUpdateDialog(res)}
                              className="h-8"
                            >
                              <HandCoins className="mr-2 h-4 w-4" />
                              {remaining > 0 ? "Encaisser" : "Gérer"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setReceiptData({
                                  id: res.id,
                                  date: new Date(res.createdAt),
                                  customerName: res.guestName,
                                  items: [{
                                    name: `${terminology.singular} - ${res.roomNumber}`,
                                    description: `Séjour du ${format(new Date(res.checkInDate), 'dd/MM')} au ${format(new Date(res.checkOutDate), 'dd/MM')}`,
                                    quantity: 1,
                                    price: res.totalPrice
                                  }],
                                  totalAmount: res.totalPrice,
                                  amountPaid: res.totalPrice - (res.remainingAmount || 0),
                                  notes: res.notes
                                });
                                setIsReceiptOpen(true);
                              }}
                              title="Imprimer Reçu"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/reservations/${res.id}/edit`} onClick={showLoader}><Edit className="mr-2 h-4 w-4" />Modifier</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/reservations/new?guestName=${encodeURIComponent(res.guestName)}`} onClick={showLoader}><ClipboardPlus className="mr-2 h-4 w-4" />Dupliquer</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => {
                                  setReceiptData({
                                    id: res.id,
                                    date: new Date(res.createdAt),
                                    customerName: res.guestName,
                                    items: [{
                                      name: `${terminology.singular} - ${res.roomNumber}`,
                                      description: `Séjour du ${format(new Date(res.checkInDate), 'dd/MM')} au ${format(new Date(res.checkOutDate), 'dd/MM')}`,
                                      quantity: 1,
                                      price: res.totalPrice
                                    }],
                                    totalAmount: res.totalPrice,
                                    amountPaid: res.totalPrice - (res.remainingAmount || 0),
                                    notes: res.notes
                                  });
                                  setIsReceiptOpen(true);
                                }}>
                                  <Printer className="mr-2 h-4 w-4" />Imprimer Reçu
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteReservation(res)}
                                      className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />Supprimer
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Aucune {terminology.singular} trouvée pour les filtres actuels.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gérer la prestation</DialogTitle>
            {selectedReservation && <DialogDescription>Pour {selectedReservation.guestName}</DialogDescription>}
          </DialogHeader>
          {selectedReservation && (
            <Form {...updateForm}>
              <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-6 pt-4">
                <div className="p-4 border rounded-lg bg-secondary/50">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm text-muted-foreground">Total à payer:</span>
                    <span className="font-semibold">{selectedReservation.totalAmount.toLocaleString('fr-FR')} {currencySymbol}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Déjà payé:</span>
                    <span className="font-semibold">{(selectedReservation.amountPaid || 0).toLocaleString('fr-FR')} {currencySymbol}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t flex justify-between items-baseline text-lg">
                    <span className="font-medium text-muted-foreground">Solde restant:</span>
                    <span className="font-bold text-primary">{(selectedReservation.totalAmount - (selectedReservation.amountPaid || 0)).toLocaleString('fr-FR')} {currencySymbol}</span>
                  </div>
                </div>

                <FormField
                  control={updateForm.control}
                  name="newPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Encaisser un nouveau paiement</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} min="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={updateForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Changer le statut</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.entries(statusTranslations).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Mettre à jour
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {receiptData && businessProfile && (
        <ReceiptDialog
          isOpen={isReceiptOpen}
          onOpenChange={setIsReceiptOpen}
          businessProfile={businessProfile}
          currencySymbol={currencySymbol}
          type="prestation"
          data={receiptData}
        />
      )
      }
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer la prestation ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action déplacera la prestation pour <strong>{reservationToDelete?.guestName}</strong> vers la corbeille.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {reservationToDelete && (reservationToDelete.amountPaid || 0) > 0 && (
            <div className="bg-destructive/10 p-4 rounded-md space-y-2 text-sm text-destructive">
              <div className="flex justify-between font-bold">
                <span>Montant à déduire de la trésorerie:</span>
                <span>-{(reservationToDelete.amountPaid || 0).toLocaleString('fr-FR')} {currencySymbol}</span>
              </div>
              <p className="text-xs opacity-90">Ce montant sera automatiquement retiré du rapport financier.</p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
