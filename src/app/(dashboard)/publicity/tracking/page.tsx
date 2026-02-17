"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, TrendingUp, Users, Clock, DollarSign, BarChart3, MousePointerClick, Calendar, MoreHorizontal, AlertCircle, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// Données simulées pour le graphique
const performanceData = [
    { day: 'Lun', views: 120, clicks: 8 },
    { day: 'Mar', views: 180, clicks: 12 },
    { day: 'Mer', views: 250, clicks: 18 },
    { day: 'Jeu', views: 310, clicks: 25 },
    { day: 'Ven', views: 420, clicks: 35 },
    { day: 'Sam', views: 580, clicks: 48 },
    { day: 'Dim', views: 520, clicks: 42 },
];

// Données simulées pour les campagnes
const activeCampaigns = [
    {
        id: 1,
        title: "Promo Rentrée Scolaire",
        platform: "Facebook & Instagram",
        status: "active",
        budget: 50000,
        spent: 32500,
        impressions: 12500,
        clicks: 450,
        startDate: "2024-09-01",
        endDate: "2024-09-30",
        daysLeft: 14,
        color: "bg-blue-600"
    },
    {
        id: 2,
        title: "Nouveauté : Tissus Premium",
        platform: "TikTok",
        status: "active",
        budget: 25000,
        spent: 5000,
        impressions: 8000,
        clicks: 320,
        startDate: "2024-09-10",
        endDate: "2024-09-20",
        daysLeft: 8,
        color: "bg-pink-600"
    },
    {
        id: 3,
        title: "Liquidation Stock Hiver",
        platform: "Google Ads",
        status: "ended",
        budget: 15000,
        spent: 15000,
        impressions: 5000,
        clicks: 180,
        startDate: "2024-08-01",
        endDate: "2024-08-15",
        daysLeft: 0,
        color: "bg-orange-500"
    }
];

