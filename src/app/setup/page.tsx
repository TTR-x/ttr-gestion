

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import React, { useState } from "react";
import { Loader2, Rocket, Gift } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { createOrUpdateBusinessProfile } from "@/lib/firebase/database";
import { AppLogo } from "@/components/layout/app-logo";
import { RegistrationProgress } from "@/components/auth/registration-progress";

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


const countries = [
  "Bénin", "Burkina Faso", "Cap-Vert", "Côte d'Ivoire", "Gambie", "Ghana", "Guinée",
  "Guinée-Bissau", "Liberia", "Mali", "Mauritanie", "Niger", "Nigeria", "Sénégal", "Sierra Leone", "Togo",
  "Cameroun", "République centrafricaine", "Tchad", "Congo-Brazzaville", "Congo-Kinshasa", "Guinée équatoriale", "Gabon",
  "Afrique du Sud", "Algérie", "Angola", "Botswana", "Égypte", "Éthiopie", "Kenya", "Maroc", "Mozambique", "Ouganda", "Rwanda", "Soudan", "Tanzanie", "Zambie", "Zimbabwe",
  "France", "Belgique", "Suisse", "Canada", "États-Unis", "Chine", "Inde", "Brésil"
].sort((a, b) => a.localeCompare(b));

const currencies = ["FCFA", "EUR", "USD", "GBP", "CAD", "CNY", "NGN", "GHS"];

const setupSchema = z.object({
  name: z.string().min(2, { message: "Le nom de l'entreprise doit contenir au moins 2 caractères." }),
  type: z.string({ required_error: "Veuillez sélectionner un domaine d'activité." }),
  country: z.string({ required_error: "Veuillez sélectionner un pays." }),
  currency: z.string({ required_error: "Veuillez sélectionner une devise." }),
  otherType: z.string().optional(),
  appliedPromoCode: z.string().optional(),
}).refine(data => {
  if (data.type === 'Autre') {
    return data.otherType && data.otherType.trim().length > 1;
  }
  return true;
}, {
  message: "Veuillez préciser le domaine d'activité.",
  path: ["otherType"],
});


type SetupFormValues = z.infer<typeof setupSchema>;


export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, refreshAuthContext } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: "",
      otherType: "",
      currency: "FCFA",
      appliedPromoCode: "",
    },
  });

  async function onSubmit(values: SetupFormValues) {
    if (!currentUser?.uid) {
      toast({ variant: "destructive", title: "Erreur", description: "Utilisateur non authentifié." });
      return;
    }
    setIsLoading(true);
    try {
      const profileData = {
        name: values.name,
        type: values.type === 'Autre' && values.otherType ? values.otherType : values.type,
        country: values.country,
        currency: values.currency,
        appliedPromoCode: values.appliedPromoCode,
      };

      await createOrUpdateBusinessProfile(profileData, currentUser.uid);
      await refreshAuthContext();

      toast({ title: "Configuration terminée !", description: "Veuillez maintenant valider votre adresse e-mail." });
      router.push('/verify-email');

    } catch (error: any) {
      console.error("Échec de la configuration:", error);
      toast({
        variant: "destructive",
        title: "Échec de la configuration",
        description: error.message || "Une erreur est survenue.",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <RegistrationProgress currentStep={2} />
      <Card className="shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center mb-4 text-foreground">
            <AppLogo className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl font-headline">
            Finalisez votre Inscription
          </CardTitle>
          <CardDescription>
            Pour terminer, veuillez configurer votre premier espace de travail.
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
                    <FormLabel>Nom de votre entreprise principale</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Hôtel Le Flamboyant" {...field} />
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
                    <FormLabel>Domaine d'activité principal</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setShowOtherInput(value === 'Autre');
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez votre domaine" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {businessTypes.sort((a, b) => a.localeCompare(b)).map((type) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez votre pays" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Devise</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez une devise" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="appliedPromoCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Gift className="h-4 w-4" /> Code Promo (Optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Entrez un code de parrainage" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Rocket className="mr-2 h-4 w-4" />
                Terminer l'inscription
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
