

"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Trash2, Edit, Contact, HandCoins, Loader2, Printer, MoreVertical, ClipboardList, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { syncService } from "@/lib/sync-service";
import { deletionService } from "@/lib/deletion-service";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuidv4 } from "uuid";
import React, { useEffect, useState, useCallback } from "react";
import type { Client, ActivityLogEntry } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useLoading } from "@/providers/loading-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";

const getInitials = (name?: string | null) => {
  if (name) {
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  return "CL";
};

const paymentFormSchema = z.object({
  paymentAmount: z.coerce.number().positive({ message: "Le montant du paiement doit être positif." }),
});
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const ClientCard = ({ client, onOpenPayment, onDelete, onPrint, currencySymbol, isLoading, showLoader }: { client: Client, onOpenPayment: (client: Client) => void, onDelete: (client: Client) => void, onPrint: (client: Client) => void, currencySymbol: string, isLoading: boolean, showLoader: () => void }) => {
  const totalAmount = client.totalAmount || 0;
  const amountPaid = client.amountPaid || 0;
  const remaining = totalAmount - amountPaid;
  const hasBalance = totalAmount > 0 || amountPaid > 0;
  const { isAdmin } = useAuth();

  return (
    <Card className="flex flex-col shadow-md hover:shadow-lg transition-shadow border border-border/60">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(client.name)}`} alt={client.name ?? ""} data-ai-hint="avatar person" />
              <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{client.name}</CardTitle>
              <CardDescription>{client.phoneNumber}</CardDescription>
            </div>
          </div>
          <div className="text-right flex items-center gap-2">
            <div className="flex flex-col items-end mr-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {client.createdAt ? format(new Date(client.createdAt), 'dd MMMM yyyy', { locale: fr }) : ''}
              </span>
              <span className="text-[10px] border border-border rounded px-1.5 py-0.5 text-muted-foreground font-mono">
                {client.createdAt ? format(new Date(client.createdAt), 'HH:mm', { locale: fr }) : ''}
              </span>
            </div>
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
                  <Link href={`/clients/${client.id}/edit`} onClick={showLoader}><Edit className="mr-2 h-4 w-4" />Modifier</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPrint(client)}>
                  <Printer className="mr-2 h-4 w-4" />Imprimer le Relevé
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => onDelete(client)}>
                      <Trash2 className="mr-2 h-4 w-4" />Supprimer
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 pt-2">
        {/* Contact Actions Section */}
        {client.phoneNumber && (
          <div className="flex gap-2 mb-2">
            <a
              href={`https://wa.me/${client.phoneNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 p-2 rounded-md transition-colors text-sm font-medium border border-green-200 dark:border-green-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
              WhatsApp
            </a>
            <a
              href={`tel:${client.phoneNumber}`}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 p-2 rounded-md transition-colors text-sm font-medium border border-blue-200 dark:border-blue-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              Appeler
            </a>
          </div>
        )}

        {hasBalance ? (
          <div className="text-sm space-y-3 rounded-lg bg-card border p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Total Facturé:</span>
              <span className="font-bold text-base">{totalAmount.toLocaleString('fr-FR')} {currencySymbol}</span>
            </div>
            <div className="flex justify-between items-center text-green-600">
              <span className="font-medium">Montant Payé:</span>
              <span className="font-bold text-base">{amountPaid.toLocaleString('fr-FR')} {currencySymbol}</span>
            </div>
            <Separator className="bg-border/60" />
            <div className={cn("flex justify-between items-center font-bold text-lg", remaining > 0 ? "text-red-500" : "text-muted-foreground")}>
              <span>Solde Restant:</span>
              <span>{remaining.toLocaleString('fr-FR')} {currencySymbol}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 border rounded-lg border-dashed text-muted-foreground bg-secondary/10">
            <p className="text-sm italic">Aucune transaction</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 pt-0 pb-4">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" asChild disabled={isLoading} className="h-9 w-9 border-primary/20 text-primary hover:bg-primary/10" title="Nouvelle Prestation">
            <Link href={`/reservations/new?guestName=${encodeURIComponent(client.name)}`} onClick={showLoader}>
              <ClipboardList className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild disabled={isLoading} className="h-9 w-9 border-green-600 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30" title="Nouvelle Vente Rapide">
            <Link href={`/clients/new?guestName=${encodeURIComponent(client.name)}&guestPhone=${encodeURIComponent(client.phoneNumber)}`} onClick={showLoader}>
              <ShoppingCart className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={() => onPrint(client)} disabled={isLoading} className="h-9 w-9" title="Imprimer le Relevé">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" onClick={() => onOpenPayment(client)} disabled={isLoading} className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
          <HandCoins className="mr-2 h-4 w-4" />Encaisser
        </Button>
      </CardFooter>
    </Card>
  )
};


