
"use client"; 

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg text-center shadow-2xl">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-headline">Oups ! Une erreur s'est produite.</CardTitle>
          <CardDescription className="text-muted-foreground">
            Une erreur inattendue est survenue. Nous nous excusons pour le désagrément.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error.digest && (
             <p className="text-sm text-muted-foreground">Digest de l'erreur : {error.digest}</p>
          )}
          <p className="text-sm text-destructive mt-2">{error.message || "Veuillez réessayer plus tard."}</p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button onClick={() => reset()} variant="default">
            Réessayer
          </Button>
          <Button onClick={() => window.location.href = '/overview'} variant="outline">
            Aller au tableau de bord
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
