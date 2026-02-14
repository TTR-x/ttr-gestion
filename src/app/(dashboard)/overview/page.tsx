

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ClipboardList, CreditCard, ShoppingCart, Users, Ban, Lightbulb, Megaphone, Gift, User, LineChart, Loader2, Package, AlertCircle, Minus, Plus, Wallet, ArrowDown, ArrowUp, CheckCircle, Store, Printer } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { ResolvedImage } from '@/components/ui/resolved-image';
import { useAuth } from "@/providers/auth-provider";
import { syncService } from "@/lib/sync-service";
import type { Reservation, Expense, ActivityLogEntry, Client, StockItem, QuickIncome } from "@/lib/types";
import { format, formatDistanceToNow, subDays, startOfMonth, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/providers/loading-provider";
import { Badge } from "@/components/ui/badge";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PromotionalBanner } from "@/components/layout/promotional-banner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';

// ... (schema definitions keep same)
const multiSellSchema = z.object({
  quantity: z.coerce.number().int().min(1, "La quantité doit être d'au moins 1."),
});
type MultiSellFormValues = z.infer<typeof multiSellSchema>;


const quickIncomeSchema = z.object({
  description: z.string().min(2, { message: "La description doit contenir au moins 2 caractères." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être un nombre positif." }),
  date: z.date({ required_error: "La date est requise." }),
});
type QuickIncomeFormValues = z.infer<typeof quickIncomeSchema>;

const expenseSchema = z.object({
  itemName: z.string().min(2, { message: "Le nom de l'article doit contenir au moins 2 caractères." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être un nombre positif." }),
  category: z.string({ required_error: "Veuillez sélectionner une catégorie." }),
  date: z.date({ required_error: "La date est requise." }),
  description: z.string().optional(),
});
type ExpenseFormValues = z.infer<typeof expenseSchema>;

const categoryTranslations: { [key: string]: string } = {
  Supplies: "Fournitures",
  "Food & Beverage": "Nourriture et boissons",
  Maintenance: "Maintenance",
  Marketing: "Marketing",
  Utilities: "Services publics",
  Other: "Autre",
};

interface Stat {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

// ... (proverbs and StatCard keep same)
const proverbs = [
  { text: "La seule façon de faire du bon travail est d'aimer ce que vous faites.", author: "Steve Jobs" },
  { text: "Le succès, c'est tomber sept fois et se relever huit.", author: "Proverbe japonais" },
  { text: "Celui qui déplace une montagne commence par emporter de petites pierres.", author: "Confucius" },
  { text: "Ne jugez pas chaque jour sur ce que vous récoltez, mais sur les graines que vous semez.", author: "Robert Louis Stevenson" },
  { text: "La patience est un arbre dont la racine est amère, mais dont les fruits sont très doux.", author: "Proverbe persan" },
  { text: "Le meilleur moment pour planter un arbre était il y a 20 ans. Le deuxième meilleur moment, c'est maintenant.", author: "Proverbe chinois" },
  { text: "Croyez en vos rêves et ils se réaliseront peut-être. Croyez en vous et ils se réaliseront sûrement.", author: "Martin Luther King" },
  { text: "Un voyage de mille lieues commence toujours par un premier pas.", author: "Lao Tseu" },
  { text: "La vie, c'est 10% ce qui vous arrive et 90% comment vous y réagissez.", author: "Charles R. Swindoll" },
  { text: "Soyez le changement que vous voulez voir dans le monde.", author: "Mahatma Gandhi" },
  { text: "L'échec est le fondement de la réussite.", author: "Lao Tseu" },
  { text: "Le savoir que l'on ne complète pas chaque jour diminue chaque jour.", author: "Proverbe chinois" },
];

const StatCard = ({ stat }: { stat: Stat }) => {
  const Icon = stat.icon;
  const cardColorClasses: { [key: string]: string } = {
    "text-blue-500": "dark:bg-blue-950/20 bg-blue-50",
    "text-orange-500": "dark:bg-orange-950/20 bg-orange-50",
    "text-green-500": "dark:bg-green-950/20 bg-green-50",
    "text-purple-500": "dark:bg-purple-950/20 bg-purple-50",
  };

  const [displayValue, setDisplayValue] = useState(stat.value);
  const [outgoingValue, setOutgoingValue] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (stat.value !== displayValue) {
      setOutgoingValue(displayValue);
      setDisplayValue(stat.value);
      setIsAnimating(true);

      const timer = setTimeout(() => {
        setIsAnimating(false);
        setOutgoingValue(null);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [stat.value, displayValue]);

  return (
    <Card className={cn("shadow-md overflow-hidden", cardColorClasses[stat.color] || 'bg-card')}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 md:p-6 md:pb-2">
        <CardTitle className="text-xs md:text-sm font-medium">{stat.title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", stat.color)} />
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-6 md:pt-0 relative overflow-hidden">
        <div className="relative">
          {/* Static Spacer to maintain container size */}
          <div className="text-lg md:text-2xl font-bold invisible select-none pointer-events-none">
            {displayValue}
          </div>

          {/* Outgoing Value Layer */}
          {isAnimating && outgoingValue && (
            <div className="absolute inset-0 text-lg md:text-2xl font-bold animate-out fade-out slide-out-to-top-4 duration-500 fill-mode-forwards">
              {outgoingValue}
            </div>
          )}

          {/* Incoming Value Layer */}
          <div className={cn(
            "absolute inset-0 text-lg md:text-2xl font-bold",
            isAnimating ? "animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards" : "opacity-100"
          )}>
            {displayValue}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DashboardOverviewPage() {
  const { currentUser, businessId, loading: authLoading, getCurrencySymbol, activeWorkspaceId, addPendingReceipt } = useAuth();
  const { showLoader, hideLoader, isLoading: isPageLoading } = useLoading();
  const [stats, setStats] = useState<Stat[]>([]);
  // remove recentActivity state, use live query
  // remove stockItems state, use live query
  const [dataLoading, setDataLoading] = useState(true); // Keep for initial load effect if needed, or rely on liveQuery undefined?
  const { toast } = useToast();

  const currencySymbol = getCurrencySymbol();

  const [multiSellItem, setMultiSellItem] = useState<StockItem | null>(null);
  const multiSellForm = useForm<MultiSellFormValues>({
    resolver: zodResolver(multiSellSchema),
    defaultValues: { quantity: 1 }
  });

  const [recentlySoldItemId, setRecentlySoldItemId] = useState<string | null>(null);
  const [lastSoldItem, setLastSoldItem] = useState<{ id: string, qty: number } | null>(null);

  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const quickIncomeForm = useForm<QuickIncomeFormValues>({
    resolver: zodResolver(quickIncomeSchema),
    defaultValues: {
      description: "",
      amount: 0,
      date: new Date(),
    },
  });

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      itemName: "",
      amount: 0,
      category: "",
      date: new Date(),
      description: "",
    },
  });

  const [currentProverb, setCurrentProverb] = useState(proverbs[0]);

  // Live Queries for Lists
  const reservations = useLiveQuery(() => activeWorkspaceId ? db.reservations.where('workspaceId').equals(activeWorkspaceId).toArray() : [], [activeWorkspaceId]) || [];
  const expenses = useLiveQuery(() => activeWorkspaceId ? db.expenses.where('workspaceId').equals(activeWorkspaceId).toArray() : [], [activeWorkspaceId]) || [];
  const stockItems = useLiveQuery(() => activeWorkspaceId ? db.stock.where('workspaceId').equals(activeWorkspaceId).toArray() : [], [activeWorkspaceId]) || [];

  // Recent Activity for List
  const recentActivity = useLiveQuery(
    async () => {
      if (!activeWorkspaceId) return [];
      const logs = await db.activityLog.where('workspaceId').equals(activeWorkspaceId).toArray();
      return logs.sort((a, b) => {
        const timeA = a.deviceTimestamp || a.timestamp || 0;
        const timeB = b.deviceTimestamp || b.timestamp || 0;
        return timeB - timeA;
      }).slice(0, 10);
    },
    [activeWorkspaceId]
  ) || [];

  // REAL-TIME STATS CALCULATION (Offline Compatible)
  const dashboardStats = useLiveQuery(async () => {
    if (!activeWorkspaceId) return null;

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).getTime();
    const startOfMonthDate = startOfMonth(now).getTime();

    // Fetch relevant logs for stats (Sales + QuickIncomes)
    // We fetch all logs for the current month to calculate month stats + today stats
    // Optimization: Filter by workspaceId and then by timestamp explicitly if possible, 
    // but Dexie filtering in memory after workspaceId index is fast enough for typical log sizes (~10k items).
    const monthLogs = await db.activityLog
      .where('workspaceId').equals(activeWorkspaceId)
      .filter(log => (log.deviceTimestamp || log.timestamp || 0) >= startOfMonthDate)
      .toArray();

    // 1. Sales Today (Stock Sales + Quick Incomes usually logged as activities)
    const todayLogs = monthLogs.filter(log => (log.deviceTimestamp || log.timestamp || 0) >= startOfDay);

    // Calculate Stock Sales
    // We need to parse 'Utilisation de stock: ItemName' and find price.
    // OR we can rely on the 'details.Montant' if we logged it (which we do in handleSell: "Montant": saleValue).
    // If 'Montant' is available in details, use it! It's much safer than looking up stock items (prices might change).

    // Helper to extract amount from log
    const getAmountFromLog = (log: ActivityLogEntry) => {
      if (log.details && log.details.Montant) {
        return Number(log.details.Montant) || 0;
      }
      // Fallback for old logs: parse quantity * current price (inaccurate if price changed)
      // We will skip fallback to avoid complex lookup dep loops, assuming new system logs Montant.
      // Actually, for "Utilisation de stock", we might not have logged Montant in older versions.
      // Let's try to look up if Montant is missing.
      return 0;
    };

    // We need to fetch ALL stock items to lookup prices if Montant is missing? 
    // We can use db.stock in this query context.
    const allStock = await db.stock.where('workspaceId').equals(activeWorkspaceId).toArray();
    const stockMap = new Map(allStock.map(i => [i.name, i.price]));

    const calculateSales = (logs: ActivityLogEntry[]) => {
      return logs.reduce((sum, log) => {
        // Check for Stock Sale or Quick Income
        if (log.action.startsWith('Utilisation de stock') || log.action.startsWith('Ajout de revenu rapide')) {
          if (log.details && log.details.Montant) {
            return sum + (Number(log.details.Montant) || 0);
          }
          // Fallback Lookup
          if (log.action.startsWith('Utilisation de stock')) {
            const match = log.action.match(/Utilisation de stock: (.*)/);
            const itemName = match ? match[1] : null;
            if (itemName && stockMap.has(itemName)) {
              const qtyStr = log.details?.Quantité || "1";
              const qty = parseInt(qtyStr) || 1;
              return sum + (stockMap.get(itemName)! * qty);
            }
          }
        }
        return sum;
      }, 0);
    };

    const salesToday = calculateSales(todayLogs);
    const salesMonth = calculateSales(monthLogs);

    const salesCountToday = todayLogs.reduce((count, log) => {
      if (log.action.startsWith('Utilisation de stock') || log.action.startsWith('Ajout de revenu rapide')) {
        const qtyStr = log.details?.Quantité || "1";
        const qty = parseInt(qtyStr) || 1;
        return count + qty;
      }
      return count;
    }, 0);

    // 2. Expenses (Total or Month?)
    // Original code: "Dépenses Totales" = sum of ALL expenses.
    // Let's keep it consistent.
    const allExpenses = await db.expenses.where('workspaceId').equals(activeWorkspaceId).toArray();
    const totalExpenses = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // 3. Arrivals Today
    const todayArrivals = await db.reservations
      .where('workspaceId').equals(activeWorkspaceId)
      .filter(r => {
        const checkIn = new Date(r.checkInDate).setHours(0, 0, 0, 0);
        return checkIn === startOfDay && r.status !== 'cancelled';
      })
      .count();

    return {
      salesToday,
      salesCountToday,
      salesMonth,
      totalExpenses,
      todayArrivals
    };

  }, [activeWorkspaceId]); // Re-run if workspace changes. LiveQuery handles DB updates automatically.

  const [flashSale, setFlashSale] = useState<string | null>(null);
  const [showSalesCount, setShowSalesCount] = useState(false);
  const prevSalesTodayRef = useRef(0);

  // Toggle Sales Display Mode
  useEffect(() => {
    const interval = setInterval(() => {
      setShowSalesCount(prev => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Stats Calculation and Animation
  useEffect(() => {
    if (!dashboardStats) return;

    // Detect new sale for animation
    if (dashboardStats.salesToday > prevSalesTodayRef.current && prevSalesTodayRef.current > 0) {
      const diff = dashboardStats.salesToday - prevSalesTodayRef.current;
      setFlashSale(`+ ${diff.toLocaleString('fr-FR')} ${currencySymbol}`);
      setTimeout(() => setFlashSale(null), 3000);
    }
    prevSalesTodayRef.current = dashboardStats.salesToday;

    const calculatedStats: Stat[] = [
      { title: "Ventes du Mois", value: `${dashboardStats.salesMonth.toLocaleString('fr-FR')} ${currencySymbol}`, icon: CreditCard, color: "text-blue-500" },
      { title: "Dépenses Totales", value: `${dashboardStats.totalExpenses.toLocaleString('fr-FR')} ${currencySymbol}`, icon: CreditCard, color: "text-orange-500" },
      {
        title: "Ventes du Jour",
        value: flashSale
          ? flashSale
          : (showSalesCount ? `${dashboardStats.salesCountToday} ventes` : `${dashboardStats.salesToday.toLocaleString('fr-FR')} ${currencySymbol}`),
        icon: ShoppingCart,
        color: flashSale
          ? "text-green-600 animate-pulse scale-110 transition-transform duration-300"
          : "text-green-500 transition-all duration-500"
      },
      { title: "Arrivées du Jour", value: dashboardStats.todayArrivals.toString(), icon: ClipboardList, color: "text-purple-500" },
    ];

    setStats(calculatedStats);
    setDataLoading(false);

  }, [dashboardStats, currencySymbol, flashSale, showSalesCount]);


  const handleSell = async (item: StockItem, quantity = 1) => {
    if (!businessId || !currentUser || !activeWorkspaceId) return;

    // --- UI Feedback ---
    setRecentlySoldItemId(item.id);
    setTimeout(() => setRecentlySoldItemId(null), 3000);
    setLastSoldItem({ id: item.id, qty: quantity });
    setTimeout(() => setLastSoldItem(null), 10000);

    const saleValue = (item.price || 0) * quantity;

    // --- Database Operations ---
    try {
      // 1. Update Stock
      const updatedItem: StockItem = {
        ...item,
        currentQuantity: item.currentQuantity - quantity,
        updatedAt: Date.now(),
        updatedBy: currentUser.displayName || 'Unknown'
      };
      await syncService.updateStockItem(updatedItem);

      // 2. Add Quick Income & Profit
      if (item.price && item.price > 0) {
        const income: QuickIncome = {
          id: uuidv4(),
          workspaceId: activeWorkspaceId,
          businessId: businessId,
          description: `Vente: ${quantity} x ${item.name}`,
          amount: saleValue,
          purchasePrice: item.purchasePrice ? (item.purchasePrice * quantity) : undefined,
          date: new Date().toISOString(),
          createdBy: currentUser.displayName || 'Système',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isDeleted: false
        };
        await syncService.createQuickIncome(income);

        // Record Profit (Margin)
        if (item.purchasePrice !== undefined) {
          const profitAmount = (item.price - item.purchasePrice) * quantity;
          const profit: Profit = {
            id: uuidv4(),
            workspaceId: activeWorkspaceId,
            businessId: businessId,
            date: income.date,
            amount: profitAmount,
            sourceType: 'sale',
            relatedEntityId: income.id,
            description: `Marge sur vente: ${quantity} x ${item.name}`,
            createdBy: currentUser.displayName || 'Système',
            createdAt: Date.now()
          };
          await syncService.createProfit(profit);
        }
      }

      // 3. Log Activity
      await syncService.createActivityLog({
        action: `Utilisation de stock: ${item.name}`,
        actorDisplayName: currentUser.displayName || 'Moi',
        actorUid: currentUser.uid,
        workspaceId: activeWorkspaceId,
        businessId: businessId,
        details: { Quantité: `${quantity} ${item.unit}`, Montant: saleValue }
      });

      // 4. Receipt
      // Prepare receipt data
      setReceiptData({
        id: uuidv4(), // Ephemeral ID for receipt
        date: new Date(),
        customerName: "Client de Passage",
        items: [{
          name: item.name,
          description: item.name,
          quantity: quantity,
          price: item.price
        }],
        totalAmount: saleValue,
        amountPaid: saleValue
      });
      // Don't auto-open, let user click the printer icon if they want? 
      // User said "sa prend trop de temps". Auto-open might be annoying if every sale pops up.
      // But the previous flow was: Click Sell -> Printer Icon Appears -> User clicks Link -> New Tab.
      // So I should keep "Click Printer Icon -> Open Modal".

      addPendingReceipt({ type: 'sale', description: `${quantity} x ${item.name}`, amount: saleValue });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Vente échouée",
        description: error.message || "Impossible de mettre à jour le stock ou les revenus.",
      });
    }
  };

  const onMultiSellSubmit = async (values: MultiSellFormValues) => {
    if (!multiSellItem) return;
    const itemToSell = multiSellItem;
    setMultiSellItem(null);
    await handleSell(itemToSell, values.quantity);
    toast({
      title: "Vente multiple enregistrée !",
      description: `${values.quantity} x ${itemToSell.name} vendu(s).`,
    });
  };

  const handleMultiSellOpen = (item: StockItem) => {
    setMultiSellItem(item);
    multiSellForm.reset({ quantity: 1 });
  }

  async function onIncomeSubmit(values: QuickIncomeFormValues) {
    if (!currentUser?.uid || !currentUser.displayName || !businessId || !activeWorkspaceId) return;
    showLoader();
    try {
      const income: QuickIncome = {
        id: uuidv4(),
        workspaceId: activeWorkspaceId,
        businessId: businessId,
        description: values.description,
        amount: values.amount,
        purchasePrice: (values as any).purchasePrice, // Cast to any to handle potential form value
        date: values.date.toISOString(),
        createdBy: currentUser.displayName || 'Système',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
      };
      await syncService.createQuickIncome(income);

      // Record Profit if purchasePrice is provided
      const margin = income.purchasePrice !== undefined ? (income.amount - income.purchasePrice) : income.amount;
      // If purchasePrice is 0 or provided, we use the margin. If it's undefined, we assume 100% profit (or user didn't care).
      // But the user said "marge", so if they don't provide purchasePrice, maybe we don't record a profit entry?
      // No, usually Income = Profit if no expense is linked.

      const profit: Profit = {
        id: uuidv4(),
        workspaceId: activeWorkspaceId,
        businessId: businessId,
        date: income.date,
        amount: margin,
        sourceType: 'quickIncome',
        relatedEntityId: income.id,
        description: `Profit sur: ${values.description}`,
        createdBy: currentUser.displayName || 'Système',
        createdAt: Date.now()
      };
      await syncService.createProfit(profit);


      // Log activity
      await syncService.createActivityLog({
        action: `Ajout de revenu rapide: ${values.description}`,
        actorDisplayName: currentUser.displayName || 'Moi',
        actorUid: currentUser.uid,
        workspaceId: activeWorkspaceId,
        businessId: businessId,
        details: { Montant: values.amount, Description: values.description }
      });

      toast({ title: "Revenu ajouté", description: "Le nouveau revenu a été enregistré." });
      addPendingReceipt({ type: 'income', description: values.description, amount: values.amount });
      setIsIncomeDialogOpen(false);
      quickIncomeForm.reset({ description: '', amount: 0, date: new Date() });

    } catch (error: any) {
      toast({ variant: "destructive", title: "Échec", description: error.message || "Impossible d'enregistrer le revenu." });
    } finally {
      hideLoader();
    }
  }

  const onExpenseSubmit = async (values: ExpenseFormValues) => {
    if (!currentUser?.uid || !currentUser.displayName || !businessId || !activeWorkspaceId) {
      toast({ variant: "destructive", title: "Erreur", description: "Action non autorisée." });
      return;
    }
    showLoader();
    try {
      const expense: Expense = {
        id: uuidv4(),
        workspaceId: activeWorkspaceId,
        businessId: businessId,
        ...values,
        date: values.date.toISOString(),
        createdBy: currentUser.displayName || 'Système',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      // syncService.createExpense assumption: it takes Expense object.
      // previous step said createExpense exists.
      await syncService.createExpense(expense);

      // Log activity
      await syncService.createActivityLog({
        action: `Ajout de dépense: ${values.itemName}`,
        actorDisplayName: currentUser.displayName || 'Moi',
        actorUid: currentUser.uid,
        workspaceId: activeWorkspaceId,
        businessId: businessId,
        details: { Montant: values.amount, Catégorie: categoryTranslations[values.category] || values.category }
      });

      toast({ title: "Dépense ajoutée", description: "La nouvelle dépense a été enregistrée." });
      addPendingReceipt({ type: 'expense', description: values.itemName, amount: values.amount });
      setIsExpenseDialogOpen(false);
      expenseForm.reset();

    } catch (error: any) {
      toast({ variant: "destructive", title: "Échec de l'ajout", description: error.message });
    } finally {
      hideLoader();
    }
  }

  const loadingSkeleton = (
    [...Array(4)].map((_, index) => (
      <Card key={index}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-6 rounded-sm" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    ))
  );

  const sellableItems = useMemo(() => stockItems.filter(item => item.isForSale), [stockItems]);

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && setMultiSellItem(null)}>
      {/* Quick Sale Notification */}
      {lastSoldItem && (
        <div className="fixed top-4 right-4 sm:top-auto sm:bottom-4 z-[100] animate-in slide-in-from-top-5 sm:slide-in-from-bottom-5 fade-in duration-500">
          <Card className="shadow-2xl border-2 border-green-500 bg-green-50 dark:bg-green-950">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-green-500 rounded-full p-2">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">Vente enregistrée !</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {stockItems.find(item => item.id === lastSoldItem.id)?.name} × {lastSoldItem.qty}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="space-y-6 w-full max-w-7xl mx-auto px-2 sm:px-0">
        <PromotionalBanner />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-semibold tracking-tight">Bonjour, {currentUser?.displayName || "..."} !</h1>
            <p className="text-muted-foreground">Voici l'aperçu de votre activité.</p>
          </div>
          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full sm:w-auto">
            <Button asChild size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
              <Link href="/publicity" onClick={showLoader}>
                <Megaphone className="h-4 w-4 mr-1.5 md:mr-2" />
                <span className="md:hidden">PUB</span>
                <span className="hidden md:inline">Faire une PUB</span>
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/clients/new" onClick={showLoader}>
                <User className="h-4 w-4 mr-1.5 md:mr-2" />
                <span className="md:hidden">+ Client</span>
                <span className="hidden md:inline">Nouveau Client</span>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/reservations/new" onClick={showLoader}>
                <PlusCircle className="h-4 w-4 mr-1.5 md:mr-2" />
                <span className="md:hidden">Presta</span>
                <span className="hidden md:inline">Nouvelle prestation</span>
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="md:hidden">
              <Link href="/stock" onClick={showLoader}>
                <Package className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Card className="shadow-lg bg-gradient-to-r from-blue-600 via-primary to-indigo-600 text-white animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="font-headline flex items-center gap-2 text-lg">
              <Store className="h-5 w-5" /> My PME zone arrive bientôt !
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm">
              L'extension e-commerce pour TTR Gestion sera bientôt disponible. Vendez vos produits en ligne et permettez aux clients de vous trouver à proximité.
            </p>
            <p className="mt-2 text-primary-foreground/80 font-semibold text-xs">
              Gratuit pour tous les utilisateurs de TTR Gestion.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {dataLoading ? loadingSkeleton : (
            stats.map((stat, index) => stat && (
              <StatCard key={stat.title + index} stat={stat} />
            ))
          )}
        </div>

        <Card className="shadow-lg bg-secondary/20">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="font-headline flex items-center gap-2 text-sm md:text-base">
              <Lightbulb className="h-4 w-4 md:h-6 md:w-6 text-yellow-400" /> Conseil du Jour
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <blockquote className="border-l-4 border-primary pl-3 md:pl-4 italic text-foreground/80 text-xs md:text-base">
              {currentProverb.text}
            </blockquote>
            <p className="text-right mt-2 font-medium text-[10px] md:text-sm text-primary">
              - {currentProverb.author}
            </p>
          </CardContent>
        </Card>

        <Card id="vente-rapide" className="shadow-lg scroll-mt-32">
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <CardTitle className="font-headline">Vente & Transactions Rapides</CardTitle>
                <CardDescription>Enregistrez rapidement des ventes, revenus ou dépenses.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white">
                      <ArrowUp className="mr-2 h-4 w-4" /> Cash In
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un Revenu Rapide</DialogTitle>
                      <DialogDescription>
                        Pour les ventes au comptoir ou les entrées d'argent non liées à un client spécifique.
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
                                <Input placeholder="Ex: Vente 2 boissons" {...field} autoFocus />
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
                                <Input type="number" placeholder="Ex: 1500" {...field} />
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
                          <Button type="submit" disabled={isPageLoading}>
                            {isPageLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enregistrer le revenu
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <ArrowDown className="mr-2 h-4 w-4" /> Cash Out
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une Dépense</DialogTitle>
                      <DialogDescription>
                        Pour les achats ou sorties d'argent non liées à un client spécifique.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...expenseForm}>
                      <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4">
                        <FormField
                          control={expenseForm.control}
                          name="itemName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Achat de fournitures" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={expenseForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Montant ({currencySymbol})</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" placeholder="Ex: 2000" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={expenseForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Catégorie</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une catégorie" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="supplies">Fournitures</SelectItem>
                                  <SelectItem value="utilities">Services publics</SelectItem>
                                  <SelectItem value="rent">Loyer</SelectItem>
                                  <SelectItem value="salaries">Salaires</SelectItem>
                                  <SelectItem value="marketing">Marketing</SelectItem>
                                  <SelectItem value="transport">Transport</SelectItem>
                                  <SelectItem value="other">Autre</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={expenseForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Date</FormLabel>
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
                          <Button type="submit" disabled={isPageLoading}>
                            {isPageLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enregistrer la dépense
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                <Link href="/stock/new" onClick={showLoader}>
                  <Button size="icon" variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white">
                    <Package className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : sellableItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-4">
                {sellableItems.map(item => (
                  <div key={item.id} className="rounded-lg overflow-hidden relative group aspect-square border-2 border-slate-200 dark:border-slate-800 bg-secondary/20 shadow-sm">
                    <ResolvedImage
                      src={item.imageUrl || "https://placehold.co/300x300.png"}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      data-ai-hint="product item"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {recentlySoldItemId === item.id && (
                      <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center animate-out fade-out duration-1000 z-10 pointer-events-none">
                        <CheckCircle className="h-10 w-10 text-white" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "absolute top-1 left-1 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300 cursor-pointer hover:bg-background z-10",
                        lastSoldItem?.id === item.id ? "opacity-100 animate-pulse" : "opacity-0 pointer-events-none"
                      )}
                      onClick={() => setIsReceiptOpen(true)}
                    >
                      <Printer className="h-4 w-4 text-primary" />
                    </div>
                    <div className="absolute top-1 right-1 flex flex-col items-end gap-1 z-10">
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-[10px] px-2 h-5 w-auto">
                        Restant : {item.currentQuantity}
                      </Badge>
                      {item.currentQuantity <= item.lowStockThreshold && (
                        <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full">
                          <AlertCircle className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    <div className="p-2 flex flex-col justify-end items-start bg-gradient-to-t from-black/90 via-black/60 to-transparent absolute inset-x-0 bottom-0 pt-6">
                      <p className="font-semibold text-white text-shadow-sm shadow-black line-clamp-1 text-xs w-full truncate">{item.name}</p>
                      <div className="flex gap-1 w-full mt-1">
                        <Button size="sm" className="flex-1 h-7 text-[10px] px-1" onClick={() => handleSell(item, 1)} disabled={item.currentQuantity <= 0}>
                          Vendre
                        </Button>
                        <DialogTrigger asChild>
                          <Button size="icon" className="h-7 w-7 bg-yellow-500 hover:bg-yellow-600 text-black shrink-0" onClick={() => handleMultiSellOpen(item)} disabled={item.currentQuantity <= 0}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <Package className="mx-auto h-12 w-12 mb-2" />
                <p className="font-semibold">Aucun article à vendre.</p>
                <Button size="sm" variant="link" asChild>
                  <Link href="/stock/new" onClick={showLoader}>Ajoutez un article et marquez-le comme "à vendre"</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card >

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
              </div>
            ) : recentActivity.length > 0 ? (
              <ul className="space-y-3">
                {recentActivity.map((activity) => (
                  <li key={activity.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">Par {activity.actorDisplayName}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(activity.deviceTimestamp || activity.timestamp) ? formatDistanceToNow(new Date(activity.deviceTimestamp || activity.timestamp!), { addSuffix: true, locale: fr }) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Ban className="mx-auto h-12 w-12 mb-2" />
                <p>Aucune activité récente à afficher.</p>
              </div>
            )}
            <Button variant="link" className="mt-4 p-0 h-auto" asChild>
              <Link href="/activity-log" onClick={showLoader}>Voir toute l'activité &rarr;</Link>
            </Button>
          </CardContent>
        </Card>
      </div >

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vente Rapide Multiple</DialogTitle>
          <DialogDescription>
            Confirmez la quantité pour la vente de "{multiSellItem?.name}".
            (Prix unitaire : {multiSellItem?.price?.toLocaleString('fr-FR')} {currencySymbol})
          </DialogDescription>
        </DialogHeader>
        <Form {...multiSellForm}>
          <form onSubmit={multiSellForm.handleSubmit(onMultiSellSubmit)} className="space-y-4 py-4">
            <FormField
              control={multiSellForm.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantité</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max={multiSellItem?.currentQuantity}
                      placeholder="Saisir la quantité"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">
                Vendre ({((multiSellItem?.price || 0) * (multiSellForm.watch('quantity') || 0)).toLocaleString('fr-FR')} {currencySymbol})
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog >
  );
}





