

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2, ArrowLeft, Trash2, Plus, Minus, X, CheckCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/auth-provider";
import { syncService } from "@/lib/sync-service";
import Link from "next/link";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import type { DateRange } from "react-day-picker";
import { useLoading } from "@/providers/loading-provider";
import type { ServiceType, StockItem, ReservationItem, Reservation } from '@/lib/types';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from 'uuid';
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResolvedImage } from '@/components/ui/resolved-image';
import { Separator } from "@/components/ui/separator";

import { Badge } from "@/components/ui/badge";


const reservationFormSchema = z.object({
  guestName: z.string().min(2, { message: "Le nom du client doit contenir au moins 2 caractères." }),
  guestPhone: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.coerce.number().min(1, "La quantité doit être d'au moins 1."),
    price: z.coerce.number(),
    purchasePrice: z.coerce.number().optional(),
    type: z.enum(['service', 'stock']),
  })).min(1, "Veuillez ajouter au moins un article ou service."),
  amountPaid: z.coerce.number().min(0, "Le montant payé ne peut être négatif.").default(0),
  dates: z.object({
    from: z.date({ required_error: "La date de début est requise." }),
    to: z.date({ required_error: "La date de fin est requise." }),
  }, { required_error: "Les dates d'arrivée et de départ sont requises." }),
  status: z.string({ required_error: "Veuillez sélectionner un statut." }),
  notes: z.string().optional(),
});

type ReservationFormValues = z.infer<typeof reservationFormSchema>;

const defaultServiceTypes: ServiceType[] = [
  { name: 'Service par défaut 1', price: 0 },
  { name: 'Service par défaut 2', price: 0 },
];

const statusTranslations: { [key: string]: string } = {
  pending: "En attente",
  confirmed: "Confirmée",
  "checked-in": "Effectuée/Livrée",
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
      return { singular: 'dossier patient', plural: 'dossiers patients', guestLabel: 'Nom du patient' };
    } else {
      return { singular: 'prestation', plural: 'prestations', guestLabel: 'Nom du client' };
    }
  }, [businessProfile]);
};