export default function CustomersPage() {
  const { isAdmin, currentUser, businessId, loading: authLoading, getCurrencySymbol, activeWorkspaceId } = useAuth();
  const { toast } = useToast();
  const { showLoader, hideLoader, isLoading } = useLoading();
  // Removed explicit clients state, using useLiveQuery
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const { businessProfile } = useAuth();
  const currencySymbol = getCurrencySymbol();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [receiptClient, setReceiptClient] = useState<Client | null>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);

  const [deletePreview, setDeletePreview] = useState<{
    client: Client;
    reservationsCount: number;
    quickIncomesCount: number;
    totalPayments: number;
  } | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentAmount: 0,
    },
  });

  // Automatically fetch clients from local DB
  const clients = useLiveQuery(
    () => {
      if (!activeWorkspaceId) return [];
      return db.clients.where('workspaceId').equals(activeWorkspaceId).toArray();
    },
    [activeWorkspaceId]
  ) || [];

  const receiptReservations = useLiveQuery(
    () => {
      if (!receiptClient || !activeWorkspaceId) return [];
      // Assuming guestName is reliable connection. Ideally fetch by clientId if stored.
      return db.reservations.where('workspaceId').equals(activeWorkspaceId).filter(r => r.guestName === receiptClient.name).toArray();
    },
    [activeWorkspaceId, receiptClient]
  ) || [];

  // Initial Sync is handled centrally or per page if needed, but lets add it here to be safe
  useEffect(() => {
    async function init() {
      if (businessId && activeWorkspaceId) {
        // We can trigger initial sync here if strictly needed, 
        // but if dash layout does it or if we trust the global one...
        // For safety, let's call it. It's idempotent-ish.
        try {
          await syncService.initialSync(businessId, activeWorkspaceId);
        } catch (e) { console.error(e); }
      }
    }
    if (!authLoading && activeWorkspaceId) {
      init();
    }
  }, [authLoading, businessId, activeWorkspaceId]);

  useEffect(() => {
    if (!clients) return;
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = clients.filter(client =>
      !client.isDeleted &&
      (client.name?.toLowerCase().includes(lowerSearchTerm) ||
        client.email?.toLowerCase().includes(lowerSearchTerm) ||
        client.phoneNumber?.toLowerCase().includes(lowerSearchTerm))
    );
    // Sort by updated at desc
    filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const handleDeleteClient = async (client: Client) => {
    if (!currentUser?.uid || !businessId) {
      toast({ variant: "destructive", title: "Erreur", description: "Action non autorisée." });
      return;
    }
    showLoader();
    try {
      const preview = await deletionService.getClientDeletionPreview(client.id);
      if (preview) {
        setDeletePreview(preview);
        setIsDeleteConfirmOpen(true);
      } else {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de récupérer les informations du client." });
      }
    } catch (error: any) {
      console.error("Failed to prepare client deletion:", error);
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible de préparer la suppression." });
    } finally {
      hideLoader();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletePreview || !currentUser?.uid || !businessId || !currentUser.displayName || !activeWorkspaceId) return;

    showLoader();
    try {
      const result = await deletionService.deleteClient(
        deletePreview.client.id,
        businessId,
        activeWorkspaceId,
        currentUser.displayName,
        currentUser.uid
      );

      if (result.success) {
        toast({
          title: "Client supprimé",
          description: `Client supprimé avec succès. ${result.calculations.treasuryAdjustment ? `Ajustement trésorerie: ${result.calculations.treasuryAdjustment} ${currencySymbol}` : ''}`
        });
        setIsDeleteConfirmOpen(false);
        setDeletePreview(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error deleting client:", error);
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Erreur lors de la suppression." });
    } finally {
      hideLoader();
    }
  };

  const handleOpenPaymentDialog = (client: Client) => {
    setSelectedClient(client);
    paymentForm.reset();
    setIsPaymentDialogOpen(true);
  };

  const handlePrint = (client: Client) => {
    setReceiptClient(client);
    setIsReceiptDialogOpen(true);
  };

  async function onPaymentSubmit(values: PaymentFormValues) {
    if (!currentUser?.uid || !currentUser.displayName || !businessId || !selectedClient) {
      toast({ variant: "destructive", title: "Erreur", description: "Action non autorisée." });
      return;
    }

    try {
      const currentAmountPaid = selectedClient.amountPaid || 0;
      const newAmountPaid = currentAmountPaid + values.paymentAmount;
      const totalAmount = selectedClient.totalAmount || 0;

      // Allow payment even if > total? Usually no.
      if (newAmountPaid > totalAmount && totalAmount > 0) {
        // Logic check: strict or loose? Original code had a check.
        toast({ variant: "destructive", title: "Paiement excessif", description: "Le montant total payé ne peut pas dépasser le montant total de la facture." });
        return;
      }

      showLoader();

      const updatedClient: Client = {
        ...selectedClient,
        amountPaid: newAmountPaid,
        updatedAt: Date.now(),
        updatedBy: currentUser.displayName
      };

      await syncService.updateClient(updatedClient);

      toast({
        title: "Paiement enregistré",
        description: `Le paiement de ${values.paymentAmount.toLocaleString('fr-FR')} ${currencySymbol} pour ${selectedClient.name} a été enregistré.`,
      });

      setIsPaymentDialogOpen(false);
      // useLiveQuery updates automatically

    } catch (error: any) {
      console.error("Failed to add payment:", error);
      toast({ variant: "destructive", title: "Échec de l'ajout du paiement", description: error.message || "Impossible d'enregistrer le paiement." });
    } finally {
      hideLoader();
    }
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-headline font-semibold tracking-tight">Gestion des Clients</h1>
          <Button asChild>
            <Link href="/clients/new" onClick={showLoader}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un client
            </Link>
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><Contact /> Fichier Clients</CardTitle>
            <CardDescription>Consultez, modifiez et gérez les informations de vos clients.</CardDescription>
            <div className="relative pt-4">
              <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client par nom, email, téléphone..."
                className="pl-8 w-full sm:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
              </div>
            ) : filteredClients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onDelete={handleDeleteClient}
                    onOpenPayment={handleOpenPaymentDialog}
                    onPrint={handlePrint}
                    currencySymbol={currencySymbol}
                    isLoading={isLoading}
                    showLoader={showLoader}
                  />
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
                <Contact className="h-12 w-12 mb-2" />
                <p className="font-medium">Aucun client trouvé.</p>
                <p className="text-sm">Cliquez sur "Ajouter un client" pour commencer.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encaisser un paiement pour {selectedClient?.name}</DialogTitle>
            <DialogDescription>
              Saisissez le montant du nouveau versement. Le solde sera mis à jour automatiquement.
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <>
              <div className="text-sm space-y-2 rounded-md bg-secondary/50 p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Facture:</span>
                  <span className="font-medium">{(selectedClient.totalAmount || 0).toLocaleString('fr-FR')} {currencySymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Déjà Payé:</span>
                  <span className="font-medium">{(selectedClient.amountPaid || 0).toLocaleString('fr-FR')} {currencySymbol}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-muted-foreground">Solde Restant:</span>
                  <span className="text-primary">{((selectedClient.totalAmount || 0) - (selectedClient.amountPaid || 0)).toLocaleString('fr-FR')} {currencySymbol}</span>
                </div>
              </div>
              <Form {...paymentForm}>
                <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={paymentForm.control}
                    name="paymentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant du nouveau paiement ({currencySymbol})</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="Ex: 5000" {...field} autoFocus />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Annuler</Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Encaisser le paiement
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>


      {receiptClient && businessProfile && (
        <ReceiptDialog
          isOpen={isReceiptDialogOpen}
          onOpenChange={setIsReceiptDialogOpen}
          businessProfile={businessProfile}
          currencySymbol={currencySymbol}
          type="client"
          title={`Relevé de compte - ${receiptClient.name}`}
          data={{
            id: receiptClient.id,
            date: new Date(),
            customerName: receiptClient.name,
            items: receiptReservations.map(res => ({
              name: `Prestation du ${format(new Date(res.checkInDate), 'dd/MM/yyyy', { locale: fr })}`,
              description: (res.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ').substring(0, 50) + ((res.items || []).length > 1 ? '...' : ''),
              quantity: 1,
              price: res.totalAmount
            })),
            totalAmount: receiptClient.totalAmount || 0,
            amountPaid: receiptClient.amountPaid || 0,
            notes: receiptClient.notes
          }}
        />
      )}

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer {deletePreview?.client.name} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action déplacera le client vers la corbeille. Voici les conséquences :
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deletePreview && (
            <div className="bg-secondary/50 p-4 rounded-md space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Réservations à supprimer:</span>
                <span className="font-medium">{deletePreview.reservationsCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Ventes rapides à supprimer:</span>
                <span className="font-medium">{deletePreview.quickIncomesCount}</span>
              </div>
              <div className="border-t border-border/50 my-2 pt-2 flex justify-between font-bold text-destructive">
                <span>Montant total à déduire (Trésorerie):</span>
                <span>-{deletePreview.totalPayments.toLocaleString('fr-FR')} {currencySymbol}</span>
              </div>
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
