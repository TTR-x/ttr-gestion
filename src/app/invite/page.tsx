
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ShieldCheck, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { validateInviteTokenAndCreateUser, getInviteTokenData } from '@/lib/firebase/database';
import { AppLogo } from '@/components/layout/app-logo';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

const inviteSchema = z.object({
  displayName: z.string().min(2, "Le nom doit avoir au moins 2 caractères."),
  phoneNumber: z.string(), // Will be populated from token
  password: z.string().min(6, { message: "Le mot de passe doit faire au moins 6 caractères." }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
});
type InviteFormValues = z.infer<typeof inviteSchema>;

function InvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenData, setTokenData] = useState<{ employeePhoneNumber: string; businessName: string } | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [linkingMessage, setLinkingMessage] = useState<string | null>(null);

  const token = searchParams.get('token');

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { displayName: "", phoneNumber: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) {
      setError('Lien d\'invitation invalide ou manquant.');
      setIsLoadingToken(false);
      return;
    }

    async function verifyToken(tokenStr: string) {
      try {
        const data = await getInviteTokenData(tokenStr);
        if (!data) {
          setError("Ce lien d'invitation est invalide.");
        } else {
          setTokenData(data);
          form.setValue('phoneNumber', data.employeePhoneNumber);
        }
      } catch (err: any) {
        setError(err.message || "Une erreur est survenue lors de la validation du lien.");
      } finally {
        setIsLoadingToken(false);
      }
    }
    verifyToken(token);
  }, [token, form]);


  async function onSubmit(values: InviteFormValues) {
    if (!token) return;

    setIsSubmitting(true);
    setLinkingMessage("Création de votre compte...");
    try {
      const fullPhoneNumber = values.phoneNumber;
      const sanitizedPhoneNumber = fullPhoneNumber.replace(/[^0-9]/g, '');
      const userEmail = `employee+${sanitizedPhoneNumber}@ttr.app`;

      const userCredential = await createUserWithEmailAndPassword(auth, userEmail, values.password);
      const firebaseUser = userCredential.user;

      setLinkingMessage("Liaison à l'entreprise...");
      await validateInviteTokenAndCreateUser({
        token,
        userData: {
          uid: firebaseUser.uid,
          displayName: values.displayName,
          email: userEmail,
        }
      });

      toast({ title: "Compte créé avec succès !", description: "Connexion en cours..." });

      setLinkingMessage("Connexion à votre espace de travail...");

      // Let the AuthProvider handle the redirection after login.
      await login(userEmail, values.password);

    } catch (error: any) {
      console.error("Employee creation error:", error);
      let description = "Impossible de finaliser l'inscription.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Ce numéro de téléphone est déjà associé à un compte. Veuillez vous connecter ou contacter votre administrateur.";
      } else if (error.message.includes("invalide")) {
        description = error.message;
      }
      toast({ variant: "destructive", title: "Erreur de création", description });
      setIsSubmitting(false);
      setLinkingMessage(null);
    }
  }

  if (linkingMessage) {
    return (
      <Card className="shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4 text-foreground">
            <AppLogo className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl font-headline">Finalisation en cours</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{linkingMessage}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingToken) {
    return (
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader><Skeleton className="h-8 w-3/4 mx-auto" /></CardHeader>
          <CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-destructive">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-destructive">Lien Invalide</CardTitle>
            <CardDescription>{error || "Une erreur inconnue s'est produite."}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push('/login')}>Retour à la page de connexion</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }


  return (
    <div className="w-full max-w-md">
      <div className="flex justify-center mb-4 text-foreground">
        <AppLogo className="h-16 w-16" />
      </div>
      <Card className="shadow-2xl">
        <CardHeader className="text-center">
          <UserPlus className="h-12 w-12 mx-auto text-primary" />
          <CardTitle className="text-2xl font-headline">Rejoindre {tokenData.businessName}</CardTitle>
          <CardDescription>
            Finalisez votre compte employé en définissant votre mot de passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Votre Nom Complet</FormLabel>
                  <FormControl><Input placeholder="Ex: Jean Dupont" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Votre numéro de téléphone</FormLabel>
                  <FormControl><Input type="tel" {...field} disabled={true} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Choisissez un mot de passe</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmez le mot de passe</FormLabel>
                  <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Créer mon compte
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            En créant votre compte, vous acceptez notre <a href="https://www.ttrgestion.site/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Politique d'utilisation</a> et notre <a href="https://www.ttrgestion.site/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Politique de Confidentialité</a>.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<Loader2 className="animate-spin h-8 w-8" />}>
      <InvitePageContent />
    </Suspense>
  );
}
