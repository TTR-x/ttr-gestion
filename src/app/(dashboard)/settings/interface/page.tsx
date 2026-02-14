"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Monitor, Type, Languages, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InterfaceSettingsPage() {
    const { toast } = useToast();
    const [autoOpenEdge, setAutoOpenEdge] = useState(true);

    useEffect(() => {
        // Load setting from localStorage (default to true)
        const storedValue = localStorage.getItem('ttr-settings-auto-open-edge');
        if (storedValue !== null) {
            setAutoOpenEdge(storedValue === 'true');
        }
    }, []);

    const handleAutoOpenChange = (checked: boolean) => {
        setAutoOpenEdge(checked);
        localStorage.setItem('ttr-settings-auto-open-edge', String(checked));
        toast({
            title: checked ? "Ouverture auto activée" : "Ouverture auto désactivée",
            description: checked
                ? "Le menu latéral s'ouvrira automatiquement lors d'une vente rapide."
                : "Le menu latéral restera fermé lors d'une vente rapide (cliquez sur l'éclair pour ouvrir).",
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-headline font-semibold tracking-tight">Interface & Personnalisation</h1>
                <p className="text-muted-foreground">Personnalisez votre expérience visuelle et comportementale.</p>
            </div>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-primary" />
                        Comportement du Menu Latéral
                    </CardTitle>
                    <CardDescription>
                        Gérez comment le menu "Edge" (calculatrice flottante) interagit avec vous.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                        <div className="space-y-0.5">
                            <Label className="text-base flex items-center gap-2">
                                <Zap className="h-4 w-4 text-yellow-500" />
                                Ouverture automatique lors d'une vente
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Ouvrir automatiquement le menu latéral lorsque vous ajoutez une vente rapide ou un reçu.
                            </p>
                        </div>
                        <Switch
                            checked={autoOpenEdge}
                            onCheckedChange={handleAutoOpenChange}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-md opacity-80">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Type className="h-5 w-5 text-primary" />
                        Affichage (Bientôt)
                    </CardTitle>
                    <CardDescription>
                        Options d'accessibilité et de confort visuel.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/30">
                        <div className="space-y-0.5">
                            <Label className="text-base text-muted-foreground">Taille du texte</Label>
                            <p className="text-sm text-muted-foreground">
                                Ajustez la taille de la police pour une meilleure lisibilité.
                            </p>
                        </div>
                        <Badge variant="outline" className="text-muted-foreground">À venir</Badge>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-md opacity-80">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Languages className="h-5 w-5 text-primary" />
                        Langue (Bientôt)
                    </CardTitle>
                    <CardDescription>
                        Choisissez la langue de l'interface.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/30">
                        <div className="space-y-0.5">
                            <Label className="text-base text-muted-foreground">Langue de l'application</Label>
                            <p className="text-sm text-muted-foreground">
                                Français (Par défaut)
                            </p>
                        </div>
                        <Badge variant="outline" className="text-muted-foreground">À venir</Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
