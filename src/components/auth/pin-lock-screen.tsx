
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { Loader2, ShieldCheck, LogOut, Delete } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PinLockScreen() {
    const { currentUser, verifyPin, logout } = useAuth();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length <= 4) {
            setPin(value);
            if(error) setError('');
            if (value.length === 4) {
                handleSubmit(value);
            }
        }
    };

    const handleSubmit = async (finalPin: string) => {
        if (finalPin.length !== 4) {
            setError("Le code PIN doit contenir 4 chiffres.");
            return;
        }
        setIsLoading(true);
        setError('');
        
        setTimeout(async () => {
            const success = await verifyPin(finalPin);
            if (!success) {
                setError("Code PIN incorrect. Veuillez réessayer.");
                setPin('');
                toast({
                    variant: "destructive",
                    title: "Code PIN incorrect",
                });
            }
            setIsLoading(false);
        }, 300);
    };

    const handleKeypadClick = (num: number | string) => {
        if (isLoading) return;
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if(error) setError('');
            if (newPin.length === 4) {
                handleSubmit(newPin);
            }
        }
    };

    const handleDelete = () => {
        if (isLoading) return;
        setPin(pin.slice(0, -1));
        if(error) setError('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm text-center shadow-2xl animate-in fade-in-50 zoom-in-95">
                <CardHeader>
                     <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle>Bonjour, {currentUser?.displayName} !</CardTitle>
                    <CardDescription>Veuillez entrer votre code PIN pour accéder à votre espace.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(pin); }}>
                        <div className="flex justify-center gap-3 mb-4 h-4">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`h-3 w-3 rounded-full border border-primary transition-colors ${pin.length > i ? 'bg-primary' : 'bg-transparent'}`} />
                            ))}
                        </div>
                        <Input
                            id="pin-input"
                            type="password"
                            value={pin}
                            onChange={handlePinChange}
                            maxLength={4}
                            className="absolute opacity-0 pointer-events-none"
                            autoFocus
                        />
                         {error && <p className="text-sm font-medium text-destructive mt-2 min-h-[20px]">{error}</p>}
                         {!error && <div className="min-h-[20px] mt-2"></div>}

                         <div className="grid grid-cols-3 gap-2 mt-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <Button key={num} type="button" variant="outline" className="h-16 text-2xl font-light" onClick={() => handleKeypadClick(num)} disabled={isLoading}>
                                    {num}
                                </Button>
                            ))}
                            <div />
                            <Button type="button" variant="outline" className="h-16 text-2xl font-light" onClick={() => handleKeypadClick(0)} disabled={isLoading}>0</Button>
                            <Button type="button" variant="ghost" className="h-16" onClick={handleDelete} disabled={isLoading}>
                                <Delete className="h-6 w-6" />
                            </Button>
                         </div>
                    </form>
                </CardContent>
                <CardFooter>
                    <Button variant="link" size="sm" className="w-full text-muted-foreground h-auto" onClick={logout}>
                       <LogOut className="mr-2 h-4 w-4" /> Ce n'est pas vous ? Déconnexion
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
