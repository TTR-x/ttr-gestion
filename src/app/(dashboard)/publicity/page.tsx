
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, ArrowRight, Target, Disc, MessageCircle, Wand2, Bot, Loader2, Sparkles, CheckCircle, Trophy, Users, TrendingUp, Calendar, Image as ImageIcon, Video, Globe, Smartphone, BarChart, PenTool, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useAuth } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import { runAssistant, type AssistantInput } from '@/ai/flows/assistant-flow';
import { marked } from 'marked';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';

const AdProposalSkeleton = () => (
    <Card className="shadow-lg animate-pulse">
        <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        </CardContent>
    </Card>
);

const adPackages = [
    {
        price: 3000,
        title: "Test",
        objective: "Tester une offre ou un produit sur une audience ciblée.",
        duration: "2-3 jours",
        platforms: "Facebook",
        results: "Idéal pour une première analyse du marché à faible coût."
    },
    {
        price: 5000,
        title: "Découverte",
        objective: "Augmenter la notoriété locale et générer de l'intérêt.",
        duration: "3-5 jours",
        platforms: "Facebook, Instagram",
        results: "Toucher plusieurs milliers de personnes dans votre zone."
    },
    {
        price: 10000,
        title: "Essentiel",
        objective: "Générer des prospects qualifiés et des premières conversions.",
        duration: "5-7 jours",
        platforms: "Facebook, Instagram",
        results: "Obtenir des messages, des appels ou des visites."
    },
    {
        price: 30000,
        title: "Croissance",
        objective: "Campagne optimisée pour un meilleur retour sur investissement.",
        duration: "7-10 jours",
        platforms: "Facebook, Instagram",
        results: "Acquisition de clients réguliers et augmentation des ventes."
    },
    {
        price: 50000,
        title: "Avancé",
        objective: "Acquisition continue de clients avec retargeting.",
        duration: "10-15 jours",
        platforms: "Facebook, Instagram, Audience Network",
        results: "Base de clients solide et flux de ventes constant."
    },
    {
        price: 100000,
        title: "Professionnel",
        objective: "Gestion mensuelle complète avec optimisation continue.",
        duration: "30 jours",
        platforms: "Tous les canaux Meta",
        results: "Domination du marché local et notoriété accrue."
    },
    {
        price: 250000,
        title: "Premium",
        objective: "Stratégie marketing agressive et diversification des canaux.",
        duration: "30 jours",
        platforms: "Meta, Google, TikTok (selon pertinence)",
        results: "Expansion rapide et capture de nouvelles parts de marché."
    },
    {
        price: 500000,
        title: "Partenaire",
        objective: "Partenariat stratégique pour une croissance exponentielle.",
        duration: "Continu",
        platforms: "Stratégie multi-canaux sur mesure",
        results: "Objectifs de croissance ambitieux et domination du marché."
    },
    {
        price: 1000000,
        title: "Impact Max",
        objective: "Stratégie à grande échelle pour un impact national ou international.",
        duration: "Continu",
        platforms: "Approche omnicanale personnalisée",
        results: "Positionnement en tant que leader de votre secteur."
    },
];

const servicePackages = [
    {
        icon: ImageIcon,
        title: "Affiche Professionnelle",
        price: "dès 1500F",
        priceRaw: 1500,
        description: "Des affiches percutantes pour vos événements, promotions ou communications.",
        details: ["Conception sur mesure selon vos besoins", "Adapté à votre charte graphique", "Format numérique (PNG/JPEG/PDF) prêt à l'impression", "Jusqu'à 2 propositions et 3 révisions"],
        contactMessage: "Bonjour, je suis intéressé(e) par la création d'une affiche professionnelle."
    },
    {
        icon: Video,
        title: "Montage Vidéo 'Short'",
        price: "1000F / vidéo",
        priceRaw: 1000,
        description: "Vidéos courtes et dynamiques (Reels, Shorts, TikTok) pour captiver votre audience.",
        details: ["Montage à partir de vos rushs", "Ajout de textes, transitions et musique tendance", "Format vertical optimisé pour les mobiles", "Idéal pour présenter un produit ou partager une astuce"],
        contactMessage: "Bonjour, je souhaite commander un montage vidéo de type 'short'."
    },
    {
        icon: Globe,
        title: "Site Web Statique",
        price: "45000F",
        priceRaw: 45000,
        description: "Une vitrine en ligne professionnelle pour présenter votre activité, vos services et vos contacts.",
        details: ["Design moderne et responsive (adapté aux mobiles)", "Jusqu'à 5 pages (Accueil, À propos, Services, etc.)", "Inclus : Nom de domaine (.site, .com, .net...), email pro et SEO de base", "Hébergement sécurisé pour 1 an"],
        contactMessage: "Bonjour, je suis intéressé(e) par la création d'un site web statique."
    },
    {
        icon: Smartphone,
        title: "Site & App Web Dynamique",
        price: "sur devis",
        priceRaw: 0,
        description: "Des solutions sur mesure : e-commerce, espace client, application métier...",
        details: ["Analyse de vos besoins et rédaction du cahier des charges", "Développement de fonctionnalités spécifiques", "Base de données et panneau d'administration", "Maintenance et support technique"],
        contactMessage: "Bonjour, j'aimerais discuter d'un projet de site ou d'application web dynamique."
    },
    {
        icon: BarChart,
        title: "Gestion Réseaux Sociaux",
        price: "sur devis",
        priceRaw: 0,
        description: "Confiez-nous la gestion de vos pages pour une présence en ligne professionnelle et constante.",
        details: ["Création de contenu (visuels et textes)", "Planification et publication régulière", "Animation de la communauté et modération", "Rapport de performance mensuel"],
        contactMessage: "Bonjour, je suis intéressé(e) par vos services de gestion des réseaux sociaux."
    },
];