export default function NewReservationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentUser, businessId, personalizationSettings, workspaceSettings, getCurrencySymbol, activeWorkspaceId, businessProfile } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoading();
  const terminology = useTerminology();
  const currencySymbol = getCurrencySymbol();

  // Automatically fetch stock items from local DB
  const stockItems = useLiveQuery(
    () => {
      if (!activeWorkspaceId) return [];
      return db.stock.where('workspaceId').equals(activeWorkspaceId).toArray();
    },
    [activeWorkspaceId]
  ) || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [justAddedItemId, setJustAddedItemId] = useState<string | null>(null);

  const [manualServiceName, setManualServiceName] = useState("");
  const [manualServicePrice, setManualServicePrice] = useState("");
  const [manualServicePurchasePrice, setManualServicePurchasePrice] = useState("");

  const isPremium = businessProfile?.subscriptionType !== 'gratuit';

  const serviceTypes: ServiceType[] = useMemo(() => {
    const globalServices = personalizationSettings?.serviceTypes || [];
    const workspaceServices = workspaceSettings?.serviceTypes || [];

    // Combine and create a unique list by name
    const combined = [...globalServices, ...workspaceServices];
    const uniqueServices = Array.from(new Map(combined.map(item => [item.name, item])).values());

    return (uniqueServices.length > 0) ? uniqueServices : defaultServiceTypes;
  }, [personalizationSettings, workspaceSettings]);

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      guestName: searchParams.get('guestName') || "",
      guestPhone: searchParams.get('guestPhone') || "",
      items: [],
      amountPaid: 0,
      status: "pending",
      notes: "",
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const currentItems = form.watch('items');

  const totalAmount = useMemo(() => {
    return currentItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [currentItems]);

  const amountPaid = form.watch("amountPaid");

  const remainingBalance = useMemo(() => {
    return totalAmount - (Number(amountPaid) || 0);
  }, [totalAmount, amountPaid]);

  const filteredGlobalServices = useMemo(() => (personalizationSettings?.serviceTypes || []).filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())), [personalizationSettings, searchTerm]);
  const filteredWorkspaceServices = useMemo(() => (workspaceSettings?.serviceTypes || []).filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())), [workspaceSettings, searchTerm]);
  const filteredStockItems = useMemo(() => stockItems.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())), [stockItems, searchTerm]);


  const addItemToCart = (item: ServiceType | StockItem, type: 'service' | 'stock') => {
    const itemId = item.id || ('name' in item ? item.name : uuidv4());
    const existingItemIndex = currentItems.findIndex(i => i.id === itemId);

    if (existingItemIndex !== -1) {
      const existingItem = currentItems[existingItemIndex];
      update(existingItemIndex, { ...existingItem, quantity: existingItem.quantity + 1 });
    } else {
      append({
        id: itemId,
        name: item.name,
        quantity: 1,
        price: 'price' in item ? item.price ?? 0 : 0,
        purchasePrice: 'purchasePrice' in item ? item.purchasePrice : undefined,
        type: type,
      });
    }
    setJustAddedItemId(itemId);
    setTimeout(() => setJustAddedItemId(null), 1000);
  };

  const handleAddManualService = () => {
    const price = parseFloat(manualServicePrice);
    const purchasePrice = manualServicePurchasePrice ? parseFloat(manualServicePurchasePrice) : undefined;
    if (!manualServiceName.trim() || isNaN(price) || price < 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez entrer une description et un prix de vente valides.' });
      return;
    }
    const itemId = uuidv4();
    append({
      id: itemId,
      name: manualServiceName,
      quantity: 1,
      price: price,
      purchasePrice: purchasePrice,
      type: 'service',
    });
    setJustAddedItemId(itemId);
    setTimeout(() => setJustAddedItemId(null), 1000);
    // Reset fields
    setManualServiceName('');
    setManualServicePrice('');
    setManualServicePurchasePrice('');
  };

  const manualServiceProfit = useMemo(() => {
    const salePrice = parseFloat(manualServicePrice) || 0;
    const buyPrice = parseFloat(manualServicePurchasePrice) || 0;
    if (salePrice <= 0) return null;
    return salePrice - buyPrice;
  }, [manualServicePrice, manualServicePurchasePrice]);


  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity >= 1) {
      const item = currentItems[index];
      update(index, { ...item, quantity: newQuantity });
    }
  };

  async function onSubmit(values: ReservationFormValues) {
    if (!currentUser?.uid || !currentUser.displayName || !businessId || !activeWorkspaceId) {
      toast({ variant: "destructive", title: "Erreur", description: "Utilisateur non authentifié ou espace de travail non identifié." });
      return;
    }
    showLoader();
    try {
      const itemsForDB: ReservationItem[] = values.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        purchasePrice: item.purchasePrice ?? undefined // Ensure undefined if null/missing
      }));

      const reservationId = uuidv4();

      const newReservation: Reservation = {
        id: reservationId,
        workspaceId: activeWorkspaceId,
        businessId: businessId,
        guestName: values.guestName,
        checkInDate: values.dates.from.toISOString(),
        checkOutDate: values.dates.to.toISOString(),
        status: values.status as any,
        notes: values.notes,
        roomType: values.items.map(i => i.name).join(', '),
        numberOfGuests: 1,
        totalAmount: totalAmount,
        amountPaid: values.amountPaid,
        items: itemsForDB,
        createdBy: currentUser.displayName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
      };

      // Deduct stock for stock items
      for (const item of itemsForDB) {
        if (item.type === 'stock') {
          // Find the stock item in the *current* list (which is up to date via useLiveQuery)
          // Or better, fetch it from DB to be sure
          const stockItem = await db.stock.get(item.id);
          if (stockItem) {
            const newQuantity = stockItem.currentQuantity - item.quantity;
            const updatedStockItem: StockItem = {
              ...stockItem,
              currentQuantity: newQuantity,
              updatedAt: Date.now(),
              updatedBy: currentUser.displayName
            };
            await syncService.updateStockItem(updatedStockItem);
          }
        }
      }

      await syncService.createReservation(newReservation);

      // --- Record Profits (Margins) ---
      for (const item of itemsForDB) {
        // Calculate margin: (Sale Price - Purchase Price) * Quantity
        // If purchasePrice is undefined, we assume it's a 100% margin (common for services)
        // unless the user explicitly wants to track costs.
        const margin = (item.price - (item.purchasePrice || 0)) * item.quantity;

        if (margin !== 0) {
          const profit: Profit = {
            id: uuidv4(),
            workspaceId: activeWorkspaceId,
            businessId: businessId,
            date: newReservation.checkInDate,
            amount: margin,
            sourceType: item.type === 'service' ? 'service' : 'sale',
            relatedEntityId: newReservation.id,
            description: `Profit sur ${item.name} (${newReservation.guestName})`,
            createdBy: currentUser.displayName || 'Système',
            createdAt: Date.now()
          };
          await syncService.createProfit(profit);
        }
      }

      toast({
        title: `${terminology.singular.charAt(0).toUpperCase() + terminology.singular.slice(1)} ajoutée`,
        description: `La nouvelle ${terminology.singular} pour ${values.guestName} a été enregistrée.`,
      });
      router.push("/reservations");
    } catch (error: any) {
      console.error("Failed to add reservation:", error);
      toast({
        variant: "destructive",
        title: "Échec de l'ajout",
        description: error.message || `Impossible d'enregistrer la ${terminology.singular}.`,
      });
    } finally {
      hideLoader();
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/reservations" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-3xl font-headline font-semibold tracking-tight capitalize">Nouvelle {terminology.singular}</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Fields Column */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="capitalize">Détails de la {terminology.singular}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField control={form.control} name="guestName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="capitalize">{terminology.guestLabel}</FormLabel>
                    <FormControl><Input placeholder="Ex: Jean Dupont" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="guestPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de téléphone (Optionnel)</FormLabel>
                    <FormControl><Input type="tel" placeholder="+228 99 99 99 99" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dates" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de début et de fin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild><FormControl>
                        <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value?.from ? (field.value.to ? (<>{format(field.value.from, "LLL dd, y", { locale: fr })} - {format(field.value.to, "LLL dd, y", { locale: fr })}</>) : (format(field.value.from, "LLL dd, y", { locale: fr }))) : (<span>Choisir les dates</span>)}
                        </Button>
                      </FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={field.value?.from} selected={field.value as DateRange} onSelect={field.onChange} numberOfMonths={2} locale={fr} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un statut" /></SelectTrigger></FormControl>
                      <SelectContent>{Object.entries(statusTranslations).map(([key, value]) => (<SelectItem key={key} value={key}>{value}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes (Facultatif)</FormLabel><FormControl><Textarea placeholder="Préférences du client, etc." className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Items Selection Column */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Sélection des Articles & Services</CardTitle>
                <FormControl>
                  <Input placeholder="Rechercher un article ou service..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </FormControl>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 pr-4">
                  <div className="space-y-4">
                    {(personalizationSettings?.serviceTypes || []).length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-muted-foreground">Services Globaux</h4>
                        {filteredGlobalServices.map(service => (
                          <Button key={service.id || service.name} type="button" variant="ghost" className="w-full justify-start h-auto py-2 relative" onClick={() => addItemToCart(service, 'service')}>
                            <div>
                              <p>{service.name}</p>
                              {service.price > 0 && <p className="text-xs text-muted-foreground">{service.price.toLocaleString('fr-FR')} {currencySymbol}</p>}
                            </div>
                            {justAddedItemId === (service.id || service.name) && (
                              <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-md animate-out fade-out duration-1000">
                                <CheckCircle className="h-6 w-6 text-white" />
                              </div>
                            )}
                          </Button>
                        ))}
                        {filteredGlobalServices.length === 0 && <p className="text-xs text-muted-foreground p-2">Aucun service global trouvé.</p>}
                      </div>
                    )}

                    {(workspaceSettings?.serviceTypes || []).length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-2 text-muted-foreground">Services Spécifiques</h4>
                          {filteredWorkspaceServices.map(service => (
                            <Button key={service.id || service.name} type="button" variant="ghost" className="w-full justify-start h-auto py-2 relative" onClick={() => addItemToCart(service, 'service')}>
                              <div>
                                <p>{service.name}</p>
                                {service.price > 0 && <p className="text-xs text-muted-foreground">{service.price.toLocaleString('fr-FR')} {currencySymbol}</p>}
                              </div>
                              {justAddedItemId === (service.id || service.name) && (
                                <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-md animate-out fade-out duration-1000">
                                  <CheckCircle className="h-6 w-6 text-white" />
                                </div>
                              )}
                            </Button>
                          ))}
                          {filteredWorkspaceServices.length === 0 && <p className="text-xs text-muted-foreground p-2">Aucun service spécifique trouvé.</p>}
                        </div>
                      </>
                    )}
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2 text-muted-foreground">Articles du Stock</h4>
                      {filteredStockItems.length > 0 ? filteredStockItems.map(item => (
                        <Button key={item.id} type="button" variant="ghost" className="w-full justify-start h-auto py-2 relative" onClick={() => addItemToCart(item, 'stock')} disabled={item.currentQuantity <= 0}>
                          <div className="flex items-center gap-3 w-full">
                            {item.imageUrl ? <ResolvedImage src={item.imageUrl} alt={item.name} width={40} height={40} className="rounded-md object-cover" /> : <div className="h-10 w-10 bg-secondary rounded-md" />}
                            <div className="flex-1 text-left">
                              <p>{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.price?.toLocaleString('fr-FR')} {currencySymbol} - <span className={cn(item.currentQuantity <= item.lowStockThreshold && "text-destructive font-bold")}>Stock: {item.currentQuantity}</span></p>
                            </div>
                          </div>
                          {justAddedItemId === item.id && (
                            <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-md animate-out fade-out duration-1000">
                              <CheckCircle className="h-6 w-6 text-white" />
                            </div>
                          )}
                        </Button>
                      )) : <p className="text-xs text-muted-foreground p-2">Aucun article en stock trouvé.</p>}
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2 text-muted-foreground flex items-center gap-2">
                        Service Manuel
                        {!isPremium && <Badge variant="secondary" className="text-yellow-500 border-yellow-500">Premium</Badge>}
                      </h4>
                      <div className="space-y-2 p-2 border rounded-md">
                        <Input
                          placeholder="Description du service ou de la tâche"
                          value={manualServiceName}
                          onChange={(e) => setManualServiceName(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder={`Prix Achat (${currencySymbol})`}
                            value={manualServicePurchasePrice}
                            onChange={(e) => setManualServicePurchasePrice(e.target.value)}
                          />
                          <Input
                            type="number"
                            placeholder={`Prix Vente (${currencySymbol})`}
                            value={manualServicePrice}
                            onChange={(e) => setManualServicePrice(e.target.value)}
                          />
                        </div>
                        {manualServiceProfit !== null && (
                          <div className={cn("text-xs font-semibold text-center p-1 rounded-sm", manualServiceProfit >= 0 ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300" : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300")}>
                            Profit: {manualServiceProfit.toLocaleString('fr-FR')} {currencySymbol}
                          </div>
                        )}
                        {isPremium ? (
                          <Button type="button" onClick={handleAddManualService} className="w-full">Ajouter ce service</Button>
                        ) : (
                          <Button type="button" className="w-full" asChild>
                            <Link href="/admin/standard-subscription">
                              <Star className="mr-2 h-4 w-4" /> Passer à Premium pour ajouter
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Cart Section */}
          <Card className="shadow-lg">
            <CardHeader><CardTitle>Panier de la Prestation</CardTitle></CardHeader>
            <CardContent>
              {currentItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Le panier est vide. Sélectionnez un article ou service.</p>
              ) : (
                <div className="space-y-4">
                  {fields.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.price.toLocaleString('fr-FR')} {currencySymbol} / unité</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(index, item.quantity - 1)} disabled={item.quantity <= 1}><Minus className="h-4 w-4" /></Button>
                        <Input type="number" value={item.quantity} onChange={e => updateQuantity(index, parseInt(e.target.value, 10) || 1)} className="w-16 h-8 text-center" />
                        <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(index, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                      </div>
                      <p className="w-24 text-right font-semibold">{(item.price * item.quantity).toLocaleString('fr-FR')} {currencySymbol}</p>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><X className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <FormField control={form.control} name="amountPaid" render={({ field }) => (
                        <FormItem><FormLabel>Montant Payé ({currencySymbol})</FormLabel><FormControl><Input type="number" min="0" placeholder="Ex: 25000" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="space-y-2 text-right md:pt-8">
                      <div className="text-lg">Total: <span className="font-bold">{totalAmount.toLocaleString('fr-FR')} {currencySymbol}</span></div>
                      <div className="text-lg font-bold text-primary">Reste à payer: <span className="font-bold">{remainingBalance.toLocaleString('fr-FR')} {currencySymbol}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={showLoader}>
              <Link href="/reservations">Annuler</Link>
            </Button>
            <Button type="submit" disabled={isLoading || currentItems.length === 0}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer la {terminology.singular}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}





