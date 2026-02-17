"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, ArrowRight, Target, Disc, MessageCircle, Wand2, Bot, Loader2, Sparkles, CheckCircle, Trophy, Users, TrendingUp, Calendar, Image as ImageIcon, Video, Globe, Smartphone, BarChart, PenTool, ExternalLink, Facebook, Instagram, Search, MapPin, X, Play, Copy, Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import { runAssistant, type AssistantInput } from '@/ai/flows/assistant-flow';
import { marked } from 'marked';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";

const AdProposalSkeleton = () => (
    <Card className="shadow-lg animate-pulse border-none bg-white/50 dark:bg-slate-900/50">
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
        results: "Idéal pour une première analyse du marché à faible coût.",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
    },
    {
        price: 5000,
        title: "Découverte",
        objective: "Augmenter la notoriété locale et générer de l'intérêt.",
        duration: "3-5 jours",
        platforms: "Facebook, Instagram",
        results: "Toucher plusieurs milliers de personnes dans votre zone.",
        color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
    },
    {
        price: 10000,
        title: "Essentiel",
        objective: "Générer des prospects qualifiés et des premières conversions.",
        duration: "5-7 jours",
        platforms: "Facebook, Instagram",
        results: "Obtenir des messages, des appels ou des visites.",
        color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
    },
    {
        price: 30000,
        title: "Croissance",
        objective: "Campagne optimisée pour un meilleur retour sur investissement.",
        duration: "7-10 jours",
        platforms: "Facebook, Instagram",
        results: "Acquisition de clients réguliers et augmentation des ventes.",
        color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
    },
    {
        price: 50000,
        title: "Avancé",
        objective: "Acquisition continue de clients avec retargeting.",
        duration: "10-15 jours",
        platforms: "Facebook, Instagram, Audience Network",
        results: "Base de clients solide et flux de ventes constant.",
        color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
    },
    {
        price: 100000,
        title: "Professionnel",
        objective: "Gestion mensuelle complète avec optimisation continue.",
        duration: "30 jours",
        platforms: "Tous les canaux Meta",
        results: "Domination du marché local et notoriété accrue.",
        color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
    },
    {
        price: 250000,
        title: "Premium",
        objective: "Stratégie marketing agressive et diversification des canaux.",
        duration: "30 jours",
        platforms: "Meta, Google, TikTok & Panneaux (selon pertinence)",
        results: "Expansion rapide et capture de nouvelles parts de marché.",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
    },
    {
        price: 500000,
        title: "Partenaire",
        objective: "Partenariat stratégique pour une croissance exponentielle.",
        duration: "Continu",
        platforms: "Stratégie 360° : Digital + Physique (Panneaux)",
        results: "Objectifs de croissance ambitieux et domination du marché.",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 bg-gradient-brand"
    },
    {
        price: 1000000,
        title: "Impact Max",
        objective: "Stratégie à grande échelle pour un impact national ou international.",
        duration: "Continu",
        platforms: "Approche omnicanale (TV, Radio, Panneaux, Web)",
        results: "Positionnement en tant que leader de votre secteur.",
        color: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
    },
];

