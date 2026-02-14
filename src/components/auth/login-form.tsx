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
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import React, { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useLoading } from "@/providers/loading-provider";
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

const loginSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse email valide." }),
  password: z.string().min(1, { message: "Le mot de passe est requis." }),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoading();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      toast({ title: "Connexion réussie", description: "Bon retour !" });
    } catch (error: any) {
      console.error("Échec de la connexion:", error);
      let description = "Une erreur inconnue est survenue. Veuillez réessayer.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "Email ou mot de passe incorrect.";
      }
      toast({
        variant: "destructive",
        title: "Échec de la connexion",
        description: description,
      });
      setIsSubmitting(false);
    }
  }

  const handlePasswordReset = async () => {
    const email = form.getValues("email");
    if (!email) {
      toast({
        variant: "destructive",
        title: "Adresse email manquante",
        description: "Veuillez d'abord entrer votre adresse email.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Demande traitée",
        description: "Si un compte est associé à cet email, un lien de réinitialisation a été envoyé. Vérifiez votre boîte de réception et vos spams.",
        duration: 7000,
      });
    } catch (error: any) {
      console.error("Erreur lors de l'envoi de l'email de réinitialisation :", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de traiter la demande. Vérifiez que l'adresse est correcte et réessayez.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="nom@exemple.com" autoComplete="email" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
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
                      autoComplete="current-password"
                      {...field}
                      disabled={isSubmitting}
                      className="pr-12 w-full"
                    />
                    <div
                      onClick={() => !isSubmitting && setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer z-50 hover:opacity-70 transition-opacity"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="text-right mt-2">
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm font-medium"
              onClick={handlePasswordReset}
              disabled={isSubmitting}
            >
              Mot de passe oublié ?
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "SE CONNECTER"}
        </Button>
      </form>
    </Form>
  );
}
