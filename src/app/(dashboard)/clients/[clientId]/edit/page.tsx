"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, ShoppingCart, Package, History, Printer } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/auth-provider";
import { getClientById, updateClient, getReservations, getActivityLog } from "@/lib/firebase/database";
import type { Client, Reservation, ActivityLogEntry } from "@/lib/types";
import Link from "next/link";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useLoading } from "@/providers/loading-provider";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";

const clientFormSchema = z.object({
    name: z.string().min(2, { message: "Le nom du client doit contenir au moins 2 caractères." }),
    phoneNumber: z.string().min(8, { message: "Le numéro de téléphone est requis." }),
    email: z.string().email({ message: "Veuillez entrer une adresse email valide." }).optional().or(z.literal('')),
    address: z.string().optional(),
    notes: z.string().optional(),
    totalAmount: z.coerce.number().min(0, { message: "Le montant ne peut être négatif." }).optional(),
    amountPaid: z.coerce.number().min(0, { message: "Le montant payé ne peut être négatif." }).optional(),
}).refine(data => {
    if (data.amountPaid !== undefined && data.totalAmount !== undefined) {
        return data.amountPaid <= data.totalAmount;
    }
    return true;
}, {
    message: "Le montant payé ne peut pas dépasser le montant total.",
    path: ["amountPaid"],
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function EditClientPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { currentUser, businessId, getCurrencySymbol, activeWorkspaceId } = useAuth();
    const { showLoader, hideLoader, isLoading } = useLoading();
    const [loadingData, setLoadingData] = useState(true);
    const [client, setClient] = useState<Client | null>(null);
    const [clientReservations, setClientReservations] = useState<Reservation[]>([]);
    const [clientHistory, setClientHistory] = useState<ActivityLogEntry[]>([]);

    const clientId = params.clientId as string;
    const currencySymbol = getCurrencySymbol();
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);
    const { businessProfile } = useAuth();


    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientFormSchema),
    });

    const loadClientData = useCallback(async () => {
        if (!clientId || !businessId || !activeWorkspaceId) return;
        setLoadingData(true);
        try {
            const [clientData, allReservations, activityLog] = await Promise.all([
                getClientById(businessId, clientId),
                getReservations(businessId, activeWorkspaceId),
                getActivityLog(businessId, activeWorkspaceId)
            ]);

            if (clientData) {
                setClient(clientData as Client);
                form.reset({
                    name: clientData.name,
                    phoneNumber: clientData.phoneNumber,
                    email: clientData.email || "",
                    address: clientData.address || "",
                    notes: clientData.notes || "",
                    totalAmount: clientData.totalAmount || 0,
                    amountPaid: clientData.amountPaid || 0,
                });

                const filteredReservations = (allReservations || []).filter(res => res.clientId === clientId);
                setClientReservations(filteredReservations.sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime()));

                const filteredHistory = (activityLog || []).filter(log => log.details?.entityId === clientId);
                // Corrected sort to use serverTimestamp or deviceTimestamp
                setClientHistory(filteredHistory.sort((a, b) => (b.serverTimestamp || b.deviceTimestamp || 0) - (a.serverTimestamp || a.deviceTimestamp || 0)));

            } else {
                toast({ variant: "destructive", title: "Erreur", description: "Client non trouvé." });
                router.push('/clients');
            }
        } catch (error) {
            console.error("Failed to load client data:", error);
            toast({ variant: "destructive", title: "Erreur de chargement", description: "Impossible de charger les données du client." });
        } finally {
            setLoadingData(false);
        }
    }, [clientId, businessId, activeWorkspaceId, form, router, toast]);

    useEffect(() => {
        loadClientData();
    }, [loadClientData]);

    const watchTotalAmount = form.watch("totalAmount");
    const watchAmountPaid = form.watch("amountPaid");

    const remainingBalance = useMemo(() => {
        const total = Number(watchTotalAmount) || 0;
        const paid = Number(watchAmountPaid) || 0;
        return total - paid;
    }, [watchTotalAmount, watchAmountPaid]);

    async function onSubmit(values: ClientFormValues) {
        if (!currentUser?.uid || !currentUser.displayName || !clientId || !businessId) {
            toast({ variant: "destructive", title: "Erreur", description: "Action non autorisée." });
            return;
        }
        showLoader();
        try {
            await updateClient(businessId, clientId, {
                name: values.name,
                phoneNumber: values.phoneNumber,
                email: values.email,
                address: values.address,
                notes: values.notes,
                totalAmount: values.totalAmount || 0,
                amountPaid: values.amountPaid || 0,
            }, currentUser.displayName, currentUser.uid);

            toast({
                title: "Client mis à jour",
                description: `La fiche de ${values.name} a été mise à jour.`,
            });
            router.push("/clients");
        } catch (error: any) {
            console.error("Failed to update client:", error);
            toast({ variant: "destructive", title: "Échec de la mise à jour", description: error.message || "Impossible de mettre à jour le client." });
        } finally {
            hideLoader();
        }
    }

    const handleBack = () => {
        showLoader();
        router.back();
    }

    if (loadingData) {
        return (
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-10 w-64" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="grid grid-cols-2 gap-8">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/clients" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <Button variant="outline" size="icon" onClick={() => setIsReceiptOpen(true)}>
                    <Printer className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-headline font-semibold tracking-tight">Modifier la Fiche Client</h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                        <div className="space-y-8 lg:col-span-1">
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>Détails du client</CardTitle>
                                    <CardDescription>Modifiez les informations pour {client?.name}.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>Nom complet</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                        <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="address" render={({ field }) => (
                                        <FormItem><FormLabel>Adresse</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="notes" render={({ field }) => (
                                        <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>Solde du Compte</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="totalAmount" render={({ field }) => (
                                        <FormItem><FormLabel>Total Facturé ({currencySymbol})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="amountPaid" render={({ field }) => (
                                        <FormItem><FormLabel>Total Payé ({currencySymbol})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="mt-4 p-4 bg-secondary/50 rounded-lg text-center">
                                        <p className="text-sm font-medium text-muted-foreground">Solde Actuel</p>
                                        <p className="text-2xl font-bold text-primary">
                                            {remainingBalance.toLocaleString('fr-FR')} {currencySymbol}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="sticky bottom-0 py-4 bg-background/80 backdrop-blur-sm -mx-8 px-8 -mb-8 rounded-b-lg border-t">
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={handleBack} size="lg">Annuler</Button>
                                    <Button type="submit" disabled={isLoading} size="lg">
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Enregistrer
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8 lg:col-span-1">
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Historique des Achats</CardTitle>
                                    <CardDescription>Liste de tous les articles et services achetés par ce client. Cette section est en lecture seule.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {clientReservations.length > 0 ? (
                                        <div className="space-y-4 max-h-60 overflow-y-auto">
                                            {clientReservations.map(res => (
                                                <div key={res.id} className="p-3 border rounded-md">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="font-semibold">{format(new Date(res.checkInDate), 'dd MMMM yyyy', { locale: fr })}</p>
                                                        <p className="text-sm font-bold">{res.totalAmount.toLocaleString('fr-FR')} {currencySymbol}</p>
                                                    </div>
                                                    <ul className="space-y-1 text-sm text-muted-foreground">
                                                        {(res.items || []).map((item, index) => (
                                                            <li key={index} className="flex justify-between items-center gap-2 pl-4">
                                                                <span className="flex items-center gap-2"><Package className="h-4 w-4" />{item.quantity} x {item.name}</span>
                                                                <span>{(item.quantity * item.price).toLocaleString('fr-FR')} {currencySymbol}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-sm text-muted-foreground py-8">Aucun historique d'achat trouvé pour ce client.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Historique des Modifications</CardTitle>
                                    <CardDescription>Journal des changements effectués sur cette fiche client.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {clientHistory.length > 0 ? (
                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                            {clientHistory.map(log => (
                                                <div key={log.id} className="text-xs p-2 border-l-2">
                                                    <p className="font-semibold">{log.actorDisplayName} a modifié :</p>
                                                    <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                                                        {log.details?.changes && Object.entries(log.details.changes).map(([key, value]: [string, any]) => (
                                                            <li key={key}><span className="capitalize font-medium">{key}</span>: "{value.from}" ➔ "{value.to}"</li>
                                                        ))}
                                                    </ul>
                                                    <p className="text-right text-muted-foreground mt-1">{formatDistanceToNow(new Date(log.serverTimestamp || log.deviceTimestamp || Date.now()), { addSuffix: true, locale: fr })}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-sm text-muted-foreground py-8">Aucune modification enregistrée pour ce client.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </Form>

            {client && businessProfile && (
                <ReceiptDialog
                    isOpen={isReceiptOpen}
                    onOpenChange={setIsReceiptOpen}
                    businessProfile={businessProfile}
                    currencySymbol={currencySymbol}
                    type="client"
                    title={`Relevé de compte - ${client.name}`}
                    data={{
                        id: client.id,
                        date: new Date(),
                        customerName: client.name,
                        items: clientReservations.map(res => ({
                            name: `Prestation du ${format(new Date(res.checkInDate), 'dd/MM/yyyy', { locale: fr })}`,
                            description: (res.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ').substring(0, 50) + ((res.items || []).length > 1 ? '...' : ''),
                            quantity: 1,
                            price: res.totalAmount
                        })),
                        totalAmount: client.totalAmount || 0,
                        amountPaid: client.amountPaid || 0,
                        notes: client.notes
                    }}
                />
            )}
        </div>
    );
}
