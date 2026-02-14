
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { Loader2, LogOut } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";

export default function PendingSetupPage() {
  const { logout, currentUser } = useAuth();

  return (
    <Card className="shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 text-foreground">
          <AppLogo className="h-16 w-16" />
        </div>
        <CardTitle className="text-2xl font-headline">Configuration en attente</CardTitle>
        <CardDescription>
          Bonjour, {currentUser?.displayName || "Employé(e)"}.<br/>
          L'application n'est pas encore entièrement configurée.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">
          Un administrateur doit terminer la configuration initiale de l'entreprise. Veuillez le contacter et réessayer plus tard.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </Button>
      </CardFooter>
    </Card>
  );
}
