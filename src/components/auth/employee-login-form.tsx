
"use client";

// This component is now obsolete and replaced by EmployeePhoneForm.
// It is kept in case of future logic changes but is not currently used.

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
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { getEmployeeLoginDetails } from "@/lib/firebase/database";
import { useRouter } from 'next/navigation';
import { useLoading } from "@/providers/loading-provider";

const employeeLoginSchema = z.object({
  username: z.string().min(1, { message: "Le nom d'utilisateur est requis." }),
  password: z.string().min(1, { message: "Le mot de passe est requis." }),
  teamCode: z.string().min(1, { message: "Le code d'équipe est requis." }),
});
type EmployeeLoginFormValues = z.infer<typeof employeeLoginSchema>;

export function EmployeeLoginForm() {
  const { toast } = useToast();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<EmployeeLoginFormValues>({
    resolver: zodResolver(employeeLoginSchema),
    defaultValues: { username: "", password: "", teamCode: "" },
  });

  async function onSubmit(values: EmployeeLoginFormValues) {
    setIsSubmitting(true);
    try {
      throw new Error("This login method is deprecated. Please use phone number login.");
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Échec de la connexion",
            description: error.message,
        });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="teamCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code d'équipe</FormLabel>
              <FormControl>
                <Input placeholder="Entrez le code d'équipe" {...field} disabled={true} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom d'utilisateur</FormLabel>
              <FormControl>
                <Input placeholder="Entrez votre nom d'utilisateur" {...field} disabled={true} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mot de passe</FormLabel>
               <div className="relative">
                <FormControl>
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      autoComplete="current-password"
                      {...field} 
                      disabled={true}
                    />
                </FormControl>
                <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                    disabled={true}
                >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={true}>
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Connexion (Obsolète)"}
        </Button>
      </form>
    </Form>
  );
}
