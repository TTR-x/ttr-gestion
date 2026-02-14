"use client";

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface DeviceOverrideDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    userEmail: string;
    isLoading?: boolean;
}

export function DeviceOverrideDialog({
    isOpen,
    onClose,
    onConfirm,
    userEmail,
    isLoading = false
}: DeviceOverrideDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Écraser l'appareil occupé
                    </DialogTitle>
                    <DialogDescription>
                        Cette action est irréversible. Lisez attentivement avant de continuer.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Conséquences importantes</AlertTitle>
                        <AlertDescription className="space-y-2 mt-2">
                            <p>• <strong>L'ancien appareil sera immédiatement déconnecté</strong></p>
                            <p>• <strong>Toutes les actions offline non synchronisées seront perdues</strong></p>
                            <p>• <strong>L'ancien appareil recevra uniquement les données de sa dernière synchronisation</strong></p>
                        </AlertDescription>
                    </Alert>

                    <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            Un <strong>email de confirmation</strong> sera envoyé à{' '}
                            <span className="font-semibold text-foreground">{userEmail}</span>.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Vous devrez cliquer sur le lien dans l'email pour finaliser cette action.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Annuler
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? "Envoi en cours..." : "Envoyer l'email de confirmation"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
