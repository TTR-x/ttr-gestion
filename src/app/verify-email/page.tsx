
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    MailCheck,
    Loader2,
    LogOut,
    HelpCircle,
    Smartphone,
    Monitor,
    PlayCircle,
    RefreshCw,
    AlertCircle,
    ChevronRight
} from "lucide-react";
import { useAuth } from '@/providers/auth-provider';
import { AppLogo } from '@/components/layout/app-logo';
import { useToast } from '@/hooks/use-toast';
import { RegistrationProgress } from "@/components/auth/registration-progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { useLoading } from '@/providers/loading-provider';
import { auth } from '@/lib/firebase/config';

export default function VerifyEmailPage() {
    const { currentUser, sendVerificationEmail, logout, refreshAuthContext } = useAuth();
    const { showLoader, hideLoader } = useLoading();
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<'mobile' | 'pc' | null>(null);

    const handleResend = async () => {
        setIsSending(true);
        try {
            await sendVerificationEmail();
            toast({
                title: "E-mail renvoyé !",
                description: "Un nouveau lien de vérification a été envoyé à votre adresse e-mail."
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible d'envoyer l'e-mail. Veuillez réessayer plus tard."
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleReload = async () => {
        showLoader();
        try {
            if (auth.currentUser) {
                // Force Firebase to reload the user profile to pick up the verification flag
                await auth.currentUser.reload();
                // Refresh our internal state
                await refreshAuthContext();

                // If it's still not verified, we show a message. 
                // If it IS verified, AuthProvider's useEffect will handle the redirection.
                if (!auth.currentUser.emailVerified) {
                    toast({
                        title: "Pas encore vérifié",
                        description: "Nous n'avons pas encore reçu la confirmation. Veuillez cliquer sur le lien reçu par e-mail.",
                        variant: "destructive"
                    });
                }
            }
        } catch (error: any) {
            console.error("Verification reload failed:", error);
            toast({
                title: "Erreur",
                description: "Une erreur est survenue lors de la vérification du statut.",
                variant: "destructive"
            });
        } finally {
            hideLoader();
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4 animate-in fade-in duration-500">
            <div className="w-full max-w-lg space-y-8">
                <RegistrationProgress currentStep={3} />

                <Card className="shadow-2xl border-primary/10 overflow-hidden bg-card">
                    <CardHeader className="text-center pb-2 pt-8">
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="absolute inset-0 animate-ping bg-primary/20 rounded-full" />
                                <div className="relative bg-primary/10 p-4 rounded-full">
                                    <MailCheck className="h-10 w-10 text-primary" />
                                </div>
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-black tracking-tight">Vérifiez vos e-mails</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Nous avons envoyé un lien de confirmation à :<br />
                            <span className="font-bold text-foreground block mt-1 px-3 py-1 bg-muted rounded-full inline-block">
                                {currentUser?.email}
                            </span>
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-6">
                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-900/80 dark:text-blue-200/80 leading-relaxed">
                                Cliquez sur le bouton dans l'e-mail pour activer votre compte.
                                N'oubliez pas de vérifier vos <b>indésirables (spams)</b>.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={handleReload}
                                className="w-full h-14 text-lg font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                <RefreshCw className="mr-2 h-5 w-5" />
                                J'ai vérifié mon e-mail
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleResend}
                                disabled={isSending}
                                className="w-full h-12 font-semibold rounded-xl"
                            >
                                {isSending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <PlayCircle className="mr-2 h-4 w-4" />
                                )}
                                Renvoyer le lien de validation
                            </Button>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col bg-muted/50 border-t p-6 gap-4">
                        {/* Zone "On vous aide" */}
                        <Dialog onOpenChange={(open) => !open && setSelectedDevice(null)}>
                            <DialogTrigger asChild>
                                <div className="w-full p-4 bg-background border rounded-2xl cursor-pointer hover:border-primary/50 transition-colors group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                                <HelpCircle className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm">On vous aide ?</h4>
                                                <p className="text-xs text-muted-foreground">Comment valider sur mobile ou PC</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] rounded-3xl">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black">Besoin d'aide ?</DialogTitle>
                                    <DialogDescription className="text-base text-muted-foreground pt-2">
                                        Sur quel appareil utilisez-vous TTR Gestion actuellement ?
                                        Nous avons préparé un guide vidéo adapté.
                                    </DialogDescription>
                                </DialogHeader>

                                {!selectedDevice ? (
                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <Button
                                            variant="outline"
                                            className="h-32 rounded-2xl flex flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all"
                                            onClick={() => setSelectedDevice('mobile')}
                                        >
                                            <Smartphone className="h-8 w-8 text-primary" />
                                            <span className="font-bold">Sur Mobile</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-32 rounded-2xl flex flex-col gap-3 border-2 hover:border-primary hover:bg-primary/5 transition-all"
                                            onClick={() => setSelectedDevice('pc')}
                                        >
                                            <Monitor className="h-8 w-8 text-primary" />
                                            <span className="font-bold">Sur Ordinateur</span>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 pt-4 animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="aspect-video bg-black rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/10 shadow-2xl">
                                            {/* Placeholder Video - Link to be added later */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                            <img
                                                src={selectedDevice === 'mobile'
                                                    ? "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80&w=800"
                                                    : "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800"
                                                }
                                                className="absolute inset-0 w-full h-full object-cover opacity-60"
                                                alt="Tutorial thumbnail"
                                            />
                                            <div className="relative z-10 flex flex-col items-center gap-3">
                                                <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center shadow-2xl">
                                                    <PlayCircle className="h-8 w-8 text-white fill-current ml-0.5" />
                                                </div>
                                                <p className="text-white font-bold text-sm bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
                                                    Tutoriel {selectedDevice === 'mobile' ? 'Mobile' : 'PC'}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            className="w-full rounded-xl"
                                            onClick={() => setSelectedDevice(null)}
                                        >
                                            Changer d'appareil
                                        </Button>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>

                        <div className="flex items-center justify-between pt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive gap-2 h-auto py-2"
                                onClick={logout}
                            >
                                <LogOut className="h-4 w-4" />
                                Se déconnecter
                            </Button>

                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-50">
                                TTR GESTION V2
                            </p>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
