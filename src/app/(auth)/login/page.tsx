
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
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="admin">Administrateur</TabsTrigger>
                <TabsTrigger value="employee">Employé</TabsTrigger>
              </TabsList>

              {/* Conteneur avec hauteur minimale pour stabiliser le composant lors du switch */}
              <div className="min-h-[350px] flex flex-col pt-4">
                <TabsContent value="admin" className="m-0 mt-0 outline-none focus-visible:ring-0">
                  <LoginForm />
                  <div className="flex justify-center text-sm pt-6 mt-auto">
                    <LoginFooter />
                  </div>
                </TabsContent>

                <TabsContent value="employee" className="m-0 mt-0 outline-none focus-visible:ring-0">
                  <div className="space-y-6">
                    <EmployeePhoneForm />
                    <div className="text-center pt-8 text-muted-foreground text-sm">
                      <p>Connectez-vous avec vos identifiants fournis par votre administrateur.</p>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
        <div id="recaptcha-container-login" className="flex justify-center mt-4"></div>
      </div>
    </div>
  );
}