const servicePackages = [
    {
        icon: ImageIcon,
        title: "Affiche Professionnelle",
        price: "1500F",
        priceRaw: 1500,
        description: "Des affiches percutantes pour vos événements, promotions ou communications.",
        details: ["Conception sur mesure selon vos besoins", "Adapté à votre charte graphique", "Format numérique (PNG/JPEG/PDF) prêt à l'impression", "Jusqu'à 2 propositions et 3 révisions"],
        contactMessage: "Bonjour, je suis intéressé(e) par la création d'une affiche professionnelle.",
        color: "text-blue-500"
    },
    {
        icon: Video,
        title: "Montage Vidéo 'Short'",
        price: "1000F / vidéo",
        priceRaw: 1000,
        description: "Vidéos courtes et dynamiques (Reels, Shorts, TikTok) pour captiver votre audience.",
        details: ["Montage à partir de vos rushs", "Ajout de textes, transitions et musique tendance", "Format vertical optimisé pour les mobiles", "Idéal pour présenter un produit ou partager une astuce"],
        contactMessage: "Bonjour, je souhaite commander un montage vidéo de type 'short'.",
        color: "text-purple-500"
    },
    {
        icon: Globe,
        title: "Site Web Statique",
        price: "45000F",
        priceRaw: 45000,
        description: "Une vitrine en ligne professionnelle pour présenter votre activité, vos services et vos contacts.",
        details: ["Design moderne et responsive (adapté aux mobiles)", "Jusqu'à 5 pages (Accueil, À propos, Services, etc.)", "Inclus : Nom de domaine (.site, .com, .net...), email pro et SEO de base", "Hébergement sécurisé pour 1 an"],
        contactMessage: "Bonjour, je suis intéressé(e) par la création d'un site web statique.",
        color: "text-cyan-500"
    },
    {
        icon: Smartphone,
        title: "Site & App Web Dynamique",
        price: "sur devis",
        priceRaw: 0,
        description: "Des solutions sur mesure : e-commerce, espace client, application métier...",
        details: ["Analyse de vos besoins et rédaction du cahier des charges", "Développement de fonctionnalités spécifiques", "Base de données et panneau d'administration", "Maintenance et support technique"],
        contactMessage: "Bonjour, j'aimerais discuter d'un projet de site ou d'application web dynamique.",
        color: "text-indigo-500"
    },
    {
        icon: BarChart,
        title: "Gestion Réseaux Sociaux",
        price: "sur devis",
        priceRaw: 0,
        description: "Confiez-nous la gestion de vos pages pour une présence en ligne professionnelle et constante.",
        details: ["Création de contenu (visuels et textes)", "Planification et publication régulière", "Animation de la communauté et modération", "Rapport de performance mensuel"],
        contactMessage: "Bonjour, je suis intéressé(e) par vos services de gestion des réseaux sociaux.",
        color: "text-pink-500"
    },
];

