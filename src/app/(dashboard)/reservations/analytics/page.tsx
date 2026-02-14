
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell, CartesianGrid, LineChart, Line } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from '@/providers/auth-provider';
import { getReservations } from '@/lib/firebase/database';
import type { Reservation } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, Users, Star, DollarSign } from 'lucide-react';
import { useLoading } from '@/providers/loading-provider';

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function ReservationsAnalyticsPage() {
    const { businessId, activeWorkspaceId, loading: authLoading } = useAuth();
    const { showLoader } = useLoading();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const loadReservations = useCallback(async () => {
        if (!businessId || !activeWorkspaceId) return;
        setLoadingData(true);
        try {
            const fetchedReservations = await getReservations(businessId, activeWorkspaceId);
            setReservations(fetchedReservations?.filter(r => r.status !== 'cancelled') || []);
        } catch (error) {
            console.error("Failed to load reservations data:", error);
        } finally {
            setLoadingData(false);
        }
    }, [businessId]);

    useEffect(() => {
        if (!authLoading) {
            loadReservations();
        }
    }, [authLoading, loadReservations]);

    const { monthlyData, roomTypeData, totalReservations, totalRevenue, avgGuests, mostPopularRoom } = useMemo(() => {
        if (!reservations.length) return { monthlyData: [], roomTypeData: [], totalReservations: 0, totalRevenue: 0, avgGuests: 0, mostPopularRoom: 'N/A' };

        const monthly = reservations.reduce((acc, res) => {
            const month = format(parseISO(res.checkInDate), 'yyyy-MM');
            if (!acc[month]) {
                acc[month] = { count: 0, revenue: 0 };
            }
            acc[month].count++;
            acc[month].revenue += res.totalAmount;
            return acc;
        }, {} as Record<string, { count: number, revenue: number }>);

        const monthlyData = Object.entries(monthly)
            .map(([month, data]) => ({
                name: format(parseISO(`${month}-01`), 'MMM yy', { locale: fr }),
                Prestations: data.count,
                "Chiffre d'affaires": data.revenue,
            }))
            .sort((a, b) => {
                const dateA = new Date(a.name.split(" ").reverse().join(" "));
                const dateB = new Date(b.name.split(" ").reverse().join(" "));
                return dateA.getTime() - dateB.getTime();
            });

        const roomTypeCounts = reservations.reduce((acc, res) => {
            acc[res.roomType] = (acc[res.roomType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const roomTypeData = Object.entries(roomTypeCounts).map(([name, value]) => ({ name, value }));

        const totalReservations = reservations.length;
        const totalRevenue = reservations.reduce((sum, res) => sum + res.totalAmount, 0);
        const totalGuests = reservations.reduce((sum, res) => sum + res.numberOfGuests, 0);
        const avgGuests = totalReservations > 0 ? totalGuests / totalReservations : 0;
        const mostPopularRoom = roomTypeData.length > 0 ? roomTypeData.reduce((a, b) => a.value > b.value ? a : b).name : 'N/A';

        return { monthlyData, roomTypeData, totalReservations, totalRevenue, avgGuests, mostPopularRoom };
    }, [reservations]);

    const chartConfig: ChartConfig = useMemo(() => ({
        Prestations: { label: "Prestations", color: "hsl(var(--chart-2))" },
        "Chiffre d'affaires": { label: "Chiffre d'affaires", color: "hsl(var(--destructive))" },
        ...roomTypeData.reduce((acc, cat, index) => ({
            ...acc,
            [cat.name]: { label: cat.name, color: COLORS[index % COLORS.length] }
        }), {})
    }), [roomTypeData]);

    if (loadingData || authLoading) {
        return <div className="space-y-6">
            <Skeleton className="h-10 w-48" />
            <div className="grid gap-6 md:grid-cols-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
            </div>
        </div>
    }

    if (!reservations.length) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/reservations" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <h1 className="text-3xl font-headline font-semibold tracking-tight">Analyse des Prestations</h1>
                </div>
                <div className="text-center py-16">
                    <h2 className="text-xl font-semibold">Aucune donnée de prestation</h2>
                    <p className="text-muted-foreground">Ajoutez des prestations pour voir les analyses.</p>
                    <Button asChild className="mt-4"><Link href="/reservations/new" onClick={showLoader}>Ajouter une prestation</Link></Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/reservations" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-3xl font-headline font-semibold tracking-tight">Analyse des Prestations</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Prestations Totales</CardTitle>
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalReservations}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Chiffre d'Affaires Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRevenue.toLocaleString('fr-FR')} FCFA</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Moyenne de clients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgGuests.toFixed(1)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Service le plus populaire</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mostPopularRoom}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-2xl leading-normal break-words whitespace-normal hyphens-auto">Prestations vs Chiffre d'Affaires par Mois</CardTitle>
                        <CardDescription className="text-sm break-words whitespace-normal mt-2">Évolution mensuelle du nombre de prestations et du C.A. généré.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                    <YAxis yAxisId="left" orientation="left" stroke="var(--color-Prestations)" />
                                    <YAxis yAxisId="right" orientation="right" stroke="var(--color-Chiffre d'affaires)" />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="Prestations" stroke="var(--color-Prestations)" strokeWidth={2} dot={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="Chiffre d'affaires" stroke="var(--color-Chiffre d'affaires)" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-2xl leading-normal break-words whitespace-normal hyphens-auto">Répartition par Type de Service</CardTitle>
                        <CardDescription className="text-sm break-words whitespace-normal mt-2">Distribution des prestations par type de service.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 flex items-center justify-center">
                        <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip content={<ChartTooltipContent nameKey="value" />} />
                                    <Pie data={roomTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {roomTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
