
"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, ClipboardList, Wallet, Users, Briefcase, History, Sparkles, Puzzle, Video, Settings, Contact, Package, Gift, Megaphone, Lightbulb, ShieldCheck, Key, CalendarCheck, FileText } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { useLoading } from "@/providers/loading-provider";

const features = [
  {
    icon: ShieldCheck,
    title: "Connexion et Gestion de Compte",
    description: "Créez votre compte administrateur et votre espace de travail. Connectez-vous en tant qu'administrateur ou employé. Pour plus de sécurité et de rapidité, activez la connexion par code PIN dans les paramètres. Le système inclut désormais une protection anti-force brute renforcée."
  },
  {
    icon: LayoutDashboard,
    title: "Tableau de Bord",
    description: "Votre cockpit. Obtenez une vue d'ensemble instantanée de votre activité : statistiques clés (ventes du mois, dépenses), arrivées du jour, et activité récente. La section 'Vente Rapide' vous permet de vendre des articles du stock en un clic."
  },
  {
    icon: Sparkles,
    title: "TRIX Business (Assistant IA)",
    description: "Votre consultant IA personnel. Posez des questions sur le marketing, la finance, ou la gestion et obtenez des stratégies et des conseils pratiques pour votre entreprise. Il connaît toutes les fonctionnalités de l'application et peut vous guider."
  },
  {
    icon: ClipboardList,
    title: "Gestion des Prestations (Réservations, Ventes...)",
    description: "Le cœur de votre activité. Enregistrez et suivez toutes vos prestations (réservations d'hôtel, commandes de restaurant, ventes en boutique) avec un statut clair. Imprimez des reçus professionnels pour vos clients."
  },
  {
    icon: Contact,
    title: "Gestion des Clients",
    description: "Centralisez les informations de vos clients. Créez des fiches détaillées, suivez les soldes (total facturé vs total payé) et encaissez des paiements directement depuis leur profil pour mettre à jour leur solde."
  },
  {
    icon: Wallet,
    title: "Trésorerie",
    description: "Maîtrisez vos finances. Suivez toutes les entrées ('revenus rapides' pour les ventes au comptoir) et sorties d'argent ('dépenses') pour connaître votre solde de caisse en temps réel."
  },
  {
    icon: Package,
    title: "Gestion de Stock",
    description: "Suivez votre inventaire, définissez des seuils d'alerte pour éviter les ruptures, et ajustez facilement les quantités. Les articles marqués 'à vendre' apparaissent dans la section 'Vente Rapide' du tableau de bord. Vous pouvez même générer des images de produits avec l'IA."
  },
  {
    icon: CalendarCheck,
    title: "Planification",
    description: "Organisez vos activités futures. Planifiez des tâches, des paiements à effectuer, des livraisons à recevoir ou des rendez-vous. Activez des rappels pour ne rien oublier."
  },
  {
    icon: Briefcase,
    title: "Suivi des Investissements",
    description: "Planifiez et suivez la rentabilité de vos projets de développement. Évaluez le retour sur investissement attendu et prenez des décisions éclairées pour votre croissance. (Accessible aux admins et employés si activé)."
  },
  {
    icon: Gift,
    title: "Programme de Parrainage",
    description: "Le programme de parrainage est géré via une application externe dédiée : TTR Ambassadeur (ABT)."
  },
  {
    icon: Users,
    title: "Gestion des Utilisateurs (Admin)",
    description: "En tant qu'administrateur, ajoutez, modifiez ou désactivez les comptes de vos employés et gérez leurs permissions d'accès aux différentes fonctionnalités."
  },
  {
    icon: History,
    title: "Journal d'Activité",
    description: "Une traçabilité complète pour la sécurité. Consultez un historique détaillé de chaque action effectuée dans l'application : qui a fait quoi, et quand."
  },
  {
    icon: Megaphone,
    title: "Faire une PUB",
    description: "Un raccourci pour nous contacter afin de mettre en place des campagnes publicitaires ciblées pour augmenter la visibilité et les ventes de votre entreprise."
  },
  {
    icon: Lightbulb,
    title: "Conseils & Inspirations",
    description: "Une sélection de proverbes et de citations sur l'entrepreneuriat pour vous motiver et vous inspirer au quotidien."
  },
  {
    icon: Puzzle,
    title: "Espace Jeux",
    description: "Une section de détente pour vous et vos employés (si activée par l'admin). Des jeux de réflexion comme les échecs ou 2048 pour stimuler l'esprit et faire une pause productive."
  },
  {
    icon: Video,
    title: "Tutoriels Vidéo",
    description: "Accédez à des guides vidéo pour maîtriser rapidement l'application, découvrir les nouvelles fonctionnalités et optimiser votre utilisation."
  },
  {
    icon: Settings,
    title: "Paramètres",
    description: "Personnalisez l'application : modifiez les infos de votre entreprise, gérez les accès, créez vos propres types de prestations, activez ou désactivez des modules pour les employés, et gérez vos espaces de travail. Vous pouvez également lier votre numéro WhatsApp pour recevoir des notifications importantes (soumis à validation sous 24h)."
  },
];


export default function FeaturesPage() {
  const { showLoader } = useLoading();
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/settings" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-3xl font-headline font-semibold tracking-tight">Manuel d'Utilisation</h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Un écosystème complet pour votre entreprise</CardTitle>
          <CardDescription>
            TTR Gestion est conçu pour être un outil tout-en-un, simple et puissant. Découvrez ci-dessous le détail de chaque module pour maîtriser pleinement votre application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {features.map((feature, index) => (
            <React.Fragment key={feature.title}>
              <div className="flex items-start gap-4">
                <feature.icon className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </div>
              {index < features.length - 1 && <Separator />}
            </React.Fragment>
          ))}
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/features">Voir la page publique des fonctionnalités</Link>
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
}
