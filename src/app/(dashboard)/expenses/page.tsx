
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Trash2, Edit, Wallet, Printer, Package, User, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { syncService } from "@/lib/sync-service";
import { deletionService } from "@/lib/deletion-service";
import { v4 as uuidv4 } from "uuid";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import type { Expense, Reservation, QuickIncome, ReservationItem } from "@/lib/types";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";
import { format, parseISO } from "date-fns";
import { fr } from 'date-fns/locale';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { useLoading } from "@/providers/loading-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Transaction = (Expense & { type: 'expense' }) | (QuickIncome & { type: 'income' });
type Sale = {
  id: string;
  date: string;
  itemName: string;
  quantity: number;
  totalPrice: number;
  clientName: string;
  sourceReservationId?: string;
  createdBy: string;
};


const categoryTranslations: { [key: string]: string } = {
  Supplies: "Fournitures",
  "Food & Beverage": "Nourriture et boissons",
  Maintenance: "Maintenance",
  Marketing: "Marketing",
  Utilities: "Services publics",
  Other: "Autre",
};

const quickIncomeSchema = z.object({
  description: z.string().min(2, { message: "La description doit contenir au moins 2 caractères." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être un nombre positif." }),
  date: z.date({ required_error: "La date est requise." }),
});
type QuickIncomeFormValues = z.infer<typeof quickIncomeSchema>;


export default function TreasuryPage() {
  const { isAdmin, currentUser, businessId, loading: authLoading, getCurrencySymbol, activeWorkspaceId, businessProfile } = useAuth();
  const { toast } = useToast();
  const { showLoader, hideLoader, isLoading } = useLoading();
  const [transactionSearchTerm, setTransactionSearchTerm] = useState("");
  const [salesSearchTerm, setSalesSearchTerm] = useState("");
  const currencySymbol = getCurrencySymbol();

  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptType, setReceiptType] = useState<'expense' | 'income'>('expense');

  const quickIncomeForm = useForm<QuickIncomeFormValues>({
    resolver: zodResolver(quickIncomeSchema),
    defaultValues: {
      description: "",
      amount: 0,
      date: new Date(),
    },
  });

  // Fetch Data Live from Dexie
  const expenses = useLiveQuery(() => {
    if (!activeWorkspaceId) return [];
    return db.expenses.where('workspaceId').equals(activeWorkspaceId).reverse().toArray();
  }, [activeWorkspaceId]) || [];

  const reservations = useLiveQuery(() => {
    if (!activeWorkspaceId) return [];
    return db.reservations.where('workspaceId').equals(activeWorkspaceId).reverse().toArray();
  }, [activeWorkspaceId]) || [];

  const quickIncomes = useLiveQuery(() => {
    if (!activeWorkspaceId) return [];
    return db.quickIncomes.where('workspaceId').equals(activeWorkspaceId).reverse().toArray();
  }, [activeWorkspaceId]) || [];


  // Computed Data
  const unifiedTransactions = useMemo(() => {
    const exp = expenses.map(e => ({ ...e, type: 'expense' as const }));
    const inc = quickIncomes.map(i => ({ ...i, type: 'income' as const }));
    return [...exp, ...inc].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [expenses, quickIncomes]);

  const salesHistory = useMemo(() => {
    const sales: Sale[] = [];
    const salesFromQuickIncomes = quickIncomes.filter(i => i.description.startsWith('Vente:'));

    reservations.forEach(reservation => {
      (reservation.items || []).filter(item => item.type === 'stock').forEach((item: ReservationItem) => {
        sales.push({
          id: `${reservation.id}-${item.id}`,
          date: reservation.checkOutDate,
          itemName: item.name,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
          clientName: reservation.guestName,
          sourceReservationId: reservation.id,
          createdBy: reservation.createdBy,
        });
      });
    });

    salesFromQuickIncomes.forEach(income => {
      const match = income.description.match(/Vente: (\d+) x (.*)/);
      if (match) {
        sales.push({
          id: income.id,
          date: income.date,
          itemName: match[2],
          quantity: parseInt(match[1], 10),
          totalPrice: income.amount,
          clientName: 'Client de Passage',
          createdBy: income.createdBy,
        });
      }
    });

    return sales.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [reservations, quickIncomes]);

  const caisse = useMemo(() => {
    const totalReservationIncome = reservations.filter(r => r.status !== 'cancelled').reduce((sum, res) => sum + (res.amountPaid || 0), 0);
    const totalQuickIncome = quickIncomes.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    return totalReservationIncome + totalQuickIncome - totalExpenses;
  }, [reservations, quickIncomes, expenses]);


  const filteredTransactions = useMemo(() => {
    const lowerSearchTerm = transactionSearchTerm.toLowerCase();
    return unifiedTransactions.filter(transaction =>
      !transaction.isDeleted &&
      ((transaction.type === 'expense' && transaction.itemName.toLowerCase().includes(lowerSearchTerm)) ||
        transaction.description?.toLowerCase().includes(lowerSearchTerm) ||
        (transaction.type === 'expense' && transaction.category?.toLowerCase().includes(lowerSearchTerm)) ||
        transaction.createdBy?.toLowerCase().includes(lowerSearchTerm)
      )
    );
  }, [transactionSearchTerm, unifiedTransactions]);

  const filteredSales = useMemo(() => {
    const lowerSearchTerm = salesSearchTerm.toLowerCase();
    return salesHistory.filter(sale =>
      sale.itemName.toLowerCase().includes(lowerSearchTerm) ||
      sale.clientName.toLowerCase().includes(lowerSearchTerm) ||
      sale.createdBy.toLowerCase().includes(lowerSearchTerm)
    );
  }, [salesSearchTerm, salesHistory]);


  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!currentUser?.uid || !businessId || !activeWorkspaceId) {
      toast({ variant: "destructive", title: "Action non autorisée", description: "Veuillez contactez votre administrateur." });
      return;
    }
    setTransactionToDelete(transaction);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete || !currentUser?.uid || !businessId || !currentUser.displayName || !activeWorkspaceId) return;

    showLoader();
    try {
      let result;
      if (transactionToDelete.type === 'expense') {
        result = await deletionService.deleteExpense(
          transactionToDelete.id,
          businessId,
          activeWorkspaceId,
          currentUser.displayName,
          currentUser.uid
        );
      } else {
        result = await deletionService.deleteQuickIncome(
          transactionToDelete.id,
          businessId,
          activeWorkspaceId,
          currentUser.displayName,
          currentUser.uid
        );
      }

      if (result.success) {
        toast({
          title: "Transaction supprimée",
          description: `Déplacée vers la corbeille. ${result.calculations.treasuryAdjustment ? `Ajustement trésorerie: ${result.calculations.treasuryAdjustment} ${currencySymbol}` : ''}`
        });
        setIsDeleteConfirmOpen(false);
        setTransactionToDelete(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Failed to delete transaction:", error);
      toast({ variant: "destructive", title: "Échec de la suppression", description: error.message || "Impossible de supprimer la transaction." });
    } finally {
      hideLoader();
    }
  };

  async function onIncomeSubmit(values: QuickIncomeFormValues) {
    if (!currentUser?.uid || !currentUser.displayName || !businessId || !activeWorkspaceId) return;
    showLoader();
    try {
      const newIncome: QuickIncome = {
        id: uuidv4(),
        workspaceId: activeWorkspaceId,
        businessId: businessId,
        description: values.description,
        amount: values.amount,
        date: values.date.toISOString(),
        createdBy: currentUser.displayName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
      };

      await syncService.createQuickIncome(newIncome);

      toast({ title: "Revenu ajouté", description: "Le nouveau revenu a été enregistré." });
      setIsIncomeDialogOpen(false);
      quickIncomeForm.reset({ description: '', amount: 0, date: new Date() });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Échec", description: error.message || "Impossible d'enregistrer le revenu." });
    } finally {
      hideLoader();
    }
  }

  const handlePrint = (id: string, type: 'expense' | 'income') => {
    const transaction = unifiedTransactions.find(t => t.id === id);
    if (!transaction) return;

    setReceiptType(type);
    setReceiptData({
      id: transaction.id,
      date: new Date(transaction.date),
      customerName: type === 'expense' ? businessProfile?.name : transaction.createdBy,
      items: [{
        name: type === 'expense' ? (transaction as any).itemName : (transaction as any).description,
        description: type === 'expense' ? (transaction as any).category : 'Revenu',
        quantity: 1,
        price: transaction.amount
      }],
      totalAmount: transaction.amount,
      amountPaid: transaction.amount,
      notes: (transaction as any).description
    });
    setIsReceiptOpen(true);
  };

  const handlePrintSale = (sale: Sale) => {
    setReceiptType('income'); // Sales are income
    const unitPrice = sale.quantity > 0 ? sale.totalPrice / sale.quantity : 0;

    setReceiptData({
      id: sale.id,
      date: new Date(sale.date), // UnifiedTransactions uses 'date' string
      customerName: sale.clientName,
      items: [{
        name: sale.itemName,
        description: "Vente Article",
        quantity: sale.quantity,
        price: unitPrice
      }],
      totalAmount: sale.totalPrice,
      amountPaid: sale.totalPrice,
      notes: "Vente depuis l'historique"
    });
    setIsReceiptOpen(true);
  };

  return (
    <>
      <div className="space-y-8">
        <Card className="shadow-lg bg-gradient-to-br from-primary/10 to-accent/10">
          <CardHeader>
            <CardTitle className="text-sm font-medium tracking-wider uppercase text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Caisse Principale
            </CardTitle>
            <CardDescription>Solde actuel (Paiements Prestations + Revenus rapides - Dépenses).</CardDescription>
          </CardHeader>
          <CardContent>
            {caisse !== null ? (
              <div className="flex items-baseline gap-4">
                <p className="text-4xl font-bold tracking-tight">
                  {caisse.toLocaleString('fr-FR')} {currencySymbol}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Calcul en cours...</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-headline font-semibold tracking-tight">Gestion de la Trésorerie</h1>
          <div className="flex gap-2">
            <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="bg-green-600 hover:bg-green-700 text-primary-foreground">
                  <ArrowUp className="mr-2 h-4 w-4" /> Ajouter un revenu rapide
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un Revenu Rapide</DialogTitle>
                  <DialogDescription>
                    Pour les entrées d'argent non liées à une prestation ou à un client spécifique.
                  </DialogDescription>
                </DialogHeader>
                <Form {...quickIncomeForm}>
                  <form onSubmit={quickIncomeForm.handleSubmit(onIncomeSubmit)} className="space-y-4 py-4">
                    <FormField
                      control={quickIncomeForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Apport personnel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={quickIncomeForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Montant ({currencySymbol})</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Ex: 50000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={quickIncomeForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date de la transaction</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                  {field.value ? format(field.value, "PPP", { locale: fr }) : (<span>Choisir une date</span>)}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer le revenu
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            <Button asChild>
              <Link href="/expenses/new" onClick={showLoader}>
                <ArrowDown className="mr-2 h-4 w-4" /> Ajouter une dépense
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="transactions">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">Journal des Transactions</TabsTrigger>
            <TabsTrigger value="sales">Historique des Ventes</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline">Journal des Transactions</CardTitle>
                <CardDescription>Visualisez les entrées et sorties d'argent générales (hors ventes d'articles).</CardDescription>
                <div className="relative pt-4">
                  <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une transaction..."
                    className="pl-8 w-full sm:w-[400px]"
                    value={transactionSearchTerm}
                    onChange={(e) => setTransactionSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Enregistré par</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.type === 'expense' ? transaction.itemName : transaction.description}</TableCell>
                          <TableCell className={cn("font-semibold", transaction.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                            {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString('fr-FR')} {currencySymbol}
                          </TableCell>
                          <TableCell>
                            {transaction.type === 'expense' ? (
                              <Badge variant="secondary">{categoryTranslations[transaction.category] || transaction.category}</Badge>
                            ) : (
                              <Badge variant="outline">Revenu</Badge>
                            )}
                          </TableCell>
                          <TableCell>{transaction.date ? new Date(transaction.date).toLocaleDateString('fr-FR') : 'N/A'}</TableCell>
                          <TableCell>{transaction.createdBy}</TableCell>
                          <TableCell className="text-right space-x-0">
                            <Button variant="ghost" size="icon" onClick={() => handlePrint(transaction.id, transaction.type)} aria-label="Imprimer le reçu" disabled={isLoading}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            {transaction.type === 'expense' && (
                              <Button variant="ghost" size="icon" asChild aria-label="Modifier la dépense" disabled={isLoading}>
                                <Link href={`/expenses/${transaction.id}/edit`} onClick={showLoader}><Edit className="h-4 w-4" /></Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              aria-label="Supprimer la transaction"
                              disabled={!isAdmin || isLoading}
                              onClick={() => handleDeleteTransaction(transaction)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Aucune dépense ou revenu rapide trouvé.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="sales">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline">Historique des Ventes d'Articles</CardTitle>
                <CardDescription>Suivez chaque article vendu depuis le stock, et à qui.</CardDescription>
                <div className="relative pt-4">
                  <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une vente..."
                    className="pl-8 w-full sm:w-[400px]"
                    value={salesSearchTerm}
                    onChange={(e) => setSalesSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Montant Total</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Enregistré par</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length > 0 ? (
                      filteredSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />{sale.itemName}</TableCell>
                          <TableCell><span className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{sale.clientName}</span></TableCell>
                          <TableCell className="font-bold">{sale.quantity}</TableCell>
                          <TableCell>{sale.totalPrice.toLocaleString('fr-FR')} {currencySymbol}</TableCell>
                          <TableCell>{format(parseISO(sale.date), 'dd MMMM yyyy', { locale: fr })}</TableCell>
                          <TableCell>{sale.createdBy}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handlePrintSale(sale)} title="Imprimer Reçu">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Aucune vente d'article du stock enregistrée.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>

      {receiptData && businessProfile && (
        <ReceiptDialog
          isOpen={isReceiptOpen}
          onOpenChange={setIsReceiptOpen}
          businessProfile={businessProfile}
          currencySymbol={currencySymbol}
          type={receiptType}
          title={receiptType === 'expense' ? "Reçu de Dépense" : "Reçu de Revenu"}
          data={receiptData}
        />
      )}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer la transaction ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer <strong>{transactionToDelete?.type === 'expense' ? transactionToDelete.itemName : transactionToDelete?.description}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {transactionToDelete && (
            <div className="bg-destructive/10 p-4 rounded-md space-y-2 text-sm text-destructive">
              <div className="flex justify-between font-bold">
                <span>Impact sur la trésorerie:</span>
                <span>
                  {transactionToDelete.type === 'expense' ? '+' : '-'}
                  {(transactionToDelete.amount).toLocaleString('fr-FR')} {currencySymbol}
                </span>
              </div>
              <p className="text-xs opacity-90">
                {transactionToDelete.type === 'expense'
                  ? "Ce montant sera restitué à la caisse."
                  : "Ce montant sera retiré de la caisse."}
              </p>
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



