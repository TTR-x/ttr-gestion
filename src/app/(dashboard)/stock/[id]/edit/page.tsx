"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Wand2, Upload } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/auth-provider";
import { syncService } from "@/lib/sync-service";

import { useLoading } from "@/providers/loading-provider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ResolvedImage } from '@/components/ui/resolved-image';
import { Label } from "@/components/ui/label";
import { uploadToCloudinary } from '@/lib/cloudinary';

import type { StockItem } from "@/lib/types";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

const stockItemFormSchema = z.object({
    name: z.string().min(2, { message: "Le nom de l'article doit contenir au moins 2 caractères." }),
    unit: z.string().min(1, { message: "L'unité de mesure est requise (ex: pièces, kg, litres)." }),
    currentQuantity: z.coerce.number().min(0, { message: "La quantité doit être un nombre positif ou nul." }),
    lowStockThreshold: z.coerce.number().min(0, { message: "Le seuil doit être un nombre positif ou nul." }),
    purchasePrice: z.coerce.number().min(0, "Le prix doit être positif ou nul.").optional(),
    isForSale: z.boolean().default(false),
    price: z.coerce.number().min(0, "Le prix doit être positif ou nul.").optional(),
}).refine(data => {
    if (data.isForSale) {
        return data.price !== undefined && data.price >= 0;
    }
    return true;
}, {
    message: "Le prix de vente est requis pour les articles à vendre.",
    path: ["price"],
}).refine(data => {
    if (data.isForSale && data.price !== undefined && data.purchasePrice !== undefined) {
        return data.price >= data.purchasePrice;
    }
    return true;
}, {
    message: "Le prix de vente ne peut pas être inférieur au prix d'achat.",
    path: ["price"],
});

type StockItemFormValues = z.infer<typeof stockItemFormSchema>;

