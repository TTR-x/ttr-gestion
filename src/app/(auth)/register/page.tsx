import { RegisterContent } from "@/components/auth/register-content";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inscription - Créez votre Compte TTR Gestion',
  description: "Inscrivez-vous sur TTR Gestion et créez votre compte administrateur. Démarrez votre essai gratuit et transformez la gestion de votre entreprise avec notre outil tout-en-un.",
};

export default function RegisterPage() {
  return <RegisterContent />;
}
