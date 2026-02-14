
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell, CartesianGrid, LineChart, Line } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from '@/providers/auth-provider';
import { getExpenses, getReservations, getQuickIncomes } from '@/lib/firebase/database';
import type { Expense, Reservation, QuickIncome } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, TrendingDown, Package, DollarSign, TrendingUp } from 'lucide-react';
import { useLoading } from '@/providers/loading-provider';

const categoryTranslations: { [key: string]: string } = {
    Supplies: "Fournitures",
    "Food & Beverage": "Nourriture et boissons",
    Maintenance: "Maintenance",
    Marketing: "Marketing",
    Utilities: "Services publics",
    Other: "Autre",
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function ExpensesAnalyticsPage() {
    const { businessId, activeWorkspaceId, loading: authLoading, getCurrencySymbol } = useAuth();
    const { showLoader } = useLoading();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [incomes, setIncomes] = useState<(Reservation | QuickIncome)[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const currencySymbol = getCurrencySymbol();

    const loadData = useCallback(async () => {
        if (!businessId || !activeWorkspaceId) return;
        setLoadingData(true);
        try {
            const [fetchedExpenses, fetchedReservations, fetchedQuickIncomes] = await Promise.all([
                getExpenses(businessId, activeWorkspaceId),
                getReservations(businessId, activeWorkspaceId),
                getQuickIncomes(businessId, activeWorkspaceId),
            ]);
            setExpenses(fetchedExpenses || []);
            const reservationIncomes = (fetchedReservations || []).filter(r => r.status !== 'cancelled');
            setIncomes([...reservationIncomes, ...(fetchedQuickIncomes || [])]);
        } catch (error) {
            console.error("Failed to load financial data:", error);
        } finally {
            setLoadingData(false);
        }
    }, [businessId]);

    useEffect(() => {
        if (!authLoading) {
            loadData();
        }
    }, [authLoading, loadData]);

    const { monthlyData, categoryData, totalExpenses, totalIncomes, averageExpense } = useMemo(() => {
        if (!expenses.length && !incomes.length) return { monthlyData: [], categoryData: [], totalExpenses: 0, totalIncomes: 0, averageExpense: 0 };

        const combinedData: Record<string, { expenses: number, incomes: number }> = {};

        expenses.forEach(exp => {
            const month = format(parseISO(exp.date), 'yyyy-MM');
            if (!combinedData[month]) combinedData[month] = { expenses: 0, incomes: 0 };
            combinedData[month].expenses += exp.amount;
        });

        incomes.forEach(inc => {
            const dateKey = 'checkInDate' in inc ? inc.checkInDate : inc.date;
            const month = format(parseISO(dateKey), 'yyyy-MM');
            if (!combinedData[month]) combinedData[month] = { expenses: 0, incomes: 0 };
            combinedData[month].incomes += ('totalAmount' in inc ? inc.amountPaid : inc.amount) || 0;
        });

        const monthlyData = Object.keys(combinedData)
            .sort()
            .map(month => ({
                name: format(parseISO(`${month}-01`), 'MMM yy', { locale: fr }),
                Revenus: combinedData[month].incomes,
                Dépenses: combinedData[month].expenses,
            }));

        const category = expenses.reduce((acc, exp) => {
            const catName = categoryTranslations[exp.category] || exp.category;
            if (!acc[catName]) acc[catName] = 0;
            acc[catName] += exp.amount;
            return acc;
        }, {} as Record<string, number>);
        const categoryData = Object.entries(category).map(([name, value]) => ({ name, value }));

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalIncomes = incomes.reduce((sum, inc) => sum + (('totalAmount' in inc ? inc.amountPaid : inc.amount) || 0), 0);
        const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;

        return { monthlyData, categoryData, totalExpenses, totalIncomes, averageExpense };
    }, [expenses, incomes]);

    const chartConfig: ChartConfig = useMemo(() => ({
        Dépenses: { label: `Dépenses (${currencySymbol})`, color: "hsl(var(--destructive))" },
        Revenus: { label: `Revenus (${currencySymbol})`, color: "hsl(var(--chart-2))" },
        ...categoryData.reduce((acc, cat, index) => ({
            ...acc,
            [cat.name]: { label: cat.name, color: COLORS[index % COLORS.length] }
        }), {})
    }), [categoryData, currencySymbol]);

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

    if (!expenses.length && !incomes.length) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/expenses" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <h1 className="text-3xl font-headline font-semibold tracking-tight">Analyse des Dépenses</h1>
                </div>
                <div className="text-center py-16">
                    <h2 className="text-xl font-semibold">Aucune donnée financière</h2>
                    <p className="text-muted-foreground">Ajoutez des dépenses ou des revenus pour voir les analyses.</p>
                    <Button asChild className="mt-4"><Link href="/expenses/new" onClick={showLoader}>Ajouter une dépense</Link></Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/expenses" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-3xl font-headline font-semibold tracking-tight">Analyse Financière</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalIncomes.toLocaleString('fr-FR')} {currencySymbol}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Dépenses Totales</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalExpenses.toLocaleString('fr-FR')} {currencySymbol}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Dépense Moyenne</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{averageExpense.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currencySymbol}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenus vs Dépenses par Mois</CardTitle>
                        <CardDescription>Évolution mensuelle des revenus et dépenses.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <LineChart data={monthlyData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                                    <YAxis />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Line type="monotone" dataKey="Revenus" stroke="var(--color-Revenus)" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="Dépenses" stroke="var(--color-Dépenses)" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Répartition des Dépenses par Catégorie</CardTitle>
                        <CardDescription>Distribution des dépenses par catégorie.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Tooltip content={<ChartTooltipContent nameKey="value" />} />
                                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
