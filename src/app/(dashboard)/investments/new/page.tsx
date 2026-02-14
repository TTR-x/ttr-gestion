
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/auth-provider";
import { syncService } from "@/lib/sync-service";
import Link from "next/link";
import React from "react";
import { useLoading } from "@/providers/loading-provider";
import { v4 as uuidv4 } from 'uuid';
import { Investment } from "@/lib/types";

const investmentFormSchema = z.object({
  name: z.string().min(3, { message: "Le nom de l'investissement doit contenir au moins 3 caractères." }),
  initialAmount: z.coerce.number().positive({ message: "Le montant initial doit être un nombre positif." }),
  expectedReturn: z.coerce.number().positive({ message: "Le retour attendu doit être un nombre positif." }),
  timeframeMonths: z.coerce.number().int().min(1, { message: "La durée doit être d'au moins 1 mois." }),
  riskLevel: z.enum(["Faible", "Moyen", "Élevé"], { required_error: "Veuillez sélectionner un niveau de risque." }),
  status: z.enum(["Planification", "Actif", "Terminé", "En attente"], { required_error: "Veuillez sélectionner un statut." }),
  description: z.string().max(1000, "La description ne doit pas dépasser 1000 caractères.").optional(),
});

type InvestmentFormValues = z.infer<typeof investmentFormSchema>;

export default function NewInvestmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, businessId, getCurrencySymbol, activeWorkspaceId } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoading();
  const currencySymbol = getCurrencySymbol();

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: {
      name: "",
      initialAmount: undefined,
      expectedReturn: undefined,
      timeframeMonths: 12,
      riskLevel: "Moyen",
      status: "Planification",
      description: "",
    },
  });

  async function onSubmit(values: InvestmentFormValues) {
    if (!currentUser?.uid || !currentUser.displayName || !businessId || !activeWorkspaceId) {
      toast({ variant: "destructive", title: "Erreur", description: "Action non autorisée." });
      return;
    }
    showLoader();
    try {
      const newInvestment: Investment = {
        id: uuidv4(),
        workspaceId: activeWorkspaceId,
        businessId: businessId,
        name: values.name,
        description: values.description || "",
        initialAmount: Number(values.initialAmount),
        expectedReturn: Number(values.expectedReturn),
        timeframeMonths: Number(values.timeframeMonths),
        riskLevel: values.riskLevel,
        status: values.status,
        createdBy: currentUser.displayName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
      };

      await syncService.createInvestment(newInvestment);

      toast({
        title: "Investissement ajouté",
        description: `Le projet "${values.name}" a été enregistré.`,
      });
      router.push("/investments");
    } catch (error: any) {
      console.error("Failed to add investment:", error);
      toast({
        variant: "destructive",
        title: "Échec de l'ajout",
        description: error.message || "Impossible d'enregistrer l'investissement.",
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
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/investments" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-3xl font-headline font-semibold tracking-tight">Nouvel Investissement</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Détails du projet</CardTitle>
          <CardDescription>Remplissez les informations ci-dessous pour créer un nouveau projet d'investissement.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du projet d'investissement</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Rénovation de la façade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="initialAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant Initial (en {currencySymbol})</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 5000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expectedReturn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retour sur Investissement Attendu (en {currencySymbol})</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 7500000" {...field} />
                      </FormControl>
                      <FormDescription>Bénéfice total attendu après la fin du projet.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="timeframeMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durée du projet (en mois)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 24" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="riskLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niveau de risque</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un niveau" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Faible">Faible</SelectItem>
                          <SelectItem value="Moyen">Moyen</SelectItem>
                          <SelectItem value="Élevé">Élevé</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut Initial</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Planification">Planification</SelectItem>
                        <SelectItem value="Actif">Actif</SelectItem>
                        <SelectItem value="En attente">En attente</SelectItem>
                        <SelectItem value="Terminé">Terminé</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description et Objectifs (Facultatif)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez le projet, ses objectifs, et les étapes clés..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleBack}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer l'investissement
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
