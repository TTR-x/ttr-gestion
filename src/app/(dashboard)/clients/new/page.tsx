

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, X, CheckCircle, Plus, Minus, ShoppingCart, Star } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/auth-provider";
import { syncService } from "@/lib/sync-service";
import Link from "next/link";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useLoading } from "@/providers/loading-provider";
import type { ServiceType, StockItem, Client, Reservation, ReservationItem } from '@/lib/types';
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResolvedImage } from '@/components/ui/resolved-image';
import { Separator } from "@/components/ui/separator";
import { v4 as uuidv4 } from 'uuid';
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

const clientWithItemsSchema = z.object({
  name: z.string().min(2, { message: "Le nom du client doit contenir au moins 2 caractères." }),
  phoneNumber: z.string().min(8, { message: "Le numéro de téléphone est requis." }),
  email: z.string().email({ message: "Veuillez entrer une adresse email valide." }).optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.coerce.number().min(1, "La quantité doit être d'au moins 1."),
    price: z.coerce.number(),
    purchasePrice: z.coerce.number().optional(),
    type: z.enum(['service', 'stock']),
  })),
  totalAmount: z.coerce.number().min(0).optional(),
  amountPaid: z.coerce.number().min(0).optional(),
}).refine(data => {
  const cartTotal = data.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  // Use the manual totalAmount ONLY if it's provided AND greater than the cart total. Otherwise, use cart total.
  const effectiveTotal = (data.totalAmount && data.totalAmount > cartTotal && data.items.length === 0) ? data.totalAmount : cartTotal;
  const paid = data.amountPaid ?? 0;
  return paid <= effectiveTotal;
}, {
  message: "Le montant payé ne peut pas dépasser le montant total.",
  path: ["amountPaid"],
});


type ClientWithItemsFormValues = z.infer<typeof clientWithItemsSchema>;

const defaultServiceTypes: ServiceType[] = [
  { name: "Prestation Standard", price: 0 },
  { name: "Service Premium", price: 0 },
];