function AdCampaignTab() {
    const { businessProfile, getCurrencySymbol } = useAuth();
    const [proposal, setProposal] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const currency = getCurrencySymbol();

    useEffect(() => {
        if (businessProfile) {
            const staticProposal = {
                headline: `Boostez la visibilité de ${businessProfile.name}`,
                targetAudience: `Clients potentiels intéressés par "${businessProfile.type}" dans votre région, sur les réseaux sociaux.`,
                channels: "Facebook & Instagram",
                keyMessage: `Découvrez l'excellence de ${businessProfile.name}, votre référence pour ${businessProfile.type}. Qualité et service garantis.`,
                callToAction: "Contactez-nous maintenant via WhatsApp",
                budgetRecommendation: "Démarrez une campagne efficace à partir de seulement 5000 FCFA pour toucher des milliers de clients."
            };
            setProposal(staticProposal);
        }
    }, [businessProfile]);

    const createWhatsAppLink = (message: string) => `https://wa.me/+22899974389?text=${encodeURIComponent(message)}`;

    if (loading) return <AdProposalSkeleton />;
    if (!proposal) return <p>Chargement de la proposition...</p>;

    return (
        <div className="space-y-8">
            <Card className="shadow-lg border-2 border-primary/20 animate-in fade-in-50 duration-500">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-primary">{proposal.headline}</CardTitle>
                    <CardDescription>
                        Proposition de campagne pour votre entreprise, <span className="font-semibold">{businessProfile?.name}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-start gap-4">
                        <Target className="h-6 w-6 text-muted-foreground mt-1 shrink-0" />
                        <div>
                            <h4 className="font-semibold">Public Cible</h4>
                            <p className="text-muted-foreground">{proposal.targetAudience}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Disc className="h-6 w-6 text-muted-foreground mt-1 shrink-0" />
                        <div>
                            <h4 className="font-semibold">Canaux Recommandés</h4>
                            <p className="text-muted-foreground">{proposal.channels}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <MessageCircle className="h-6 w-6 text-muted-foreground mt-1 shrink-0" />
                        <div>
                            <h4 className="font-semibold">Message Clé</h4>
                            <p className="text-muted-foreground">{proposal.keyMessage}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Nos Forfaits Publicitaires</CardTitle>
                    <CardDescription>
                        Choisissez le budget qui vous convient pour démarrer. Chaque palier augmente la portée et l'impact de votre campagne.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {adPackages.map(pkg => {
                        const contactMessage = `Bonjour, je suis intéressé(e) par le forfait publicitaire "${pkg.title}" de ${pkg.price.toLocaleString('fr-FR')} ${currency} pour mon entreprise "${businessProfile?.name}".`;
                        return (
                            <Dialog key={pkg.price}>
                                <Card className="flex flex-col text-center shadow-md hover:shadow-primary/20 hover:border-primary/50 transition-all border">
                                    <CardHeader>
                                        <p className="font-semibold text-primary">{pkg.title}</p>
                                        <CardTitle className="text-4xl font-bold">{pkg.price.toLocaleString('fr-FR')}<span className="text-xl font-normal">{currency}</span></CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow" />
                                    <CardFooter>
                                        <DialogTrigger asChild>
                                            <Button className="w-full">Choisir ce plan</Button>
                                        </DialogTrigger>
                                    </CardFooter>
                                </Card>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl">Forfait {pkg.title} - {pkg.price.toLocaleString('fr-FR')} {currency}</DialogTitle>
                                        <DialogDescription>
                                            Voici ce que vous obtenez avec ce budget.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="flex items-center gap-3"><Trophy className="h-5 w-5 text-primary" /><p><span className="font-semibold">Objectif :</span> {pkg.objective}</p></div>
                                        <div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-primary" /><p><span className="font-semibold">Durée estimée :</span> {pkg.duration}</p></div>
                                        <div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><p><span className="font-semibold">Plateformes :</span> {pkg.platforms}</p></div>
                                        <div className="flex items-center gap-3"><TrendingUp className="h-5 w-5 text-primary" /><p><span className="font-semibold">Résultats attendus :</span> {pkg.results}</p></div>
                                        <Separator className="my-4" />
                                        <p className="text-xs text-muted-foreground">
                                            Sur ce budget de <span className="font-bold">{pkg.price.toLocaleString('fr-FR')} {currency}</span>, des frais de gestion de <span className="font-bold">10%</span> (soit {(pkg.price * 0.1).toLocaleString('fr-FR')} {currency}) sont appliqués. Le budget net investi dans la publicité est de <span className="font-bold">{(pkg.price * 0.9).toLocaleString('fr-FR')} {currency}</span>.
                                        </p>
                                    </div>
                                    <DialogFooter>
                                        <Button asChild className="w-full" size="lg">
                                            <Link href={createWhatsAppLink(contactMessage)} target="_blank">
                                                <MessageCircle className="mr-2" /> Contacter pour Lancer
                                            </Link>
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )
                    })}
                </CardContent>
            </Card>
        </div>
    )
}

