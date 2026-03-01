
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Save, Loader2, KeyRound, Eye, EyeOff, User, Mail, CheckCircle2, XCircle, Send } from "lucide-react";
import Link from 'next/link';
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { useLoading } from '@/providers/loading-provider';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, { message: "Le mot de passe actuel est requis." }),
    newPassword: z.string().min(6, { message: "Le nouveau mot de passe doit faire au moins 6 caractères." }),
    confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Les nouveaux mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;


export default function ProfilePage() {
    const { currentUser, changeUserPassword, sendVerificationEmail, refreshAuthContext } = useAuth();
    const { showLoader } = useLoading();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleResendEmail = async () => {
        setIsVerifying(true);
        try {
            await sendVerificationEmail();
            toast({
                title: "E-mail envoyé",
                description: "Un nouveau lien de vérification a été envoyé à votre adresse e-mail.",
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: error.message || "Impossible d'envoyer l'e-mail de vérification."
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const form = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: ""
        }
    });

    async function onSubmit(values: PasswordFormValues) {
        setIsLoading(true);
        try {
            await changeUserPassword(values.currentPassword, values.newPassword);
            toast({
                title: "Mot de passe modifié",
                description: "Votre mot de passe a été mis à jour avec succès.",
            });
            form.reset();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: error.message || "Impossible de modifier le mot de passe."
            });
        } finally {
            setIsLoading(false);
        }
    }

    if (!currentUser) {
        return <Loader2 className="animate-spin" />;
    }

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/settings" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-3xl font-headline font-semibold tracking-tight">Mon Profil</h1>
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Informations Personnelles</CardTitle>
                    <CardDescription>Vos informations de compte.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Nom complet</p>
                            <p className="font-medium">{currentUser.displayName}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Adresse e-mail</p>
                                <p className="font-medium">{currentUser.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {currentUser.emailVerified ? (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-bold border border-green-500/20">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Vérifié
                                </div>
                            ) : (
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-xs font-bold border border-amber-500/20">
                                        <XCircle className="h-3.5 w-3.5" />
                                        Non vérifié
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-[11px] gap-1.5"
                                        onClick={handleResendEmail}
                                        disabled={isVerifying}
                                    >
                                        {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                        Renvoyer le lien
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center">
                        <KeyRound className="mr-3 h-6 w-6 text-primary" />
                        Changer votre mot de passe
                    </CardTitle>
                    <CardDescription>Pour votre sécurité, nous vous demanderons votre mot de passe actuel.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mot de passe actuel</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nouveau mot de passe</FormLabel>
                                        <div className="relative">
                                            <FormControl>
                                                <Input type={showPassword ? 'text' : 'password'} {...field} disabled={isLoading} />
                                            </FormControl>
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground">
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                                        <FormControl>
                                            <Input type={showPassword ? 'text' : 'password'} {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" /> Enregistrer le nouveau mot de passe
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