export default function NewClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentUser, businessId, personalizationSettings, workspaceSettings, getCurrencySymbol, activeWorkspaceId, businessProfile } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoading();
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

    const combined = [...globalServices, ...workspaceServices];
    const uniqueServices = Array.from(new Map(combined.map(item => [item.name, item])).values());

    return (uniqueServices.length > 0) ? uniqueServices : defaultServiceTypes;
  }, [personalizationSettings, workspaceSettings]);


  const form = useForm<ClientWithItemsFormValues>({
    resolver: zodResolver(clientWithItemsSchema),
    defaultValues: {
      name: searchParams.get('guestName') || "",
      phoneNumber: searchParams.get('guestPhone') || "",
      email: "",
      address: "",
      notes: "",
      items: [],
      totalAmount: 0,
      amountPaid: 0,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const currentItems = form.watch('items');

  const cartTotal = useMemo(() => {
    return currentItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [currentItems]);

  const manualTotalAmount = form.watch("totalAmount") || 0;
  const totalAmount = (manualTotalAmount > cartTotal && currentItems.length === 0) ? manualTotalAmount : cartTotal;
  const amountPaid = form.watch("amountPaid") || 0;

  const remainingBalance = useMemo(() => {
    return totalAmount - amountPaid;
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
        price: 'price' in item ? item.price || 0 : 0,
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
      toast({ variant: 'destructive', title: 'Erreur', description: "Veuillez entrer une description et un prix de vente valides." });
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

  async function onSubmit(values: ClientWithItemsFormValues) {
    if (!currentUser?.uid || !currentUser.displayName || !businessId || !activeWorkspaceId) {
      toast({ variant: "destructive", title: "Erreur", description: "Utilisateur non authentifié ou espace de travail non identifié." });
      return;
    }
    showLoader();
    try {
      const finalTotalAmount = totalAmount; // Calculated from memo or form watcher

      const newClientId = uuidv4();
      const newClient: Client = {
        id: newClientId,
        workspaceId: activeWorkspaceId,
        businessId: businessId,
        name: values.name,
        phoneNumber: values.phoneNumber,
        email: values.email || undefined,
        address: values.address || undefined,
        notes: values.notes || undefined,
        totalAmount: finalTotalAmount,
        amountPaid: values.amountPaid,
        createdBy: currentUser.displayName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
      };

      await syncService.createClient(newClient);

      if (values.items.length > 0) {
        const itemsForDB: ReservationItem[] = values.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          purchasePrice: item.purchasePrice ?? undefined
        }));

        // Deduct stock
        for (const item of itemsForDB) {
          if (item.type === 'stock') {
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

        const reservationId = uuidv4();
        const newReservation: Reservation = {
          id: reservationId,
          workspaceId: activeWorkspaceId,
          businessId: businessId,
          clientId: newClientId,
          guestName: values.name,
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date().toISOString(),
          status: 'checked-out', // Completed sale
          notes: `Vente rapide pour le client ${values.name}`,
          roomType: values.items.map(i => i.name).join(', '),
          numberOfGuests: 1,
          totalAmount: cartTotal, // Reservation amount is strictly items total
          amountPaid: values.amountPaid, // Payment attached to reservation too? Or just client balance? 
          // In this app logic, payments seem to update Client balance primarily, but reservation record helps track history.
          // We'll proceed with creating the reservation record as done previously.
          items: itemsForDB,
          createdBy: currentUser.displayName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isDeleted: false
        };

        await syncService.createReservation(newReservation);
      }

      toast({
        title: "Client enregistré !",
        description: `Le client ${values.name} a été créé ${values.items.length > 0 ? 'et sa vente a été enregistrée.' : '.'}`,
      });
      router.push("/clients");
    } catch (error: any) {
      console.error("Failed to add client/reservation:", error);
      toast({
        variant: "destructive",
        title: "Échec de l'enregistrement",
        description: error.message || "Impossible d'enregistrer le client ou la vente.",
      });
    } finally {
      hideLoader();
    }
  }

  const handleBack = () => {
    showLoader();
    router.back();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/clients" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-3xl font-headline font-semibold tracking-tight">Nouveau Client & Vente</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Informations du Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet du client</FormLabel>
                    <FormControl><Input placeholder="Ex: Abalo Julien" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de téléphone</FormLabel>
                    <FormControl><Input type="tel" placeholder="+228 99 99 99 99" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Facultatif)</FormLabel>
                    <FormControl><Input type="email" placeholder="nom@exemple.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse (Facultatif)</FormLabel>
                    <FormControl><Input placeholder="Ex: 123 Rue de la Paix, Lomé" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Facultatif)</FormLabel>
                    <FormControl><Textarea placeholder="Informations supplémentaires..." className="resize-none" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Ajouter des Articles/Services (Optionnel)</CardTitle>
                <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 pr-4">
                  <div className="space-y-4">
                    {(personalizationSettings?.serviceTypes || []).length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-muted-foreground">Services Globaux</h4>
                        {filteredGlobalServices.map(service => (
                          <Button key={service.id || service.name} type="button" variant="ghost" className="w-full justify-start h-auto py-2 relative" onClick={() => addItemToCart(service, 'service')}>
                            <div><p>{service.name}</p></div>
                            {justAddedItemId === (service.id || service.name) && (<div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-md animate-out fade-out duration-1000"><CheckCircle className="h-6 w-6 text-white" /></div>)}
                          </Button>
                        ))}
                      </div>
                    )}
                    {(workspaceSettings?.serviceTypes || []).length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-2 text-muted-foreground">Services Spécifiques</h4>
                          {filteredWorkspaceServices.map(service => (
                            <Button key={service.id || service.name} type="button" variant="ghost" className="w-full justify-start h-auto py-2 relative" onClick={() => addItemToCart(service, 'service')}>
                              <div><p>{service.name}</p></div>
                              {justAddedItemId === (service.id || service.name) && (<div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-md animate-out fade-out duration-1000"><CheckCircle className="h-6 w-6 text-white" /></div>)}
                            </Button>
                          ))}
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
                          {justAddedItemId === item.id && (<div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-md animate-out fade-out duration-1000"><CheckCircle className="h-6 w-6 text-white" /></div>)}
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

          <Card className="shadow-lg">
            <CardHeader><CardTitle>Panier & Paiement</CardTitle></CardHeader>
            <CardContent>
              {currentItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Aucun article sélectionné. Remplissez les champs ci-dessous pour gérer un solde simple.</p>
              ) : (
                <div className="space-y-4">
                  {fields.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="flex-1"><p className="font-medium">{item.name}</p></div>
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
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mt-4">
                {currentItems.length === 0 && (
                  <FormField control={form.control} name="totalAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total de la facture ({currencySymbol})</FormLabel>
                      <FormControl><Input type="number" min="0" placeholder="Ex: 50000" {...field} /></FormControl>
                      <FormDescription>Remplir uniquement si vous n'ajoutez pas d'articles.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField
                  control={form.control}
                  name="amountPaid"
                  render={({ field }) => (
                    <FormItem className={currentItems.length > 0 ? "md:col-start-2" : ""}>
                      <FormLabel>Montant Payé ({currencySymbol})</FormLabel>
                      <FormControl><Input type="number" min="0" placeholder="Ex: 25000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-4 p-4 bg-secondary/50 rounded-lg text-right">
                <p className="text-sm font-medium text-muted-foreground">Total à facturer</p>
                <p className="text-2xl font-bold">{totalAmount.toLocaleString('fr-FR')} {currencySymbol}</p>
                <p className="text-lg font-bold text-primary mt-1">Reste à payer: {remainingBalance.toLocaleString('fr-FR')} {currencySymbol}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleBack}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

