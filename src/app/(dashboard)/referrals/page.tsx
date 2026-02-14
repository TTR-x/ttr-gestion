
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Construction } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";

export default function ReferralsPage() {
    const { isSuperAdmin } = useAuth();
    
    // This page is now deprecated and its content is handled by the external ABT app.
    // It's kept for routing purposes and to inform admins.

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-headline font-semibold tracking-tight flex items-center gap-3">
                        Programme de Parrainage
                    </h1>
                </div>
            </div>

            <Card className="text-center py-12">
                <CardHeader>
                    <Construction className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="mt-4 text-2xl font-bold">Cette page n'est plus active</CardTitle>
                    <CardDescription className="max-w-md mx-auto">
                        La gestion du programme de parrainage et des ambassadeurs se fait désormais via l'application dédiée "TTR Ambassadeur".
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Cette section a été retirée de TTR Gestion pour offrir une expérience plus riche et centralisée aux ambassadeurs.
                    </p>
                </CardContent>
                {isSuperAdmin && (
                     <CardFooter className="justify-center">
                        <Button asChild>
                            <a href="#" target="_blank" rel="noopener noreferrer">
                                <Link2 className="mr-2 h-4 w-4" />
                                Accéder à l'app TTR Ambassadeur
                            </a>
                        </Button>
                     </CardFooter>
                )}
            </Card>
        </div>
    );
}

