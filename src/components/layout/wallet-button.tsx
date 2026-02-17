"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { requestPayout } from '@/lib/firebase/database';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MonoyiIcon } from '@/components/icons/monoyi-icon';
import { Info, Loader2, CheckCircle, ArrowLeft, ArrowDown, ArrowUp, Sparkles, HelpCircle } from 'lucide-react';
import Link from 'next/link';

// import { VerificationGuard } from '@/components/auth/verification-guard'; // Guard temporarily disabled (file not found)
// import { useOfflineGuard } from '@/components/status/offline-guard'; // Guard temporarily disabled (file not found)

export function WalletButton() {
    const { businessProfile, currentUser, businessId, showLoader } = useAuth();
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'home' | 'withdraw' | 'deposit'>('home');
    const [amount, setAmount] = useState(0);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Guard states
    const [showGuard, setShowGuard] = useState(false);
    const [pendingAction, setPendingAction] = useState<'withdraw' | 'deposit' | null>(null);

    const { toast } = useToast();

    // Use referralBalance as Monoyi points
    const balance = businessProfile?.referralBalance || 0;
    const minPayout = 5; // Minimum 5 Monoyi
    const conversionRate = 800; // 1 Monoyi = 800 FCFA
    const isVerified = businessProfile?.isVerified ?? false;

    useEffect(() => {
        if (!open) {
            setView('home');
            setAmount(0);
            setError('');
            setShowGuard(false);
            setPendingAction(null);
        }
    }, [open]);

    // Mock checkOnline since hook is missing
    const checkOnline = () => true;
    // const { checkOnline } = useOfflineGuard();

    const handleRequestPayout = async () => {
        if (!checkOnline()) return;

        setError('');

        // Logic for unverified limit:
        // If not verified, strict limit check could be here. 
        // For now, we allow the request but will flag it or limit it in backend/process.
        // User requirements just mentioned telling them about the limit.
        if (!isVerified && amount > 10) {
            setError("Limite de retrait atteinte pour compte non vérifié (Max: 10 Monoyi/mois).");
            return;
        }

        if (amount < minPayout) {
            setError(`Le montant minimum pour un retrait est de ${minPayout} Monoyi.`);
            return;
        }
        if (amount > balance) {
            setError("Vous n'avez pas assez de Monoyi pour ce retrait.");
            return;
        }
        if (!businessId || !currentUser?.uid) return;

        setIsSubmitting(true);
        try {
            await requestPayout(
                businessId,
                amount,
                currentUser.uid,
                currentUser.displayName || 'Utilisateur',
                'Mobile Money'
            );

            toast({
                title: "Demande envoyée",
                description: `Votre demande de retrait de ${amount} Monoyi (${(amount * conversionRate).toLocaleString()} FCFA) a été soumise.`,
            });
            setOpen(false);
        } catch (err) {
            console.error(err);
            setError("Une erreur est survenue lors de l'envoi de votre demande.");
            toast({
                variant: 'destructive',
                title: "Erreur",
                description: "Impossible de soumettre la demande.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWithdrawClick = () => {
        if (balance < minPayout) {
            toast({
                variant: "destructive",
                title: "Solde insuffisant",
                description: `Vous devez avoir au moins ${minPayout} Monoyi pour effectuer un retrait.`,
            });
            return;
        }

        // if (!isVerified) {
        //     setPendingAction('withdraw');
        //     setShowGuard(true);
        //     return;
        // }

        setView('withdraw');
    };

    const handleDepositClick = () => {
        // if (!isVerified) {
        //     setPendingAction('deposit');
        //     setShowGuard(true);
        //     return;
        // }
        setView('deposit');
    };

    const handleGuardContinue = () => {
        setShowGuard(false);
        if (pendingAction) {
            setView(pendingAction);
            setPendingAction(null);
        }
    };

    return (
        <>
            {/* <VerificationGuard
                isOpen={showGuard}
                onClose={() => setShowGuard(false)}
                onContinueAnyway={handleGuardContinue}
            /> */}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-full border px-3 h-9 bg-secondary/50 hover:bg-secondary gap-2 transition-all">
                        <MonoyiIcon className="h-4 w-4 text-primary" />
                        <span className="font-bold text-primary">{balance.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">Monoyi</span>
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md">
                    {view === 'home' && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-center">Mon Portefeuille Monoyi</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col items-center justify-center py-6 space-y-4">
                                <div className="bg-primary/10 p-6 rounded-full">
                                    <MonoyiIcon className="h-16 w-16 text-primary" />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-sm text-muted-foreground">Solde actuel</p>
                                    <h2 className="text-4xl font-bold tracking-tight text-primary">{balance.toLocaleString()} Monoyi</h2>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        ≈ {(balance * conversionRate).toLocaleString()} FCFA
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full pt-4">
                                    <Button size="lg" className="flex flex-col h-auto py-4 gap-1 bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900 border" onClick={handleWithdrawClick}>
                                        <ArrowUp className="h-6 w-6 mb-1" />
                                        <span className="font-bold">Retrait</span>
                                        <span className="text-[10px] opacity-80">Cash Out</span>
                                    </Button>
                                    <Button size="lg" className="flex flex-col h-auto py-4 gap-1 bg-green-100 text-green-700 hover:bg-green-200 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900 border" onClick={handleDepositClick}>
                                        <ArrowDown className="h-6 w-6 mb-1" />
                                        <span className="font-bold">Dépôt</span>
                                        <span className="text-[10px] opacity-80">Recharger</span>
                                    </Button>
                                </div>

                                <div className="flex flex-col gap-2 pt-4 items-center text-xs text-muted-foreground w-full border-t mt-2">
                                    <Link href="https://ambassadeur.ttrgestion.site/" target="_blank" className="hover:text-primary underline-offset-4 hover:underline transition-colors flex items-center gap-1">
                                        <Sparkles className="h-3 w-3" /> Gagner des Monoyi
                                    </Link>
                                    <Link href="https://monoyi.ttrgestion.site/" target="_blank" className="hover:text-primary underline-offset-4 hover:underline transition-colors flex items-center gap-1">
                                        <HelpCircle className="h-3 w-3" /> C'est quoi le Monoyi ?
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}

                    {view === 'withdraw' && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setView('home')}>
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <DialogTitle>Effectuer un retrait</DialogTitle>
                                </div>
                                <DialogDescription>
                                    1 Monoyi = {conversionRate} FCFA. Min: {minPayout} Monoyi.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                {!isVerified && (
                                    <Alert variant="default" className="bg-orange-50 border-orange-200">
                                        <Info className="h-4 w-4 text-orange-600" />
                                        <AlertDescription className="text-orange-700 text-xs">
                                            Compte non vérifié : Retrait limité à <strong>10 Monoyi/mois</strong>.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="amount">Montant à retirer (Monoyi)</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(Number(e.target.value))}
                                        placeholder={`Min: ${minPayout}`}
                                        max={balance}
                                        min={minPayout}
                                        autoFocus
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Dispo: {balance} Monoyi</span>
                                        <span className="font-bold text-primary">Recevoir: {(amount * conversionRate).toLocaleString()} FCFA</span>
                                    </div>
                                </div>
                                {error && (
                                    <Alert variant="destructive">
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <Button onClick={handleRequestPayout} disabled={isSubmitting || amount < minPayout || balance < minPayout} className="w-full">
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isSubmitting ? 'Traitement...' : 'Confirmer le retrait'}
                                </Button>
                            </div>
                        </>
                    )}

                    {view === 'deposit' && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => setView('home')}>
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <DialogTitle>Recharger mon compte</DialogTitle>
                                </div>
                                <DialogDescription>
                                    Échangez vos FCFA en Monoyi pour profiter des services premium.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-8 text-center space-y-4">
                                <div className="bg-secondary p-4 rounded-lg inline-block">
                                    <MonoyiIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                                </div>
                                <p className="text-muted-foreground">
                                    La fonctionnalité de rechargement automatique arrive bientôt.
                                </p>
                                <Button variant="outline" asChild className="w-full">
                                    <Link href={createWhatsAppLink()} target='_blank'>
                                        Contacter le support pour échanger
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );

    function createWhatsAppLink() {
        const phoneNumber = "+22899974389";
        const message = `Bonjour, je souhaite échanger mes FCFA en Monoyi pour mon entreprise "${businessProfile?.name}".`;
        return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    }
}
