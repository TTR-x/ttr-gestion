
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
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
import { addPlanningItem } from "@/lib/firebase/database";
import Link from "next/link";
import React from "react";
import { useLoading } from "@/providers/loading-provider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const planningItemSchema = z.object({
  title: z.string().min(3, { message: "Le titre doit contenir au moins 3 caractères." }),
  date: z.date({ required_error: "Une date d'échéance est requise." }),
  type: z.enum(["task", "payment", "delivery", "appointment", "other"], { required_error: "Veuillez sélectionner un type." }),
  status: z.enum(["pending", "completed", "cancelled"], { required_error: "Veuillez sélectionner un statut." }),
  notes: z.string().optional(),
  reminderEnabled: z.boolean().default(false),
  reminderTime: z.enum(["on-day", "1-day-before", "2-days-before"]).default("on-day"),
});

type PlanningItemFormValues = z.infer<typeof planningItemSchema>;

export default function NewPlanningItemPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, activeWorkspaceId } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoading();

  const form = useForm<PlanningItemFormValues>({
    resolver: zodResolver(planningItemSchema),
    defaultValues: {
      title: "",
      type: "task",
      status: "pending",
      notes: "",
      reminderEnabled: false,
      reminderTime: "on-day",
    },
  });

  const reminderEnabled = form.watch("reminderEnabled");

  async function onSubmit(values: PlanningItemFormValues) {
    if (!currentUser?.uid || !currentUser.displayName || !currentUser.businessId || !activeWorkspaceId) {
      toast({ variant: "destructive", title: "Erreur", description: "Action non autorisée." });
      return;
    }
    showLoader();
    try {
      await addPlanningItem(currentUser.businessId, {
        ...values,
        workspaceId: activeWorkspaceId,
        date: values.date.toISOString(),
      }, currentUser.displayName, currentUser.uid);

      toast({
        title: "Élément planifié",
        description: `"${values.title}" a été ajouté à votre planning.`,
      });
      router.push("/planning");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Échec de l'ajout", description: error.message });
    } finally {
        hideLoader();
    }
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild onClick={showLoader}>
          <Link href="/planning"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-3xl font-headline font-semibold tracking-tight">Planifier un Élément</h1>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Nouvel élément de planning</CardTitle>
          <CardDescription>Ajoutez une tâche, un paiement, une livraison ou tout autre événement important.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Payer la facture d'électricité" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date d'échéance</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type d'élément</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="task">Tâche</SelectItem>
                          <SelectItem value="payment">Paiement</SelectItem>
                          <SelectItem value="delivery">Livraison</SelectItem>
                          <SelectItem value="appointment">Rendez-vous</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut Initial</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="completed">Terminé</SelectItem>
                          <SelectItem value="cancelled">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Facultatif)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ajoutez des détails, un numéro de téléphone, une référence..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="space-y-4">
                 <FormField
                  control={form.control}
                  name="reminderEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Activer un rappel</FormLabel>
                        <FormDescription>
                          Recevoir une notification avant l'échéance.
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
                {reminderEnabled && (
                   <FormField
                    control={form.control}
                    name="reminderTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quand recevoir le rappel ?</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="on-day">Le jour même</SelectItem>
                                <SelectItem value="1-day-before">1 jour avant</SelectItem>
                                <SelectItem value="2-days-before">2 jours avant</SelectItem>
                            </SelectContent>
                         </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ajouter au planning
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
