
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// This is a placeholder page for the OAuth authorization step.
// A real implementation would:
// 1. Validate the incoming request parameters (client_id, redirect_uri, scope, response_type).
// 2. Check if the user is logged into TTR Gestion. If not, show the login form.
// 3. If logged in, display the details of the client application asking for permission.
// 4. Upon user consent, generate an authorization code and redirect back to the client's redirect_uri.

export default function AuthorizePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Autoriser l'accès</CardTitle>
          <CardDescription>Une application tierce demande l'accès à votre compte.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Logique d'autorisation en cours de construction...</p>
        </CardContent>
        <CardFooter className="flex justify-between">
            <Button variant="outline">Refuser</Button>
            <Button>Autoriser</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
