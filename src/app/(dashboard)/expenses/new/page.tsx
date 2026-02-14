
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/auth-provider";
import { syncService } from "@/lib/sync-service";
import Link from "next/link";
import React from "react";
import { useLoading } from "@/providers/loading-provider";
import { v4 as uuidv4 } from 'uuid';
import { Expense } from "@/lib/types";

const expenseFormSchema = z.object({
  itemName: z.string().min(2, { message: "Le nom de l'article doit contenir au moins 2 caractères." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être un nombre positif." }),
  category: z.string({ required_error: "Veuillez sélectionner une catégorie." }),
  date: z.date({ required_error: "La date est requise." }),
  description: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const categoryTranslations: { [key: string]: string } = {
  Supplies: "Fournitures",
  "Food & Beverage": "Nourriture et boissons",
  Maintenance: "Maintenance",
  Marketing: "Marketing",
  Utilities: "Services publics",
  Other: "Autre",
};

export default function NewExpensePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, businessId, getCurrencySymbol, activeWorkspaceId } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoading();
  const currencySymbol = getCurrencySymbol();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      itemName: "",
      description: "",
      amount: 0,
      date: new Date(),
    },
  });

  async function onSubmit(values: ExpenseFormValues) {
    if (!currentUser?.uid || !currentUser.displayName || !businessId || !activeWorkspaceId) {
      toast({ variant: "destructive", title: "Erreur", description: "Utilisateur non authentifié ou entreprise non identifiée." });
      return;
    }
    showLoader();
    try {
      const newExpense: Expense = {
        id: uuidv4(),
        workspaceId: activeWorkspaceId,
        businessId: businessId,
        itemName: values.itemName,
        amount: Number(values.amount),
        category: values.category,
        date: values.date.toISOString(),
        description: values.description,
        createdBy: currentUser.displayName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
      };

      await syncService.createExpense(newExpense);

      toast({
        title: "Dépense ajoutée",
        description: "La nouvelle dépense a été enregistrée avec succès.",
      });
      router.push("/expenses");
    } catch (error: any) {
      console.error("Failed to add expense:", error);
      toast({
        variant: "destructive",
        title: "Échec de l'ajout",
        description: error.message || "Impossible d'enregistrer la dépense.",
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
          <Link href="/expenses" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-3xl font-headline font-semibold tracking-tight">Nouvelle Dépense</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Détails de la dépense</CardTitle>
          <CardDescription>Remplissez les informations ci-dessous pour enregistrer une nouvelle dépense.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'article ou du service</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Ampoules LED" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant (en {currencySymbol})</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 15000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une catégorie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(categoryTranslations).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de la dépense</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: fr })
                              ) : (
                                <span>Choisir une date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Facultatif)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ajoutez une note ou un détail pertinent..."
                        className="resize-none"
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
                  Enregistrer la Dépense
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
