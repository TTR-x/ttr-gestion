
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import React, { useState } from "react";
import { Loader2, Rocket, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { useAuth } from "@/providers/auth-provider";
import { createNewWorkspace } from "@/lib/firebase/database";
import { useLoading } from "@/providers/loading-provider";

const businessTypes = [
  // Commerce & Vente
  "Alimentation générale",
  "Boutique / Magasin",
  "Supermarché",
  "Revendeur / Revendeuse",
  "Commerce de gros",
  "Ferrailleur",
  "Librairie / Papeterie",
  "Pharmacie / Parapharmacie",
  "Quincaillerie",
  "Vente de cosmétiques",
  "Vente de vêtements / Prêt-à-porter",
  "Vente de pièces automobiles",
  "Vente de produits en ligne (e-commerce)",

  // Services
  "Salon de coiffure / Barbier",
  "Institut de beauté / Esthétique",
  "Couture / Mode",
  "Pressing / Blanchisserie",
  "Réparation (téléphone, électronique...)",
  "Transport / Taxi / Zemidjan",
  "Agence de voyage",
  "Décoration / Événementiel",
  "Consultant / Prestation de services",
  "Développeur / Informatique",
  "Graphisme / Design",
  "Marketing / Communication",

  // Hôtellerie & Restauration
  "Hôtel / Auberge",
  "Maison d'hôtes / Gîte",
  "Restaurant",
  "Bar / Café",
  "Fast-food / Street-food",
  "Traiteur",

  // Artisanat & BTP
  "Artisanat",
  "Construction / BTP",
  "Menuiserie / Ébénisterie",
  "Plomberie",
  "Électricité",
  "Maçonnerie",

  // Agriculture & Élevage
  "Agriculture",
  "Élevage",

  // Santé
  "Cabinet médical / Clinique",
  "Cabinet dentaire",

  // Autre
  "Fonctionnaire",
  "Association / ONG",
  "École / Centre de formation",
  "Autre",
];

const workspaceSchema = z.object({
  name: z.string().min(2, { message: "Le nom de l'espace doit contenir au moins 2 caractères." }),
  type: z.string({ required_error: "Veuillez sélectionner un domaine d'activité." }),
  otherType: z.string().optional(),
}).refine(data => {
  if (data.type === 'Autre') {
    return data.otherType && data.otherType.trim().length > 1;
  }
  return true;
}, {
  message: "Veuillez préciser le domaine d'activité.",
  path: ["otherType"],
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

export default function NewWorkspacePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, businessId, switchWorkspace } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoading();
  const [showOtherInput, setShowOtherInput] = useState(false);

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: "",
      otherType: "",
    },
  });

  async function onSubmit(values: WorkspaceFormValues) {
    if (!currentUser?.uid || !businessId) {
      toast({ variant: "destructive", title: "Erreur", description: "Utilisateur ou entreprise principale non identifié." });
      return;
    }
    showLoader();
    try {
      const finalBusinessType = values.type === 'Autre' && values.otherType ? values.otherType : values.type;
      const newWorkspaceId = await createNewWorkspace(currentUser.uid, businessId, {
        name: values.name,
        type: finalBusinessType,
      });
      await switchWorkspace(newWorkspaceId);
      toast({ title: "Nouvel espace créé !", description: `Vous travaillez maintenant dans ${values.name}.` });
      router.push('/workspaces');

    } catch (error: any) {
      toast({ variant: "destructive", title: "Échec de la création", description: error.message });
      hideLoader();
    }
  }

  const handleBack = () => {
    showLoader();
    router.back();
  }


  return (
    <div className="space-y-8 max-w-2xl mx-auto">
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/workspaces" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-3xl font-headline font-semibold tracking-tight">Configurer un Nouvel Espace</h1>
        </div>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Détails du nouvel espace de travail</CardTitle>
                <CardDescription>
                    Cet espace sera lié à votre entreprise principale. Il partagera le même abonnement et la même facturation.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nom de l'espace de travail</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Restaurant La Fourchette" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Domaine d'activité</FormLabel>
                        <Select 
                            onValueChange={(value) => {
                            field.onChange(value);
                            setShowOtherInput(value === 'Autre');
                            }} 
                            defaultValue={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez un domaine" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {businessTypes.sort((a,b) => a.localeCompare(b)).map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {showOtherInput && (
                    <FormField
                        control={form.control}
                        name="otherType"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Précisez le domaine</FormLabel>
                            <FormControl>
                            <Input placeholder="Ex: Agence de voyage" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    )}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Rocket className="mr-2 h-4 w-4" />
                    Créer l'espace de travail
                    </Button>
                </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
