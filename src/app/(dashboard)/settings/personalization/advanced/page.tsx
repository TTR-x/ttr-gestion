
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/providers/auth-provider';
import { useLoading } from '@/providers/loading-provider';
import { useToast } from '@/hooks/use-toast';
import { getWorkspaceSettings, updateWorkspaceSettings, linkServiceTypesToWorkspaces } from '@/lib/firebase/database';
import type { ServiceType, Workspace } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Trash2, ArrowLeft, Link2, CheckCircle, Plus, Wallet, Banknote, TrendingUp, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const serviceTypeSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Le nom est requis.'),
    purchasePrice: z.coerce.number().min(0, 'Le prix doit être positif ou nul.').optional(),
    price: z.coerce.number().min(0, 'Le prix doit être positif ou nul.').default(0),
}).refine(data => {
    if (data.price !== undefined && data.purchasePrice !== undefined) {
        return data.price >= data.purchasePrice;
    }
    return true;
}, {
    message: "Le prix de vente ne peut être inférieur au prix d'achat.",
    path: ["price"],
});

const personalizationSchema = z.object({
    serviceTypes: z.array(serviceTypeSchema),
});

type PersonalizationFormValues = z.infer<typeof personalizationSchema>;

export default function AdvancedPersonalizationPage() {
    const { businessId, currentUser, activeWorkspaceId, businessProfile, refreshAuthContext, getCurrencySymbol, loading: authLoading, isAdmin } = useAuth();
    const { isLoading, showLoader, hideLoader } = useLoading();
    const { toast } = useToast();
    const [loadingData, setLoadingData] = useState(true);
    const [selectedServiceToLink, setSelectedServiceToLink] = useState<ServiceType | null>(null);
    const currencySymbol = getCurrencySymbol();

    const otherWorkspaces = useMemo(() => {
        return Object.values(businessProfile?.workspaces || {}).filter(ws => ws.id !== activeWorkspaceId && !ws.isPrimary);
    }, [businessProfile, activeWorkspaceId]);

    const [targetWorkspaces, setTargetWorkspaces] = useState<string[]>([]);

    const form = useForm<PersonalizationFormValues>({
        resolver: zodResolver(personalizationSchema),
        defaultValues: { serviceTypes: [] },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: 'serviceTypes',
        keyName: "fieldId",
    });

    const watchedServiceTypes = form.watch('serviceTypes');

    const loadWorkspaceSettings = useCallback(async () => {
        if (authLoading || !activeWorkspaceId || !businessId) return;
        setLoadingData(true);
        try {
            const settings = await getWorkspaceSettings(businessId, activeWorkspaceId);
            const serviceTypes = (settings?.serviceTypes || []).map(st => ({
                id: st.id || uuidv4(),
                name: st.name,
                price: st.price ?? 0,
                purchasePrice: st.purchasePrice ?? 0,
            }));
            replace(serviceTypes);
        } catch (e) {
            console.error("Failed to load workspace settings:", e);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de charger les paramètres de cet espace." });
            replace([]);
        } finally {
            setLoadingData(false);
        }
    }, [authLoading, activeWorkspaceId, businessId, replace, toast]);

    useEffect(() => {
        loadWorkspaceSettings();
    }, [loadWorkspaceSettings]);

    const onSubmit = async (data: PersonalizationFormValues) => {
        if (!businessId || !currentUser?.uid || !activeWorkspaceId) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Action non autorisée.' });
            return;
        }
        showLoader();
        try {
            await updateWorkspaceSettings(businessId, activeWorkspaceId, data, currentUser.uid);
            await refreshAuthContext();
            toast({ title: 'Paramètres enregistrés !' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: error.message });
        } finally {
            hideLoader();
        }
    };

    const handleLinkSubmit = async () => {
        if (!selectedServiceToLink || targetWorkspaces.length === 0 || !businessId || !currentUser?.uid) return;

        showLoader();
        try {
            await linkServiceTypesToWorkspaces(businessId, targetWorkspaces, [selectedServiceToLink], currentUser.uid);
            toast({ title: "Liaison réussie", description: `Le service "${selectedServiceToLink.name}" a été copié vers les espaces sélectionnés.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erreur de liaison', description: error.message });
        } finally {
            setSelectedServiceToLink(null);
            setTargetWorkspaces([]);
            hideLoader();
        }
    };

    if (loadingData) {
        return (
            <div className="space-y-8 max-w-4xl mx-auto px-4 sm:px-0">
                <Skeleton className="h-10 w-80" />
                <Card>
                    <CardHeader> <Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-2/3" /> </CardHeader>
                    <CardContent className="space-y-4"> <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /> </CardContent>
                </Card>
            </div>
        )
    }

    const workspaceName = businessProfile?.workspaces?.[activeWorkspaceId!]?.name || 'cet espace';

    return (
        <Dialog onOpenChange={(open) => !open && setSelectedServiceToLink(null)}>
            <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-0 py-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild className="rounded-full shadow-sm">
                        <Link href="/settings/personalization" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-headline font-semibold tracking-tight">Personnalisation Avancée</h1>
                        <p className="text-muted-foreground text-sm">Services spécifiques pour l'espace <span className="text-primary font-medium">{workspaceName}</span>.</p>
                    </div>
                </div>

                <Card className="shadow-xl border-none bg-gradient-to-b from-card to-background">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Info className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Services de l'espace</CardTitle>
                                <CardDescription>
                                    Ces services s'ajoutent à la liste globale uniquement pour {workspaceName}.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isAdmin ? (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <div className="hidden lg:grid grid-cols-[1fr,110px,110px,90px,80px] items-center gap-4 px-4 py-2 bg-muted/50 rounded-lg text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        <span>Nom du service</span>
                                        <span className="flex items-center gap-1.5"><Wallet className="h-3 w-3" /> Achat</span>
                                        <span className="flex items-center gap-1.5"><Banknote className="h-3 w-3" /> Vente</span>
                                        <span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Profit</span>
                                        <span className="text-right">Actions</span>
                                    </div>

                                    <div className="space-y-3">
                                        {fields.length === 0 && (
                                            <div className="text-center py-12 border-2 border-dashed rounded-xl border-muted">
                                                <p className="text-muted-foreground">Aucun service spécifique défini pour cet espace.</p>
                                            </div>
                                        )}
                                        {fields.map((field, index) => {
                                            const purchasePrice = watchedServiceTypes[index]?.purchasePrice ?? 0;
                                            const sellingPrice = watchedServiceTypes[index]?.price ?? 0;
                                            const profit = sellingPrice - purchasePrice;
                                            return (
                                                <div key={field.fieldId} className="group relative grid grid-cols-1 lg:grid-cols-[1fr,110px,110px,90px,80px] items-start lg:items-center gap-4 p-4 bg-card border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in">
                                                    <FormField control={form.control} name={`serviceTypes.${index}.name`} render={({ field }) => (
                                                        <FormItem className="space-y-0 flex-1">
                                                            <FormLabel className="lg:hidden text-xs font-bold text-muted-foreground mb-1 uppercase">Nom</FormLabel>
                                                            <FormControl><Input placeholder="Ex: Premium Service..." className="bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-10 font-medium" {...field} /></FormControl>
                                                            <FormMessage className="text-[10px]" />
                                                        </FormItem>
                                                    )} />

                                                    <div className="grid grid-cols-2 lg:contents gap-4">
                                                        <FormField control={form.control} name={`serviceTypes.${index}.purchasePrice`} render={({ field }) => (
                                                            <FormItem className="space-y-0">
                                                                <FormLabel className="lg:hidden text-xs font-bold text-muted-foreground mb-1 uppercase">Achat</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} className="bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-10 px-3" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )} />
                                                        <FormField control={form.control} name={`serviceTypes.${index}.price`} render={({ field }) => (
                                                            <FormItem className="space-y-0">
                                                                <FormLabel className="lg:hidden text-xs font-bold text-muted-foreground mb-1 uppercase">Vente</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} className="bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-10 px-3" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )} />
                                                    </div>

                                                    <div className="flex flex-col lg:items-center">
                                                        <span className="lg:hidden text-xs font-bold text-muted-foreground mb-1 uppercase">Profit</span>
                                                        <div className={cn("h-10 flex items-center justify-center font-bold text-[10px] px-2 rounded-lg w-full lg:w-fit", profit >= 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600")}>
                                                            {profit >= 0 ? '+' : ''}{profit.toLocaleString('fr-FR')} {currencySymbol}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 justify-end">
                                                        <DialogTrigger asChild>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedServiceToLink(fields[index])} disabled={isLoading || otherWorkspaces.length === 0} className="h-9 w-9 text-primary hover:bg-primary/10 transition-colors">
                                                                <Link2 className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isLoading} className="h-9 w-9 text-destructive hover:bg-destructive/10 transition-colors">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t">
                                        <Button type="button" variant="secondary" onClick={() => append({ id: uuidv4(), name: '', price: 0, purchasePrice: 0 })} className="w-full sm:w-auto">
                                            <Plus className="mr-2 h-4 w-4" /> Ajouter un service
                                        </Button>
                                        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto shadow-lg shadow-primary/20">
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <Save className="mr-2 h-4 w-4" /> Enregistrer {workspaceName}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        ) : (
                            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-xl text-muted-foreground italic text-sm">
                                <Info className="h-5 w-5" />
                                <p>Seuls les administrateurs peuvent modifier les paramètres spécifiques de l'espace.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">Lier "{selectedServiceToLink?.name}"</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Copiez ce service et ses tarifs vers d'autres espaces de travail pour gagner du temps.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-3">
                    {otherWorkspaces.length > 0 ? (
                        otherWorkspaces.map(ws => (
                            <label key={ws.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-transparent hover:border-primary/20 hover:bg-secondary/30 transition-all cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold transition-transform group-hover:scale-110">
                                        {ws.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium">{ws.name}</span>
                                </div>
                                <Checkbox
                                    id={`ws-${ws.id}`}
                                    className="rounded-full h-5 w-5 border-2"
                                    onCheckedChange={(checked) => {
                                        setTargetWorkspaces(prev => checked ? [...prev, ws.id] : prev.filter(id => id !== ws.id))
                                    }}
                                />
                            </label>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground text-sm italic">Aucun autre espace de travail disponible.</p>
                    )}
                </div>
                <div className="flex gap-3 pt-2">
                    <Button className="flex-1 rounded-xl h-11 font-semibold" onClick={handleLinkSubmit} disabled={isLoading || targetWorkspaces.length === 0}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Lier aux {targetWorkspaces.length} espaces
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
