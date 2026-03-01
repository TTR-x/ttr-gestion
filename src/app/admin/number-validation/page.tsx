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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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

const countryPhoneData = [
    { country: "Bénin", code: "+229", flag: "🇧🇯" },
    { country: "Burkina Faso", code: "+226", flag: "🇧🇫" },
    { country: "Cap-Vert", code: "+238", flag: "🇨🇻" },
    { country: "Côte d'Ivoire", code: "+225", flag: "🇨🇮" },
    { country: "Gambie", code: "+220", flag: "🇬🇲" },
    { country: "Ghana", code: "+233", flag: "🇬🇭" },
    { country: "Guinée", code: "+224", flag: "🇬🇳" },
    { country: "Guinée-Bissau", code: "+245", flag: "🇬🇼" },
    { country: "Liberia", code: "+231", flag: "🇱🇷" },
    { country: "Mali", code: "+223", flag: "🇲🇱" },
    { country: "Mauritanie", code: "+222", flag: "🇲🇷" },
    { country: "Niger", code: "+227", flag: "🇳🇪" },
    { country: "Nigeria", code: "+234", flag: "🇳🇬" },
    { country: "Sénégal", code: "+221", flag: "🇸🇳" },
    { country: "Sierra Leone", code: "+232", flag: "🇸🇱" },
    { country: "Togo", code: "+228", flag: "🇹🇬" },
    { country: "Cameroun", code: "+237", flag: "🇨🇲" },
    { country: "République centrafricaine", code: "+236", flag: "🇨🇫" },
    { country: "Tchad", code: "+235", flag: "🇹🇩" },
    { country: "Congo-Brazzaville", code: "+242", flag: "🇨🇬" },
    { country: "Congo-Kinshasa", code: "+243", flag: "🇨🇩" },
    { country: "Guinée équatoriale", code: "+240", flag: "🇬🇶" },
    { country: "Gabon", code: "+241", flag: "🇬🇦" },
    { country: "Afrique du Sud", code: "+27", flag: "🇿🇦" },
    { country: "Algérie", code: "+213", flag: "🇩🇿" },
    { country: "Angola", code: "+244", flag: "🇦🇴" },
    { country: "Botswana", code: "+267", flag: "🇧🇼" },
    { country: "Égypte", code: "+20", flag: "🇪🇬" },
    { country: "Éthiopie", code: "+251", flag: "🇪🇹" },
    { country: "Kenya", code: "+254", flag: "🇰🇪" },
    { country: "Maroc", code: "+212", flag: "🇲🇦" },
    { country: "Mozambique", code: "+258", flag: "🇲🇿" },
    { country: "Ouganda", code: "+256", flag: "🇺🇬" },
    { country: "Rwanda", code: "+250", flag: "🇷🇼" },
    { country: "Soudan", code: "+249", flag: "🇸🇩" },
    { country: "Tanzanie", code: "+255", flag: "🇹🇿" },
    { country: "Zambie", code: "+260", flag: "🇿🇲" },
    { country: "Zimbabwe", code: "+263", flag: "🇿🇼" },
    { country: "France", code: "+33", flag: "🇫🇷" },
    { country: "Belgique", code: "+32", flag: "🇧🇪" },
    { country: "Suisse", code: "+41", flag: "🇨🇭" },
    { country: "Canada", code: "+1", flag: "🇨🇦" },
    { country: "États-Unis", code: "+1", flag: "🇺🇸" },
    { country: "Chine", code: "+86", flag: "🇨🇳" },
    { country: "Inde", code: "+91", flag: "🇮🇳" },
    { country: "Brésil", code: "+55", flag: "🇧🇷" }
].sort((a, b) => a.country.localeCompare(b.country));

const formSchema = z.object({
    countryCode: z.string(),
    phoneNumber: z.string()
        .min(7, "Le numéro est trop court")
        .max(12, "Le numéro est trop long")
        .regex(/^[0-9\s-]+$/, "Format de numéro invalide"),
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
            countryCode: businessProfile?.country || "Bénin",
            phoneNumber: (businessProfile?.businessPhoneNumber || "").replace(/^\+\d+\s?/, ""),
        },
    });

    useEffect(() => {
        if (businessProfile) {
            form.setValue('countryCode', businessProfile.country || "Bénin");
            if (businessProfile.businessPhoneNumber) {
                const countryCode = countryPhoneData.find(c => c.country === businessProfile.country)?.code || "+228";
                const cleanedNumber = businessProfile.businessPhoneNumber.replace(countryCode, "").trim();
                form.setValue('phoneNumber', cleanedNumber);
            }
        }
    }, [businessProfile, form]);

    useEffect(() => {
        if (businessProfile?.businessPhoneNumberStatus === 'rejected') {
            setShowRefusalModal(true);
        }
    }, [businessProfile?.businessPhoneNumberStatus]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!currentUser || !businessId) return;

        const code = countryPhoneData.find(c => c.country === values.countryCode)?.code || "+228";
        const fullNumber = `${code}${values.phoneNumber.replace(/\s/g, "")}`;

        setIsLoading(true);
        try {
            // 1. Submit the validation request for admin approval
            await createNumberValidationRequest(
                currentUser.uid,
                businessId,
                businessProfile?.name || "Entreprise",
                fullNumber
            );

            // 2. IMPORTANT: Update the USER document instead of the business profile
            // This avoids "Permission Denied" if RDB rules are strict on business profiles
            // and fulfills the request to have it in the user's document.
            await updateUserProfile(currentUser.uid, {
                phoneNumber: fullNumber,
                // We'll use this temporarily on the user object to track their specific pending status
                // even if the business profile isn't yet updated by an admin
            } as any, currentUser.uid, businessId);

            // 3. We ALSO update the business profile as a placeholder 
            // but we wrap it in a try-catch to not block the user if it fails
            try {
                await updateBusinessProfile(businessId, {
                    businessPhoneNumber: fullNumber,
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

            // Redirect to Dashboard (AuthProvider will handle the next blocking steps)
            router.push('/overview');
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
                <RegistrationProgress currentStep={3} />
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
                                <div className="grid grid-cols-3 gap-2">
                                    <FormField
                                        control={form.control}
                                        name="countryCode"
                                        render={({ field }) => (
                                            <FormItem className="col-span-1">
                                                <FormLabel>Indicatif</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="px-2">
                                                            <SelectValue placeholder="Pays" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {countryPhoneData.map((c) => (
                                                            <SelectItem key={`${c.country}-${c.code}`} value={c.country}>
                                                                <span className="flex items-center gap-2">
                                                                    <span className="text-lg">{c.flag}</span>
                                                                    <span>{c.code}</span>
                                                                </span>
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
                                            <FormItem className="col-span-2">
                                                <FormLabel>Numéro WhatsApp</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            placeholder="00 00 00 00"
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
                                </div>
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
