"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { getDeviceOverrideToken, markTokenAsUsed, replaceDevice } from '@/lib/email/device-override-email';
import Link from 'next/link';

function ConfirmDeviceOverrideContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token manquant dans l\'URL.');
            return;
        }

        handleConfirmOverride(token);
    }, [token]);

    const handleConfirmOverride = async (token: string) => {
        try {
            // 1. Get token data
            const tokenData = await getDeviceOverrideToken(token);

            if (!tokenData) {
                setStatus('error');
                setMessage('Token invalide ou introuvable.');
                return;
            }

            // 2. Check if token is expired
            if (tokenData.expiresAt < Date.now()) {
                setStatus('expired');
                setMessage('Ce lien a expiré. Veuillez demander un nouveau lien.');
                return;
            }

            // 3. Check if token was already used
            if (tokenData.used) {
                setStatus('error');
                setMessage('Ce lien a déjà été utilisé.');
                return;
            }

            // 4. Replace device
            await replaceDevice(tokenData.businessId, tokenData.newDeviceId);

            // 5. Mark token as used
            await markTokenAsUsed(token);

            setStatus('success');
            setMessage('L\'appareil a été remplacé avec succès. Vous pouvez maintenant vous connecter.');

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);

        } catch (error: any) {
            console.error('Error confirming device override:', error);
            setStatus('error');
            setMessage(error.message || 'Une erreur est survenue lors de la confirmation.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
                        {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                        {status === 'expired' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
                        Confirmation de l'écrasement
                    </CardTitle>
                    <CardDescription>
                        {status === 'loading' && 'Vérification en cours...'}
                        {status === 'success' && 'Opération réussie'}
                        {status === 'error' && 'Erreur'}
                        {status === 'expired' && 'Lien expiré'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                            <p className="text-sm text-muted-foreground">
                                Traitement de votre demande...
                            </p>
                        </div>
                    )}

                    {status === 'success' && (
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <AlertTitle className="text-green-900 dark:text-green-100">
                                Appareil remplacé avec succès !
                            </AlertTitle>
                            <AlertDescription className="text-green-800 dark:text-green-200">
                                {message}
                            </AlertDescription>
                        </Alert>
                    )}

                    {status === 'error' && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertTitle>Échec de la confirmation</AlertTitle>
                            <AlertDescription>{message}</AlertDescription>
                        </Alert>
                    )}

                    {status === 'expired' && (
                        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <AlertTitle className="text-orange-900 dark:text-orange-100">
                                Lien expiré
                            </AlertTitle>
                            <AlertDescription className="text-orange-800 dark:text-orange-200">
                                {message}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-col gap-2 pt-4">
                        {status === 'success' && (
                            <p className="text-sm text-muted-foreground text-center">
                                Redirection automatique vers la page de connexion dans 3 secondes...
                            </p>
                        )}

                        <Button asChild className="w-full">
                            <Link href="/login">
                                Aller à la page de connexion
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ConfirmDeviceOverridePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <ConfirmDeviceOverrideContent />
        </Suspense>
    );
}