function AdToolsTab() {
    const { businessProfile, currentUser } = useAuth();
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim() || !businessProfile || !currentUser) return;
        setIsLoading(true);
        setResult('');

        const adPrompt = `En tant que TRIX Business, crée un post pour les réseaux sociaux (ton chaleureux et professionnel, avec emojis) pour la demande suivante: "${prompt}". L'entreprise est ${businessProfile.name}, spécialisée dans ${businessProfile.type}. Après le post, ajoute une section "--- Prochaines Étapes ---". Dans cette section, adopte un ton de conseiller et suggère des actions concrètes. Par exemple: "Pour que cette publication ait un maximum d'impact, je vous propose de l'accompagner d'une très belle photo ou vidéo. Publiez-la sur Facebook et votre statut WhatsApp. Si vous voulez un visuel encore plus professionnel, vous pouvez commander une affiche sur mesure depuis l'onglet 'Services'. Bonne chance !". Adapte la suggestion au contexte.`;

        const assistantInput: AssistantInput = {
            history: [{ role: 'user', content: adPrompt }],
            userDisplayName: currentUser.displayName,
            businessContext: {
                name: businessProfile.name,
                type: businessProfile.type,
                country: businessProfile.country
            }
        };

        try {
            const response = await runAssistant(assistantInput);
            setResult(response);
        } catch (error) {
            console.error("Failed to generate ad content:", error);
            setResult("Désolé, une erreur est survenue. Veuillez réessayer.");
        } finally {
            setIsLoading(false);
        }
    };

    const createWhatsAppLinkForService = () => {
        const message = `Bonjour, je suis intéressé(e) par vos services créatifs (affiche, gestion des réseaux, etc.) pour mon entreprise "${businessProfile?.name}". Pouvons-nous en discuter ?`;
        return `https://wa.me/+22899974389?text=${encodeURIComponent(message)}`;
    };

    const createGoogleImagesSearchLink = () => {
        const query = prompt.replace(/"/g, ''); // Remove quotes for a cleaner search
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
    };

    const lowerCaseResult = result.toLowerCase();
    const showServiceButton = lowerCaseResult.includes('affiche') || lowerCaseResult.includes('service') || lowerCaseResult.includes('réseaux sociaux');
    const showImageSearchButton = lowerCaseResult.includes('image') || lowerCaseResult.includes('photo');

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Générateur d'Idées de Publication</CardTitle>
                <CardDescription>
                    Besoin d'inspiration ? Décrivez votre idée (ex: "promotion de -20% sur les boissons", "arrivée de nouveaux savons") et laissez TRIX Business rédiger une proposition de post pour vos réseaux sociaux.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Textarea
                        placeholder="Ex: Annoncer une promotion '2 achetés, 1 offert' sur les croissants ce weekend."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">TRIX peut faire des erreurs. Vérifiez les informations importantes.</p>
                </div>
                <Button onClick={handleGenerate} disabled={isLoading || !prompt.trim()}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Générer une proposition
                </Button>
            </CardContent>
            {(isLoading || result) && (
                <CardFooter className="flex flex-col items-start gap-4 border-t pt-6">
                    <h3 className="font-semibold flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> Résultat de TRIX Business :</h3>
                    {isLoading ? (
                        <div className="space-y-2 w-full">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    ) : (
                        <div className="space-y-4 w-full">
                            <div className="prose dark:prose-invert max-w-none prose-p:my-2"
                                dangerouslySetInnerHTML={{ __html: marked.parse(result) as string }}
                            />
                            {(showServiceButton || showImageSearchButton) && (
                                <div className="flex flex-wrap gap-2 pt-4 border-t">
                                    {showServiceButton && (
                                        <Button asChild>
                                            <a href={createWhatsAppLinkForService()} target="_blank" rel="noopener noreferrer">
                                                <PenTool className="mr-2 h-4 w-4" /> Commander un service créatif
                                            </a>
                                        </Button>
                                    )}
                                    {showImageSearchButton && (
                                        <Button asChild variant="outline">
                                            <a href={createGoogleImagesSearchLink()} target="_blank" rel="noopener noreferrer">
                                                <ImageIcon className="mr-2 h-4 w-4" /> Trouver une image sur Google
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </CardFooter>
            )}
        </Card>
    );
}

function ServicesTab() {
    const { businessProfile } = useAuth();
    const createWhatsAppLink = (message: string) => `https://wa.me/+22899974389?text=${encodeURIComponent(message)}`;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-bold">Nos Services Créatifs & Techniques</CardTitle>
                <CardDescription>
                    Au-delà de la publicité, nous proposons des services pour construire et améliorer votre image de marque.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {servicePackages.map(pkg => {
                    const ServiceIcon = pkg.icon;
                    const contactMessage = pkg.contactMessage + ` (Entreprise: ${businessProfile?.name || 'Non spécifiée'})`;
                    return (
                        <Dialog key={pkg.title}>
                            <Card className="flex flex-col text-left shadow-md hover:shadow-primary/20 hover:border-primary/50 transition-all border">
                                <CardHeader>
                                    <ServiceIcon className="h-8 w-8 mb-2 text-primary" />
                                    <CardTitle>{pkg.title}</CardTitle>
                                    <CardDescription>{pkg.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-3xl font-bold">{pkg.price}</p>
                                </CardContent>
                                <CardFooter>
                                    <DialogTrigger asChild>
                                        <Button className="w-full">Commander</Button>
                                    </DialogTrigger>
                                </CardFooter>
                            </Card>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="text-2xl">{pkg.title}</DialogTitle>
                                    <DialogDescription>{pkg.description}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <p className="text-4xl font-bold">{pkg.price}</p>
                                    <ul className="space-y-2">
                                        {pkg.details.map(detail => (
                                            <li key={detail} className="flex items-start gap-3">
                                                <CheckCircle className="h-5 w-5 text-green-500 mt-1 shrink-0" />
                                                <p>{detail}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <DialogFooter>
                                    <Button asChild className="w-full" size="lg">
                                        <Link href={createWhatsAppLink(contactMessage)} target="_blank">
                                            <MessageCircle className="mr-2" /> Commander ce service
                                        </Link>
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    );
                })}
            </CardContent>
        </Card>
    );
}


export default function PublicityPage() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center space-y-4">
                <div className="inline-block p-4 bg-primary/10 rounded-full">
                    <Sparkles className="mx-auto h-12 w-12 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight">Espace Publicité & Services</h1>
                <p className="text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">
                    Votre centre de commande pour booster la visibilité et l'image de votre entreprise.
                </p>
            </div>

            <Tabs defaultValue="campaign">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="campaign">Campagne</TabsTrigger>
                    <TabsTrigger value="tools">Outils</TabsTrigger>
                    <TabsTrigger value="services">Services</TabsTrigger>
                </TabsList>
                <TabsContent value="campaign" className="mt-6">
                    <AdCampaignTab />
                </TabsContent>
                <TabsContent value="tools" className="mt-6">
                    <AdToolsTab />
                </TabsContent>
                <TabsContent value="services" className="mt-6">
                    <ServicesTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}




