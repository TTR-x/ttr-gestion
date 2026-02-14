"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/providers/auth-provider';
import { createNumberValidationRequest, updateBusinessProfile, updateUserProfile } from '@/lib/firebase/database';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AppLogo } from '@/components/layout/app-logo';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RegistrationProgress } from "@/components/auth/registration-progress";

const formSchema = z.object({
    phoneNumber: z.string()
        .min(8, "Le numéro est trop court")
        .max(15, "Le numéro est trop long")
        .regex(/^\+?[0-9\s-]+$/, "Format de numéro invalide"),
});

export default function NumberValidationPage() {
    const { currentUser, businessProfile, refreshAuthContext, businessId } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showRefusalModal, setShowRefusalModal] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            phoneNumber: businessProfile?.businessPhoneNumber || "",
        },
    });

    useEffect(() => {
        if (businessProfile?.businessPhoneNumberStatus === 'rejected') {
            setShowRefusalModal(true);
        }
    }, [businessProfile?.businessPhoneNumberStatus]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!currentUser || !businessId) return;

        setIsLoading(true);
        try {
            // 1. Submit the validation request for admin approval
            await createNumberValidationRequest(
                currentUser.uid,
                businessId,
                businessProfile?.name || "Entreprise",
                values.phoneNumber
            );

            // 2. IMPORTANT: Update the USER document instead of the business profile
            // This avoids "Permission Denied" if RDB rules are strict on business profiles
            // and fulfills the request to have it in the user's document.
            await updateUserProfile(currentUser.uid, {
                phoneNumber: values.phoneNumber,
                // We'll use this temporarily on the user object to track their specific pending status
                // even if the business profile isn't yet updated by an admin
            } as any, currentUser.uid, businessId);

            // 3. We ALSO update the business profile as a placeholder 
            // but we wrap it in a try-catch to not block the user if it fails
            try {
                await updateBusinessProfile(businessId, {
                    businessPhoneNumber: values.phoneNumber,
                    businessPhoneNumberStatus: 'pending'
                }, currentUser.uid);
            } catch (e) {
                console.warn("Secondary business profile update failed (expected if rules are strict):", e);
            }

            await refreshAuthContext();

            toast({
                title: "Numéro enregistré !",
                description: "Votre numéro a été enregistré. Vous pouvez maintenant accéder à votre tableau de bord.",
            });

            // Redirect to Step 5 (Welcome) instead of Overview
            router.push('/welcome');
        } catch (error: any) {
            console.error("Number validation submission failed:", error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Une erreur est survenue lors de l'enregistrement du numéro.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                <RegistrationProgress currentStep={4} />
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <AppLogo className="h-16 w-16" />
                    </div>
                    <h1 className="text-3xl font-headline font-bold">Vérification WhatsApp</h1>
                    <p className="text-muted-foreground mt-2">
                        Un numéro WhatsApp valide est requis pour la sécurité et les notifications.
                    </p>
                </div>

                <Card className="shadow-xl border-primary/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Phone className="h-5 w-5 text-primary" />
                            Enregistrez votre numéro
                        </CardTitle>
                        <CardDescription>
                            Ce numéro sera utilisé pour valider votre compte et vous envoyer des alertes importantes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="phoneNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Numéro de téléphone WhatsApp</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        placeholder="+225 00 00 00 00 00"
                                                        className="pl-10"
                                                        {...field}
                                                    />
                                                    <MessageSquare className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                    )}
                                    Valider et Continuer
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="flex justify-center border-t bg-muted/10 p-4 text-[11px] text-muted-foreground text-center">
                        En continuant, vous acceptez de recevoir des notifications importantes via WhatsApp concernant votre compte TTR Gestion.
                    </CardFooter>
                </Card>

                <div className="text-center">
                    <a
                        href={`https://wa.me/+22899974389?text=${encodeURIComponent("Bonjour, j'ai besoin d'aide pour la validation de mon numéro WhatsApp sur TTR Gestion.")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
                    >
                        <AlertCircle className="h-4 w-4" />
                        Besoin d'aide ? Contactez le support.
                    </a>
                </div>
            </div>

            {/* Modal de refus - Demandé dans les spécifications précédentes */}
            <AlertDialog open={showRefusalModal} onOpenChange={setShowRefusalModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-6 w-6" />
                            Numéro WhatsApp Invalide
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-foreground pt-2">
                            Votre demande de validation précédente a été refusée car le numéro fourni semble être incorrect ou non fonctionnel pour WhatsApp.
                            <br /><br />
                            Veuillez entrer un numéro WhatsApp valide pour continuer à utiliser la plateforme.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setShowRefusalModal(false)}>
                            Compris, je vais corriger ça
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