export default function PublicityTrackingPage() {
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (!isModalOpen || countdown <= 0) return;

        const timer = setInterval(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [isModalOpen, countdown]);

    // Calcul des totaux
    const totalImpressions = activeCampaigns.reduce((acc, curr) => acc + curr.impressions, 0);
    const totalSpent = activeCampaigns.reduce((acc, curr) => acc + curr.spent, 0);
    const totalBudget = activeCampaigns.reduce((acc, curr) => acc + curr.budget, 0);
    const totalClicks = activeCampaigns.reduce((acc, curr) => acc + curr.clicks, 0);

    const budgetPercent = Math.round((totalSpent / totalBudget) * 100) || 0;

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Button variant="ghost" asChild className="mb-2 pl-0 hover:pl-2 transition-all">
                        <Link href="/publicity" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                            <ArrowLeft className="h-4 w-4" />
                            Retour à la Publicité
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord Publicitaire</h1>
                    <p className="text-muted-foreground mt-1">
                        Suivez en temps réel la performance de vos campagnes actives.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Calendar className="mr-2 h-4 w-4" />
                        Septembre 2024
                    </Button>
                    <Button className="bg-primary text-white hover:bg-primary/90">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Rapport complet
                    </Button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vue Totales (Impressions)</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                            +12% depuis la semaine dernière
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Budget Dépensé</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSpent.toLocaleString()} FCFA</div>
                        <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Sur {totalBudget.toLocaleString()} FCFA</span>
                                <span>{budgetPercent}%</span>
                            </div>
                            <Progress value={budgetPercent} className="h-2" indicatorClassName="bg-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-purple-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clics & Interactions</CardTitle>
                        <MousePointerClick className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Taux de clic moyen (CTR): 3.2%
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Campagnes Actives</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">2</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            1 campagne terminée ce mois-ci
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <Card className="lg:col-span-2 shadow-md">
                    <CardHeader>
                        <CardTitle>Performance Hebdomadaire</CardTitle>
                        <CardDescription>Évolution des vues et des clics sur les 7 derniers jours.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" name="Vues" />
                                <Area type="monotone" dataKey="clicks" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" name="Clics" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Campaigns List Section */}
                <div className="space-y-6">
                    <h3 className="text-xl font-semibold tracking-tight">Détail des Campagnes</h3>

                    {activeCampaigns.map((campaign) => (
                        <Card key={campaign.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow border-t-0">
                            <div className={`h-1 w-full ${campaign.color}`} />
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base font-bold">{campaign.title}</CardTitle>
                                        <p className="text-xs text-muted-foreground mt-1 font-medium">{campaign.platform}</p>
                                    </div>
                                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className={campaign.status === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                        {campaign.status === 'active' ? 'En cours' : 'Terminée'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-2">
                                {/* Budget Progress */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-muted-foreground">Budget consommé</span>
                                        <span>{Math.round((campaign.spent / campaign.budget) * 100)}%</span>
                                    </div>
                                    <Progress value={(campaign.spent / campaign.budget) * 100} className="h-1.5" />
                                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                                        <span>{campaign.spent.toLocaleString()} FCFA</span>
                                        <span>{campaign.budget.toLocaleString()} FCFA</span>
                                    </div>
                                </div>

                                {/* Time Remaining */}
                                <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg">
                                    <Clock className="h-8 w-8 text-primary/20 bg-primary/10 p-1.5 rounded-full text-primary" />
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Temps Restant</p>
                                        <p className="text-sm font-bold">
                                            {campaign.daysLeft > 0 ? (
                                                <span className="text-orange-600 dark:text-orange-400">{campaign.daysLeft} Jours</span>
                                            ) : (
                                                <span className="text-muted-foreground">Terminé</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer Stats */}
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                                    <div className="text-center p-2 rounded bg-muted/20">
                                        <p className="text-xs text-muted-foreground">Vues</p>
                                        <p className="font-bold text-sm">{campaign.impressions.toLocaleString()}</p>
                                    </div>
                                    <div className="text-center p-2 rounded bg-muted/20">
                                        <p className="text-xs text-muted-foreground">Clics</p>
                                        <p className="font-bold text-sm">{campaign.clicks.toLocaleString()}</p>
                                    </div>
                                </div>

                            </CardContent>
                        </Card>
                    ))}

                    <Button variant="outline" className="w-full border-dashed border-2 py-6 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors">
                        + Lancer une nouvelle campagne
                    </Button>
                </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open) => {
                if (countdown === 0) setIsModalOpen(open);
            }}>
                <DialogContent className="sm:max-w-md" onInteractOutside={(e) => {
                    if (countdown > 0) e.preventDefault();
                }} onEscapeKeyDown={(e) => {
                    if (countdown > 0) e.preventDefault();
                }}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl text-orange-600">
                            <AlertCircle className="h-6 w-6" />
                            Version de Démonstration
                        </DialogTitle>
                        <DialogDescription className="text-base pt-4 space-y-4 text-foreground/90" asChild>
                            <div>
                                <p>
                                    Cette page est une <strong>maquette</strong> pour vous montrer les possibilités de suivi de vos publicités.
                                </p>
                                <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg text-sm border border-orange-200 dark:border-orange-800">
                                    <p className="font-medium text-orange-800 dark:text-orange-200 mb-1">Note importante :</p>
                                    <p>Elle n'est pas encore connectée à des données réelles. Cette fonctionnalité sera bientôt disponible !</p>
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center mt-4">
                        <Button
                            type="button"
                            variant={countdown > 0 ? "secondary" : "default"}
                            disabled={countdown > 0}
                            onClick={() => setIsModalOpen(false)}
                            className="w-full sm:w-auto min-w-[200px] h-12 text-base transition-all"
                        >
                            {countdown > 0 ? (
                                <span className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 animate-pulse" />
                                    Veuillez lire ({countdown}s)
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" />
                                    J'ai compris, accéder à la démo
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