const channelInfos = [
    {
        id: 'whatsapp',
        title: 'WhatsApp',
        icon: MessageCircle,
        color: 'text-green-400',
        description: "Envoyez des messages directs à vos clients. C'est idéal pour fidéliser et relancer ceux qui vous connaissent déjà."
    },
    {
        id: 'facebook',
        title: 'Facebook',
        icon: Facebook,
        color: 'text-blue-400',
        description: "Touchez des milliers de personnes dans votre ville. Parfait pour faire connaître vos produits et trouver de nouveaux clients."
    },
    {
        id: 'instagram',
        title: 'Instagram',
        icon: Instagram,
        color: 'text-pink-400',
        description: "Montrez vos produits en images et vidéos. C'est le meilleur endroit pour séduire avec de beaux visuels."
    },
    {
        id: 'google',
        title: 'Google Ads',
        icon: Search,
        color: 'text-orange-400',
        description: "Soyez visible quand on vous cherche sur Google. Idéal pour capter des clients qui ont besoin de vos services maintenant."
    },
    {
        id: 'tiktok',
        title: 'TikTok',
        icon: Video,
        color: 'text-black dark:text-white',
        description: "Faites le buzz avec des vidéos courtes. C'est le moyen le plus rapide de toucher les jeunes et de devenir viral."
    },
    {
        id: 'panneaux',
        title: 'Panneaux',
        icon: MapPin,
        color: 'text-red-500',
        description: "Affichez-vous en grand dans la ville. Imposez votre marque et montrez que vous êtes une entreprise sérieuse."
    }
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
                channels: "Facebook, Instagram, TikTok & Panneaux",
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
        <div className="space-y-12">
            {/* Proposition Personnalisée */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-8 shadow-sm">
                <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                    <Target className="w-64 h-64 -mr-12 -mt-12 text-primary" />
                </div>

                <h3 className="text-2xl font-bold text-primary mb-2 relative z-10">{proposal.headline}</h3>
                <p className="text-muted-foreground mb-6 max-w-2xl relative z-10">
                    Voici une stratégie sur-mesure pour votre entreprise.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-border/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                                <Users className="h-5 w-5" />
                            </div>
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Cible</h4>
                        </div>
                        <p className="font-medium text-foreground">{proposal.targetAudience}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-border/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                                <Disc className="h-5 w-5" />
                            </div>
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Canaux</h4>
                        </div>
                        <p className="font-medium text-foreground">{proposal.channels}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-border/50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                                <MessageCircle className="h-5 w-5" />
                            </div>
                            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Message</h4>
                        </div>
                        <p className="font-medium text-foreground text-sm leading-relaxed">{proposal.keyMessage}</p>
                    </div>
                </div>
            </div>

            {/* Liste des Forfaits */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b pb-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Nos Forfaits</h2>
                        <p className="text-muted-foreground mt-1">
                            Des budgets adaptés à chaque stade de croissance.
                        </p>
                    </div>
                    <Badge variant="outline" className="text-sm px-3 py-1">
                        Frais de gestion inclus dans l'estimation
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {adPackages.map((pkg, index) => {
                        const contactMessage = `Bonjour, je suis intéressé(e) par le forfait publicitaire "${pkg.title}" de ${pkg.price.toLocaleString('fr-FR')} ${currency} pour mon entreprise "${businessProfile?.name}".`;
                        return (
                            <Dialog key={pkg.price}>
                                <DialogTrigger asChild>
                                    <Card className={`
                                        cursor-pointer group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-transparent hover:border-primary/20
                                        ${index === 2 ? 'ring-2 ring-primary shadow-lg scale-105 md:scale-100 lg:scale-105 z-10' : ''}
                                    `}>
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${pkg.color?.split(' ')[0] || 'bg-gray-100'}`} />
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <Badge variant="secondary" className={`${pkg.color} border-none font-bold`}>
                                                    {pkg.title}
                                                </Badge>
                                                {index === 2 && <Badge className="bg-primary text-primary-foreground">Populaire</Badge>}
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-bold">{pkg.price.toLocaleString('fr-FR')}</span>
                                                <span className="text-sm font-medium text-muted-foreground">{currency}</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{pkg.objective}</p>
                                        </CardContent>
                                        <CardFooter className="pt-2">
                                            <Button variant={index === 2 ? "default" : "outline"} className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
                                                Voir les détails <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </DialogTrigger>

                                <DialogContent className="sm:max-w-lg">
                                    <DialogHeader>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge variant="secondary" className={`${pkg.color} text-lg py-1 px-4`}>{pkg.title}</Badge>
                                        </div>
                                        <DialogTitle className="text-4xl font-bold">
                                            {pkg.price.toLocaleString('fr-FR')} <span className="text-2xl text-muted-foreground font-medium">{currency}</span>
                                        </DialogTitle>
                                        <DialogDescription className="text-lg pt-2">
                                            {pkg.objective}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid gap-4 py-6">
                                        <div className="grid grid-cols-[24px_1fr] items-start gap-4">
                                            <Calendar className="h-5 w-5 text-primary mt-1" />
                                            <div>
                                                <h5 className="font-semibold text-sm">Durée</h5>
                                                <p className="text-muted-foreground">{pkg.duration}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-[24px_1fr] items-start gap-4">
                                            <Users className="h-5 w-5 text-primary mt-1" />
                                            <div>
                                                <h5 className="font-semibold text-sm">Plateformes</h5>
                                                <p className="text-muted-foreground">{pkg.platforms}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-[24px_1fr] items-start gap-4">
                                            <TrendingUp className="h-5 w-5 text-primary mt-1" />
                                            <div>
                                                <h5 className="font-semibold text-sm">Impact Attendu</h5>
                                                <p className="text-muted-foreground">{pkg.results}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-muted/50 p-4 rounded-lg text-xs text-muted-foreground mb-4">
                                        <p>Note : Des frais de gestion de 10% sont inclus pour assurer le paramétrage, le suivi et l'optimisation par nos experts.</p>
                                    </div>

                                    <DialogFooter>
                                        <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg">
                                            <Link href={createWhatsAppLink(contactMessage)} target="_blank">
                                                <MessageCircle className="mr-2 h-5 w-5" /> Lancer cette campagne
                                            </Link>
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function GeneratedAdContent({ content, onRegenerate }: { content: string, onRegenerate?: () => void }) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    // Séparer le contenu du post des conseils (tracking intelligent)
    const separatorRegex = /(?:---|###|\*{2,})?\s*Prochaines\s*[ÉE]tapes\s*(?:---|###|\*{2,}|:)?/i;
    const parts = content.split(separatorRegex);
    const postContent = parts[0].trim();
    const nextStepsContent = parts.length > 1 ? parts.slice(1).join("").trim() : null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(postContent);
            setCopied(true);
            toast({
                title: "Post copié !",
                description: "Le texte prêt à publier a été copié. Les conseils n'ont pas été inclus.",
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast({
                title: "Erreur",
                description: "Impossible de copier le texte.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-slate-50 dark:bg-slate-900/50 border group hover:border-primary/50 transition-colors overflow-hidden">
                <div className="flex justify-end items-center gap-2 p-2 border-b bg-muted/20">
                    {onRegenerate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRegenerate}
                            className="h-8 shadow-sm backdrop-blur-sm border transition-all text-muted-foreground hover:text-primary"
                            title="Régénérer une autre proposition"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            <span>Changer</span>
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-8 shadow-sm backdrop-blur-sm border transition-all"
                    >
                        {copied ? (
                            <>
                                <Check className="h-4 w-4 text-green-600 mr-2" />
                                <span className="text-green-600 font-medium">Copié</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>Copier</span>
                            </>
                        )}
                    </Button>
                </div>
                <CardContent className="p-6">
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: marked.parse(postContent) as string }} />
                    </div>
                </CardContent>
            </Card>

            {nextStepsContent && (
                <Card className="bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                    <CardHeader className="py-3 px-6 bg-blue-100/30 dark:bg-blue-800/30 border-b border-blue-100 dark:border-blue-800 rounded-t-xl">
                        <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Conseils et prochaines étapes
                        </h4>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-blue">
                            <div dangerouslySetInnerHTML={{ __html: marked.parse(nextStepsContent) as string }} />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
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

        const adPrompt = `En tant que TRIX Business, crée un post pour les réseaux sociaux (ton chaleureux et professionnel, avec emojis) pour la demande suivante: "${prompt}". L'entreprise est ${businessProfile.name}, spécialisée dans ${businessProfile.type}. 
        
        IMPORTANT : Si la demande ci-dessus n'a aucun sens, est inintelligible, contient juste des caractères aléatoires ou n'est manifestement pas une demande liée au marketing/business, NE GÉNÈRE PAS DE POST. Réponds UNIQUEMENT et EXACTEMENT : "Veuillez m'excuser, je n'ai pas compris votre demande, je pense qu'elle est mal formulée. Pourriez-vous reformuler votre besoin pour que je puisse créer le meilleur post possible pour vous ?".
        
        Si la demande est valide : 
        Après le post, ajoute IMPÉRATIVEMENT une section séparée par EXACTEMENT "--- Prochaines Étapes ---" (sans autres décorations). Dans cette section, adopte un ton de conseiller et suggère des actions concrètes. Par exemple: "Pour que cette publication ait un maximum d'impact, je vous propose de l'accompagner d'une très belle photo ou vidéo. Publiez-la sur Facebook et votre statut WhatsApp. Si vous voulez un visuel encore plus professionnel, vous pouvez commander une affiche sur mesure depuis l'onglet 'Services'. Bonne chance !". Adapte la suggestion au contexte.`;

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
        <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <Card className="shadow-lg border-primary/10 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-primary to-purple-500" />
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <CardTitle>Assistant Créatif IA</CardTitle>
                        </div>
                        <CardDescription className="text-base">
                            Besoin d'inspiration ? Décrivez votre idée (promo, nouveauté, événement) et laissez l'IA rédiger le post parfait.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder="Ex: J'aimerais annoncer une promo '2 achetés, 1 offert' sur les croissants ce weekend. Ton fun et engageant."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="min-h-[150px] text-lg resize-none p-4"
                        />
                        <Button
                            onClick={handleGenerate}
                            disabled={isLoading || !prompt.trim()}
                            className="w-full h-12 text-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 transition-all duration-300 shadow-md"
                        >
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                            Générer mon post
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">TRIX Business génère du contenu unique pour vous.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                {(isLoading || result) ? (
                    <Card className="shadow-lg border-2 border-primary/20 animate-in fade-in-50 slide-in-from-bottom-5 duration-500">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Bot className="h-5 w-5 text-primary" />
                                {isLoading ? "Rédaction en cours..." : "Votre publication est prête !"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-[90%]" />
                                    <Skeleton className="h-4 w-[95%]" />
                                    <Skeleton className="h-20 w-full rounded-xl" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <GeneratedAdContent content={result} onRegenerate={handleGenerate} />

                                    {(showServiceButton || showImageSearchButton) && (
                                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                            {showServiceButton && (
                                                <Button asChild className="flex-1 bg-green-600 hover:bg-green-700">
                                                    <a href={createWhatsAppLinkForService()} target="_blank" rel="noopener noreferrer">
                                                        <PenTool className="mr-2 h-4 w-4" /> Créer le visuel pro
                                                    </a>
                                                </Button>
                                            )}
                                            {showImageSearchButton && (
                                                <Button asChild variant="outline" className="flex-1">
                                                    <a href={createGoogleImagesSearchLink()} target="_blank" rel="noopener noreferrer">
                                                        <ImageIcon className="mr-2 h-4 w-4" /> Trouver une image
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground border-2 border-dashed rounded-3xl bg-muted/10">
                        <div className="bg-primary/10 p-6 rounded-full mb-4">
                            <Wand2 className="h-12 w-12 text-primary/40" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">En attente d'inspiration</h3>
                        <p className="max-w-xs">Remplissez le formulaire à gauche pour voir la magie opérer ici.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ServicesTab() {
    const { businessProfile } = useAuth();
    const createWhatsAppLink = (message: string) => `https://wa.me/+22899974389?text=${encodeURIComponent(message)}`;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Services Créatifs</h2>
                    <p className="text-muted-foreground mt-1 max-w-2xl">
                        Une image professionnelle inspire confiance. Confiez-nous votre identité visuelle et technique.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {servicePackages.map((pkg, i) => {
                    const ServiceIcon = pkg.icon;
                    const contactMessage = pkg.contactMessage + ` (Entreprise: ${businessProfile?.name || 'Non spécifiée'})`;
                    return (
                        <Dialog key={pkg.title}>
                            <DialogTrigger asChild>
                                <Card className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-transparent hover:border-primary/20 overflow-hidden">
                                    <div className="h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <CardHeader>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-muted group-hover:bg-primary/10 transition-colors ${pkg.color}`}>
                                            <ServiceIcon className="h-6 w-6" />
                                        </div>
                                        <CardTitle className="group-hover:text-primary transition-colors">{pkg.title}</CardTitle>
                                        <CardDescription className="line-clamp-2">{pkg.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <div className="flex items-center justify-between mt-2">
                                            <Badge variant="secondary" className="text-sm font-bold bg-muted/60">
                                                {pkg.price}
                                            </Badge>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-primary/10 ${pkg.color}`}>
                                        <ServiceIcon className="h-7 w-7" />
                                    </div>
                                    <DialogTitle className="text-3xl font-bold">{pkg.title}</DialogTitle>
                                    <DialogDescription className="text-lg pt-2">{pkg.description}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6 py-6">
                                    <div className="flex items-baseline gap-2 pb-4 border-b">
                                        <span className="text-4xl font-bold text-foreground">{pkg.price}</span>
                                        {pkg.priceRaw > 0 && <span className="text-sm text-muted-foreground">TTC</span>}
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Ce qui est inclus</h4>
                                        <ul className="space-y-3">
                                            {pkg.details.map(detail => (
                                                <li key={detail} className="flex items-start gap-3">
                                                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                                                    <p className="text-foreground/90">{detail}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button asChild className="w-full bg-primary hover:bg-primary/90 text-lg py-6" size="lg">
                                        <Link href={createWhatsAppLink(contactMessage)} target="_blank">
                                            <MessageCircle className="mr-2 h-5 w-5" /> Commander maintenant
                                        </Link>
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    );
                })}
            </div>
        </div>
    );
}

export default function PublicityPage() {
    const { toast } = useToast();
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [visitCount, setVisitCount] = useState(0);
    const [selectedChannel, setSelectedChannel] = useState<typeof channelInfos[0] | null>(null);

    useEffect(() => {
        const storedHide = localStorage.getItem('hidePublicityVideo');
        if (storedHide === 'true') return;

        const storedCount = parseInt(localStorage.getItem('publicityVisitCount') || '0');
        const newCount = storedCount + 1;
        localStorage.setItem('publicityVisitCount', newCount.toString());
        setVisitCount(newCount);

        // Small delay to let the page load before showing the modal
        const timer = setTimeout(() => {
            setShowVideoModal(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    const handleHideForever = () => {
        localStorage.setItem('hidePublicityVideo', 'true');
        setShowVideoModal(false);
        toast({
            title: "Vidéo masquée",
            description: "Vous pouvez toujours revoir la vidéo en cliquant sur le bouton 'Voir la démo' en haut de page.",
        });
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 relative">

            {/* Vidéo Modal */}
            {/* Vidéo Modal */}
            <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
                <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-none shadow-2xl bg-zinc-950 text-white">
                    <DialogTitle className="sr-only">Vidéo de présentation TRIX</DialogTitle>
                    <DialogDescription className="sr-only">
                        Une courte vidéo expliquant comment gagner des clients avec TRIX.
                    </DialogDescription>
                    <div className="aspect-video w-full relative flex items-center justify-center group cursor-pointer overflow-hidden">
                        {/* Fond animé */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/60 to-purple-900/60 opacity-80" />

                        {/* Bouton Play */}
                        <div className="relative z-10 text-center space-y-4">
                            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto backdrop-blur-md border border-white/20 transition-all duration-300 group-hover:scale-110 group-hover:bg-white/20 shadow-xl">
                                <Play className="h-8 w-8 fill-white text-white ml-1" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-bold tracking-tight">Comment gagner des clients ?</h3>
                                <p className="text-blue-200 font-medium max-w-md mx-auto">Regardez cette vidéo pour comprendre comment attirer plein de clients sur WhatsApp, Facebook et TikTok.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-background text-foreground flex flex-col sm:flex-row justify-between items-center gap-4 border-t">
                        <div>
                            <h4 className="font-semibold text-lg">C'est facile et rapide !</h4>
                            <p className="text-muted-foreground text-sm">On vous explique tout en 1 minute pour booster votre business.</p>
                        </div>
                        <div className="flex gap-3">
                            {visitCount >= 3 && (
                                <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={handleHideForever}>
                                    Ne plus jamais montrer
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => setShowVideoModal(false)}>Fermer</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Header Vivant */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-2xl p-8 md:p-12 mb-12">
                <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                    <Megaphone className="w-96 h-96 -mr-20 -mt-20 rotate-12" />
                </div>

                <div className="relative z-10 max-w-4xl">
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-medium border border-white/20 shadow-sm">
                            <Sparkles className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                            <span>Propulsez votre business</span>
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md"
                            onClick={() => setShowVideoModal(true)}
                        >
                            <Play className="mr-2 h-4 w-4 fill-current" /> Voir la démo
                        </Button>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
                        Espace Publicité & Marketing
                    </h1>

                    <p className="text-blue-100 text-lg md:text-xl max-w-2xl leading-relaxed mb-8">
                        Ne laissez plus vos clients vous chercher. Nous diffusons vos publicités directement là où ils se trouvent.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        {channelInfos.map((channel) => (
                            <div
                                key={channel.id}
                                onClick={() => setSelectedChannel(channel)}
                                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10 shadow-lg hover:bg-white/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
                            >
                                <channel.icon className={`h-5 w-5 ${channel.color}`} />
                                <span className="font-semibold">{channel.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Lien vers le suivi */}
            <div className="flex justify-center mb-6">
                <Button asChild className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-full px-8 h-12 text-base font-semibold border-none">
                    <Link href="/publicity/tracking">
                        <TrendingUp className="h-5 w-5" />
                        Page de suivi de ma PUB
                    </Link>
                </Button>
            </div>

            <Tabs defaultValue="campaign" className="space-y-8">
                <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto bg-muted p-1 h-auto rounded-full">
                    <TabsTrigger value="campaign" className="rounded-full py-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        Campagne
                    </TabsTrigger>
                    <TabsTrigger value="tools" className="rounded-full py-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        Outils IA
                    </TabsTrigger>
                    <TabsTrigger value="services" className="rounded-full py-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        Services
                    </TabsTrigger>
                </TabsList>

                <div className="animate-in fade-in-50 slide-in-from-bottom-5 duration-500 delay-150">
                    <TabsContent value="campaign">
                        <AdCampaignTab />
                    </TabsContent>
                    <TabsContent value="tools">
                        <AdToolsTab />
                    </TabsContent>
                    <TabsContent value="services">
                        <ServicesTab />
                    </TabsContent>
                </div>
            </Tabs>

            <Dialog open={!!selectedChannel} onOpenChange={(open) => !open && setSelectedChannel(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            {selectedChannel && <selectedChannel.icon className={`h-8 w-8 ${selectedChannel.color?.replace('text-', 'text-primary ')}`} />}
                        </div>
                        <DialogTitle className="text-center text-2xl">{selectedChannel?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="text-center py-4">
                        <DialogDescription className="text-lg text-muted-foreground leading-relaxed">
                            {selectedChannel?.description}
                        </DialogDescription>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button type="button" variant="secondary" onClick={() => setSelectedChannel(null)}>
                            Compris, merci !
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
