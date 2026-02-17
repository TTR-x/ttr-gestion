
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/providers/auth-provider';
import { useLoading } from '@/providers/loading-provider';
import { useToast } from '@/hooks/use-toast';
import { updatePersonalizationSettings } from '@/lib/firebase/database';
import type { PersonalizationSettings, ServiceType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Trash2, ArrowLeft, ArrowRight, Plus, Banknote, Wallet, TrendingUp, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const serviceTypeSchema = z.object({
    name: z.string().min(1, 'Le nom est requis.'),
    purchasePrice: z.coerce.number().min(0, "Le prix doit être positif ou nul.").optional(),
    price: z.coerce.number().min(0, 'Le prix doit être positif ou nul.').default(0),
}).refine(data => {
    if (data.price !== undefined && data.purchasePrice !== undefined) {
        return data.price >= data.purchasePrice;
    }
    return true;
}, {
    message: "Le prix de vente ne peut pas être inférieur au prix d'achat.",
    path: ["price"],
});

const personalizationSchema = z.object({
    serviceTypes: z.array(serviceTypeSchema),
});

type PersonalizationFormValues = z.infer<typeof personalizationSchema>;

const defaultSettings: PersonalizationFormValues = {
    serviceTypes: [
        { name: 'Service par défaut 1', price: 0, purchasePrice: 0 },
        { name: 'Service par défaut 2', price: 0, purchasePrice: 0 },
    ]
};

export default function PersonalizationPage() {
    const { businessId, currentUser, personalizationSettings, refreshAuthContext, getCurrencySymbol, loading: authLoading, isAdmin } = useAuth();
    const { isLoading, showLoader, hideLoader } = useLoading();
    const { toast } = useToast();
    const [loadingData, setLoadingData] = useState(true);
    const currencySymbol = getCurrencySymbol();

    const form = useForm<PersonalizationFormValues>({
        resolver: zodResolver(personalizationSchema),
        defaultValues: { serviceTypes: [] },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: 'serviceTypes',
    });

    const watchedServiceTypes = form.watch('serviceTypes');

    useEffect(() => {
        if (!authLoading) {
            setLoadingData(true);
            if (personalizationSettings?.serviceTypes) {
                const transformedSettings = {
                    serviceTypes: personalizationSettings.serviceTypes.map(st => ({
                        name: typeof st === 'string' ? st : st.name,
                        price: typeof st === 'string' ? 0 : st.price ?? 0,
                        purchasePrice: typeof st === 'string' ? 0 : st.purchasePrice ?? 0,
                    }))
                };
                replace(transformedSettings.serviceTypes);
            } else {
                replace(defaultSettings.serviceTypes);
            }
            setLoadingData(false);
        }
    }, [authLoading, personalizationSettings, replace]);

    const onSubmit = async (data: PersonalizationFormValues) => {
        if (!businessId || !currentUser?.uid) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Action non autorisée.' });
            return;
        }
        showLoader();
        try {
            await updatePersonalizationSettings(businessId, data, currentUser.uid);
            await refreshAuthContext();
            toast({ title: 'Paramètres globaux enregistrés !' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: error.message });
        } finally {
            hideLoader();
        }
    };

    if (loadingData) {
        return (
            <div className="space-y-8 max-w-4xl mx-auto px-4 sm:px-0">
                <Skeleton className="h-10 w-80" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-0 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild className="rounded-full shadow-sm">
                        <Link href="/settings" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-headline font-semibold tracking-tight">Personnalisation</h1>
                        <p className="text-muted-foreground text-sm">Gérez vos services et tarifs globaux.</p>
                    </div>
                </div>
                <Button variant="outline" asChild className="group border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
                    <Link href="/settings/personalization/advanced">
                        Avancé <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </Button>
            </div>

            <Card className="shadow-xl border-none bg-gradient-to-b from-card to-background">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Banknote className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Types de Prestation / Services Globaux</CardTitle>
                            <CardDescription>
                                Définissez les services par défaut qui seront disponibles dans tous vos espaces de travail.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isAdmin ? (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="hidden lg:grid grid-cols-[1fr,120px,120px,100px,48px] items-center gap-4 px-4 py-2 bg-muted/50 rounded-lg text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    <span>Nom du service</span>
                                    <span className="flex items-center gap-1.5"><Wallet className="h-3 w-3" /> Achat ({currencySymbol})</span>
                                    <span className="flex items-center gap-1.5"><Banknote className="h-3 w-3" /> Vente ({currencySymbol})</span>
                                    <span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Profit</span>
                                    <span></span>
                                </div>

                                <div className="space-y-3">
                                    {fields.length === 0 && (
                                        <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted">
                                            <p className="text-muted-foreground">Aucun service défini. Commencez par en ajouter un !</p>
                                        </div>
                                    )}
                                    {fields.map((field, index) => {
                                        const purchasePrice = watchedServiceTypes[index]?.purchasePrice ?? 0;
                                        const sellingPrice = watchedServiceTypes[index]?.price ?? 0;
                                        const profit = sellingPrice - purchasePrice;
                                        return (
                                            <div key={field.id} className="group relative grid grid-cols-1 lg:grid-cols-[1fr,120px,120px,100px,48px] items-start lg:items-center gap-4 p-4 bg-card border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in">
                                                <FormField control={form.control} name={`serviceTypes.${index}.name`} render={({ field }) => (
                                                    <FormItem className="space-y-0 flex-1">
                                                        <FormLabel className="lg:hidden text-xs font-bold text-muted-foreground mb-1 uppercase">Nom du service</FormLabel>
                                                        <FormControl><Input placeholder="Ex: Consultation, Maintenance..." className="bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-10 font-medium" {...field} /></FormControl>
                                                        <FormMessage className="text-[10px]" />
                                                    </FormItem>
                                                )} />

                                                <div className="grid grid-cols-2 lg:contents gap-4">
                                                    <FormField control={form.control} name={`serviceTypes.${index}.purchasePrice`} render={({ field }) => (
                                                        <FormItem className="space-y-0">
                                                            <FormLabel className="lg:hidden text-xs font-bold text-muted-foreground mb-1 uppercase">Prix d'achat</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} className="bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-10 pl-3 pr-8" />
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">{currencySymbol}</span>
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage className="text-[10px]" />
                                                        </FormItem>
                                                    )} />

                                                    <FormField control={form.control} name={`serviceTypes.${index}.price`} render={({ field }) => (
                                                        <FormItem className="space-y-0">
                                                            <FormLabel className="lg:hidden text-xs font-bold text-muted-foreground mb-1 uppercase">Prix de vente</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Input type="number" {...field} className="bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-10 pl-3 pr-8" />
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">{currencySymbol}</span>
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage className="text-[10px]" />
                                                        </FormItem>
                                                    )} />
                                                </div>

                                                <div className="flex flex-col lg:items-center">
                                                    <span className="lg:hidden text-xs font-bold text-muted-foreground mb-1 uppercase">Profit estimé</span>
                                                    <div className={cn("h-10 flex items-center justify-center font-bold text-xs px-3 rounded-lg w-full lg:w-fit", profit >= 0 ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400")}>
                                                        {profit >= 0 ? '+' : ''}{profit.toLocaleString('fr-FR')} {currencySymbol}
                                                    </div>
                                                </div>

                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isLoading} className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
                                    <Button type="button" variant="secondary" onClick={() => append({ name: '', price: 0, purchasePrice: 0 })} className="w-full sm:w-auto hover:bg-secondary/80">
                                        <Plus className="mr-2 h-4 w-4" /> Ajouter un service
                                    </Button>
                                    <Button type="submit" disabled={isLoading} className="w-full sm:w-auto shadow-lg shadow-primary/20">
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Enregistrer les modifications
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 p-3 bg-blue-500/10 text-blue-600 border border-blue-200 rounded-lg text-sm mb-4">
                                <Info className="h-4 w-4 shrink-0" />
                                <span>En tant qu'employé, vous pouvez consulter ces tarifs mais seul un administrateur peut les modifier.</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {fields.map((type, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 bg-secondary/20 border rounded-xl hover:bg-secondary/30 transition-colors">
                                        <span className="font-semibold">{type.name}</span>
                                        <div className="font-bold text-primary px-3 py-1 bg-primary/10 rounded-full text-xs">
                                            {(type.price || 0).toLocaleString('fr-FR')} {currencySymbol}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
