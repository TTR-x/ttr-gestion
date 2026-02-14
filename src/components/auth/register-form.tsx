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
import { Loader2, Rocket, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useLoading } from "@/providers/loading-provider";
import { AppLogo } from "@/components/layout/app-logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { RegistrationProgress } from "@/components/auth/registration-progress";

const registerSchema = z.object({
  userName: z.string().min(2, { message: "Votre nom doit contenir au moins 2 caractères." }),
  email: z.string().email({ message: "Veuillez entrer une adresse email valide." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
  confirmPassword: z.string().min(6, { message: "La confirmation du mot de passe est requise." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { signupAndCreateWorkspace } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoading();
  const [showPassword, setShowPassword] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RegisterFormValues | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      userName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function handleTriggerSubmit(values: RegisterFormValues) {
    setFormData(values);
    setIsDialogOpen(true);
  }

  async function handleFinalSubmit() {
    if (!formData) return;
    setIsDialogOpen(false);
    showLoader();
    try {
      await signupAndCreateWorkspace({
        email: formData.email,
        password: formData.password,
        userName: formData.userName,
      });
      toast({ title: "Compte créé avec succès !", description: "Veuillez maintenant configurer votre entreprise." });
    } catch (error: any) {
      console.error("Échec de l'inscription:", error);
      let description = "Une erreur est survenue lors de la création de votre compte.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Cette adresse email est déjà utilisée par un autre compte.";
      }
      toast({
        variant: "destructive",
        title: "Échec de l'inscription",
        description: description,
      });
      hideLoader();
    }
  }

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    showLoader();
    router.push('/login');
  };

  return (
    <div className="w-full space-y-8 py-8">
      <RegistrationProgress currentStep={1} />

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              En créant votre compte vous acceptez notre politique et nos conditions d'utilisation. Votre compte se déconnectera automatiquement après 3 jours d'inutilisation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="link" asChild>
              <Link href="https://support.ttrgestion.site" target="_blank">En savoir plus</Link>
            </Button>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalSubmit}>Accepter et Continuer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-2 text-center">
        <div className="flex justify-center items-center mb-6 text-primary">
          <AppLogo className="h-20 w-20" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
          Créez votre compte
        </h1>
        <p className="text-muted-foreground text-lg">
          Inscrivez-vous gratuitement et transformez votre gestion.
        </p>
      </div>

      <div className="bg-card/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-border/50 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleTriggerSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Votre nom complet</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: ABALO julien"
                      {...field}
                      disabled={isLoading}
                      className="h-12 text-base rounded-xl bg-background/50 focus:bg-background transition-colors"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Votre Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="nom@exemple.com"
                      autoComplete="email"
                      {...field}
                      disabled={isLoading}
                      className="h-12 text-base rounded-xl bg-background/50 focus:bg-background transition-colors"
                    />
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
                  <FormLabel className="text-base font-semibold">Mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative isolate">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimum 6 caractères"
                        autoComplete="new-password"
                        {...field}
                        disabled={isLoading}
                        className="h-12 text-base rounded-xl bg-background/50 focus:bg-background transition-colors pr-12 w-full"
                      />
                      <div
                        onClick={() => !isLoading && setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer z-50 hover:opacity-70 transition-opacity"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Confirmer le mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative isolate">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Retapez votre mot de passe"
                        autoComplete="new-password"
                        {...field}
                        disabled={isLoading}
                        className="h-12 text-base rounded-xl bg-background/50 focus:bg-background transition-colors pr-12 w-full"
                      />
                      <div
                        onClick={() => !isLoading && setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer z-50 hover:opacity-70 transition-opacity"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <Rocket className="mr-3 h-5 w-5" />
                  Créer mon compte
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>

      <div className="space-y-6 text-center">
        <p className="text-muted-foreground text-base">
          Déjà un compte ?&nbsp;
          <a href="/login" onClick={handleNavigate} className="text-primary hover:underline font-bold">
            Connectez-vous
          </a>
        </p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
          En créant votre compte, vous acceptez notre <a href="https://www.ttrgestion.site/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">Politique d'utilisation</a> et notre <a href="https://www.ttrgestion.site/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">Politique de Confidentialité</a>.
        </p>
      </div>
    </div>
  );
}
