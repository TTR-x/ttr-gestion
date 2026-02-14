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
import { Loader2, Save, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const serviceTypeSchema = z.object({
  name: z.string().min(1, 'Le nom est requis.'),
  price: z.coerce.number().min(0, 'Le prix doit être positif ou nul.').default(0),
});

const personalizationSchema = z.object({
  serviceTypes: z.array(serviceTypeSchema),
});

type PersonalizationFormValues = z.infer<typeof personalizationSchema>;

const defaultSettings: PersonalizationFormValues = {
  serviceTypes: [
    { name: 'Service par défaut 1', price: 0 },
    { name: 'Service par défaut 2', price: 0 },
  ]
};

export function GlobalPersonalizationComponent() {
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

  useEffect(() => {
    if (!authLoading) {
        setLoadingData(true);
        let initialSettings = defaultSettings;
        if (personalizationSettings?.serviceTypes && personalizationSettings.serviceTypes.length > 0) {
            initialSettings = { 
                serviceTypes: personalizationSettings.serviceTypes.map(st => ({ 
                    name: st.name, 
                    price: st.price ?? 0 
                }))
            };
        }
        replace(initialSettings.serviceTypes);
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
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/3" /><Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
      )
  }

  return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Types de Prestation / Services Globaux</CardTitle>
                 <CardDescription>
                    Gérez la liste de services qui s'applique à toute votre entreprise par défaut.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isAdmin ? (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Label className="flex-1 font-semibold">Nom du service</Label>
                                <Label className="w-40 font-semibold">Prix ({currencySymbol})</Label>
                                <div className="w-10"></div>
                            </div>
                            <ul className="space-y-4">
                                {fields.map((field, index) => (
                                <li key={field.id} className="flex items-start gap-2 animate-in fade-in">
                                    <FormField
                                    control={form.control}
                                    name={`serviceTypes.${index}.name`}
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                        <FormLabel className="sr-only">Nom</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <FormField
                                    control={form.control}
                                    name={`serviceTypes.${index}.price`}
                                    render={({ field }) => (
                                        <FormItem className="w-40">
                                        <FormLabel className="sr-only">Prix</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={isLoading}><Trash2 className="h-4 w-4" /></Button>
                                </li>
                                ))}
                            </ul>

                            <div className="flex justify-between items-center mt-6">
                                <Button type="button" variant="outline" onClick={() => append({ name: '', price: 0 })}>Ajouter un type</Button>
                                <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Save className="mr-2 h-4 w-4" /> Enregistrer</Button>
                            </div>
                        </form>
                    </Form>
                ) : (
                     <div>
                        <h3 className="font-semibold mb-2">Types de prestations actuels :</h3>
                        <ul className="space-y-2">
                             {fields.map((type, index) => (
                                <li key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                                    <span className="font-medium">{type.name}</span>
                                    <span className="text-sm text-muted-foreground">{(type.price || 0).toLocaleString('fr-FR')} {currencySymbol}</span>
                                </li>
                            ))}
                        </ul>
                     </div>
                )}
            </CardContent>
        </Card>
  );
}
