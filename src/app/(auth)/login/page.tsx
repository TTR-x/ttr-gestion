
import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginFooter } from "@/components/auth/login-footer";
import { AppLogo } from "@/components/layout/app-logo";
import { EmployeePhoneForm } from "@/components/auth/employee-phone-form";

export const metadata: Metadata = {
  title: 'Connexion - TTR Gestion',
  description: "Connectez-vous à votre espace TTR Gestion. Accès sécurisé pour administrateurs (email) et employés (téléphone). Prenez le contrôle de votre entreprise.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex justify-center mb-4 text-foreground">
          <AppLogo className="h-16 w-16" />
        </div>
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline">
              Espace de connexion
            </CardTitle>
            <CardDescription>
              Connectez-vous en tant qu'administrateur ou employé.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="admin">Administrateur</TabsTrigger>
                <TabsTrigger value="employee">Employé</TabsTrigger>
              </TabsList>
              <TabsContent value="admin" className="pt-4">
                <LoginForm />
                <CardFooter className="flex justify-center text-sm pt-6">
                  <LoginFooter />
                </CardFooter>
              </TabsContent>
              <TabsContent value="employee" className="pt-4">
                <EmployeePhoneForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <div id="recaptcha-container-login" className="flex justify-center mt-4"></div>
      </div>
    </div>
  );
}
