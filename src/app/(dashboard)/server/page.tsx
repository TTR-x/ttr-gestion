"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, HardHat } from "lucide-react";

export default function ServerPage() {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-headline font-semibold tracking-tight">Mon Serveur (beta)</h1>
            
            <div className="flex items-center justify-center pt-16">
                 <Card className="text-center w-full max-w-lg shadow-lg">
                    <CardHeader>
                       <HardHat className="mx-auto h-12 w-12 text-primary" />
                      <CardTitle>Fonctionnalité en cours de développement</CardTitle>
                      <CardDescription>
                          L'espace "Mon Serveur" est en cours de construction pour vous offrir une expérience de gestion de fichiers sécurisée et performante.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Cette fonctionnalité sera bientôt disponible. Merci de votre patience !
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