export default function EditStockItemPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { currentUser, businessId, getCurrencySymbol, activeWorkspaceId, usageStats, planDetails } = useAuth();
    const { showLoader, hideLoader, isLoading } = useLoading();
    const [isUploading, setIsUploading] = useState(false);
    const currencySymbol = getCurrencySymbol();
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const itemId = params.id as string;

    const item = useLiveQuery(() => db.stock.get(itemId), [itemId]);

    const form = useForm<StockItemFormValues>({
        resolver: zodResolver(stockItemFormSchema),
        defaultValues: {
            name: "",
            unit: "pièces",
            currentQuantity: 0,
            lowStockThreshold: 10,
            isForSale: false,
            price: undefined,
            purchasePrice: undefined,
        },
    });

    useEffect(() => {
        if (item) {
            form.reset({
                name: item.name,
                unit: item.unit,
                currentQuantity: item.currentQuantity,
                lowStockThreshold: item.lowStockThreshold,
                isForSale: item.isForSale,
                price: item.price,
                purchasePrice: item.purchasePrice,
            });
            if (item.imageUrl) {
                setImagePreview(item.imageUrl);
            }
        }
    }, [item, form]);

    const isForSale = form.watch('isForSale');
    const purchasePrice = form.watch('purchasePrice');
    const sellingPrice = form.watch('price');
    const profit = (sellingPrice ?? 0) - (purchasePrice ?? 0);

    const handleImageSelectAndUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check storage limit
        const maxStorage = typeof planDetails?.storage === 'number' ? planDetails.storage : Infinity;
        if (usageStats && usageStats.storageUsed >= maxStorage) {
            toast({
                variant: "destructive",
                title: "Espace de stockage saturé",
                description: "Vous avez atteint la limite de stockage de votre forfait. Veuillez mettre à niveau pour ajouter plus d'images."
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ variant: 'destructive', title: 'Image trop lourde', description: 'Veuillez choisir une image de moins de 5 Mo.' });
            return;
        }

        setIsUploading(true);
        const isOffline = !navigator.onLine;

        if (isOffline) {
            toast({
                title: "Image sauvegardée localement",
                description: "Elle sera synchronisée automatiquement lors de la prochaine connexion."
            });
        } else {
            toast({ title: "Téléversement en cours..." });
        }

        try {
            const imageUrl = await uploadToCloudinary(file);
            setImagePreview(imageUrl);

            if (!isOffline) {
                toast({ title: "Image téléversée avec succès !" });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Échec du téléversement", description: error.message });
            setImagePreview(null);
        } finally {
            setIsUploading(false);
        }
    };



    async function onSubmit(values: StockItemFormValues) {
        if (!currentUser?.uid || !currentUser.displayName || !businessId || !activeWorkspaceId || !item) {
            toast({ variant: "destructive", title: "Erreur", description: "Action non autorisée ou article introuvable." });
            return;
        }
        showLoader();
        try {
            const updatedItem: StockItem = {
                ...item,
                name: values.name,
                unit: values.unit,
                currentQuantity: values.currentQuantity,
                isForSale: values.isForSale,
                lowStockThreshold: values.lowStockThreshold,
                purchasePrice: values.purchasePrice,
                imageUrl: imagePreview || '',
                price: values.isForSale ? values.price : undefined,
                updatedAt: Date.now(),
                updatedBy: currentUser.displayName || 'Unknown',
            };

            await syncService.updateStockItem(updatedItem);

            router.push("/stock");
            toast({
                title: "Article mis à jour",
                description: `L'article "${values.name}" a été modifié avec succès.`,
            });

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Échec de la mise à jour",
                description: error.message || "Impossible de modifier l'article.",
            });
        } finally {
            hideLoader();
        }
    }

    const handleBack = () => {
        showLoader();
        router.back();
    }

    if (!item) {
        return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /><p className="mt-2 text-muted-foreground">Chargement de l'article...</p></div>;
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/stock" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-3xl font-headline font-semibold tracking-tight">Modifier l'Article</h1>
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Détails de l'article</CardTitle>
                    <CardDescription>Modifiez les informations ci-dessous.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nom de l'article</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Bouteille d'eau" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Unité de mesure</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: pièces, kg, litres, bouteilles" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="currentQuantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantité actuelle en stock</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="lowStockThreshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Seuil d'alerte de stock bas</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="0"
                                                {...field}
                                                value={field.value ?? ""}
                                                onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Alerte quand la quantité atteint ce niveau.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Separator />

                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="isForSale"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Mettre en Vente</FormLabel>
                                                <FormDescription>
                                                    Si activé, cet article apparaîtra dans la section "Vente Rapide" du tableau de bord.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {isForSale && (
                                    <div className="p-4 border rounded-md animate-in fade-in space-y-4 overflow-hidden transition-all duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Prix d'achat ({currencySymbol})</FormLabel>
                                                    <FormControl><Input type="number" min="0" placeholder="Ex: 350" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="price" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Prix de vente ({currencySymbol})</FormLabel>
                                                    <FormControl><Input type="number" min="0" placeholder="Ex: 500" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                        {isForSale && sellingPrice !== undefined && purchasePrice !== undefined && sellingPrice > purchasePrice && (
                                            <div className="p-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-md text-center">
                                                <p className="text-sm font-medium text-green-700 dark:text-green-300">Profit Net par article : <span className="font-bold">{profit.toLocaleString('fr-FR')} {currencySymbol}</span></p>
                                            </div>
                                        )}
                                        <div>
                                            <Label>Image du produit</Label>
                                            <FormDescription className="mb-2">Téléversez une image pour votre article.</FormDescription>

                                            <div className="flex flex-wrap gap-2">
                                                <Input id="imageFile" type="file" className="sr-only" onChange={handleImageSelectAndUpload} accept="image/*" />
                                                <Button type="button" variant="outline" onClick={() => document.getElementById('imageFile')?.click()} disabled={isUploading}>
                                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                    Importer une image
                                                </Button>
                                            </div>
                                            {imagePreview && (
                                                <div className="mt-4 relative w-32 h-32">
                                                    <ResolvedImage src={imagePreview} alt="Aperçu de l'image" fill style={{ objectFit: 'cover' }} className="rounded-md" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={handleBack}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={isLoading || isUploading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Mettre à jour l'article
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
