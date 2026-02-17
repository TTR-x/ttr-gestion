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
import { useToast } from "@/hooks/use-toast";
import React, { useState } from "react";
import { Loader2, Phone, KeyRound, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "@/lib/countries";
import { useAuth } from "@/providers/auth-provider";

const employeeLoginSchema = z.object({
  countryCode: z.string().min(1, "Veuillez sélectionner un pays."),
  phoneNumber: z.string().min(8, { message: "Veuillez entrer un numéro de téléphone valide." }),
  password: z.string().min(6, { message: "Le mot de passe est requis." }),
});
type EmployeeLoginFormValues = z.infer<typeof employeeLoginSchema>;

export function EmployeePhoneForm() {
  const { toast } = useToast();
  const { loginWithPhoneNumberAndPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<EmployeeLoginFormValues>({
    resolver: zodResolver(employeeLoginSchema),
    defaultValues: { countryCode: "+228", phoneNumber: "", password: "" },
  });

  async function onSubmit(values: EmployeeLoginFormValues) {
    setIsSubmitting(true);
    try {
      const fullPhoneNumber = `${values.countryCode}${values.phoneNumber}`;
      await loginWithPhoneNumberAndPassword(fullPhoneNumber, values.password);
      toast({ title: "Connexion réussie !" });
      // AuthProvider will handle redirect on success
    } catch (error: any) {
      console.error("Employee login error:", error);
      toast({
        variant: "destructive",
        title: "Échec de la connexion",
        description: error.message || "Numéro de téléphone ou mot de passe incorrect.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="countryCode"
            render={({ field }) => (
              <FormItem className="w-1/3">
                <FormLabel>Pays</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {countries.map(c => (
                      <SelectItem key={c.code} value={c.dial_code}>
                        <div className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span>{c.dial_code}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Numéro (sans indicatif)</FormLabel>
                <FormControl>
                  <Input placeholder="90123456" {...field} disabled={isSubmitting} type="tel" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mot de passe</FormLabel>
              <FormControl>
                <div className="relative isolate">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground z-10"
                    aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><KeyRound className="mr-2 h-4 w-4" />Se connecter</>}
        </Button>
      </form>
    </Form>
  );
}
