"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell, CartesianGrid, AreaChart, Area } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from '@/providers/auth-provider';
import { format, parseISO, subMonths, subYears, isWithinInterval, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Users, ClipboardCheck, Wallet, Printer } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { syncService } from '@/lib/sync-service';
import { Profit } from '@/lib/types';

const categoryTranslations: { [key: string]: string } = {
    Supplies: "Fournitures",
    "Food & Beverage": "Nourriture et boissons",
    Maintenance: "Maintenance",
    Marketing: "Marketing",
    Utilities: "Services publics",
    Other: "Autre",
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF4560"];

type Period = '24h' | '7d' | '30d' | '3m' | '6m' | '12m' | 'all';

const periodButtons: { label: string; value: Period }[] = [
    { label: '24h', value: '24h' },
    { label: '7j', value: '7d' },
    { label: '30j', value: '30d' },
    { label: '3m', value: '3m' },
    { label: '6m', value: '6m' },
    { label: '12m', value: '12m' },
    { label: 'Tout', value: 'all' },
];

export default function FinancialHealthPage() {
    const { businessId, loading: authLoading, getCurrencySymbol, activeWorkspaceId, businessProfile } = useAuth();
    const { toast } = useToast();
    const [period, setPeriod] = useState<Period>('30d');

    const currencySymbol = getCurrencySymbol();

    // Offline-first data fetching using Dexie
    const expenses = useLiveQuery(
        () => activeWorkspaceId ? db.expenses.where('workspaceId').equals(activeWorkspaceId).toArray() : [],
        [activeWorkspaceId]
    );

    const reservations = useLiveQuery(
        () => activeWorkspaceId ? db.reservations.where('workspaceId').equals(activeWorkspaceId).filter(r => r.status !== 'cancelled').toArray() : [],
        [activeWorkspaceId]
    );

    const quickIncomes = useLiveQuery(
        () => activeWorkspaceId ? db.quickIncomes.where('workspaceId').equals(activeWorkspaceId).toArray() : [],
        [activeWorkspaceId]
    );

    const clients = useLiveQuery(
        () => activeWorkspaceId ? db.clients.where('workspaceId').equals(activeWorkspaceId).toArray() : [],
        [activeWorkspaceId]
    );

    const profits = useLiveQuery(
        () => activeWorkspaceId ? db.profits.where('workspaceId').equals(activeWorkspaceId).toArray() : [],
        [activeWorkspaceId]
    );

    // Trigger background sync on mount or workspace change
    useEffect(() => {
        if (businessId && activeWorkspaceId) {
            syncService.initialSync(businessId, activeWorkspaceId).catch(console.error);
        }
    }, [businessId, activeWorkspaceId]);

    const loadingData = !expenses || !reservations || !quickIncomes || !clients;

    const { kpiData, monthlyChartData, expenseCategoryData, serviceTypeData } = useMemo(() => {
        if (loadingData) return { kpiData: null, monthlyChartData: [], expenseCategoryData: [], serviceTypeData: [] };

        const now = new Date();
        let startDate: Date;

        switch (period) {
            case '24h': startDate = subDays(now, 1); break;
            case '7d': startDate = subDays(now, 7); break;
            case '30d': startDate = subDays(now, 30); break;
            case '3m': startDate = subMonths(now, 3); break;
            case '6m': startDate = subMonths(now, 6); break;
            case '12m': startDate = subYears(now, 1); break;
            case 'all':
            default:
                startDate = new Date(0); // Epoch
        }

        const inPeriod = (dateStr: string) => isWithinInterval(parseISO(dateStr), { start: startDate, end: now });

        const filteredExpenses = (expenses || []).filter(e => inPeriod(e.date));
        const filteredReservations = (reservations || []).filter(r => inPeriod(r.checkInDate));
        const filteredQuickIncomes = (quickIncomes || []).filter(i => inPeriod(i.date));
        const filteredClients = (clients || []).filter(c => c.createdAt && c.createdAt >= startDate.getTime());
        const filteredProfits = (profits || []).filter(p => inPeriod(p.date));

        const totalRevenue = filteredReservations.reduce((sum: number, r) => sum + (r.amountPaid || 0), 0) + filteredQuickIncomes.reduce((sum: number, i) => sum + i.amount, 0);
        const totalExpenses = filteredExpenses.reduce((sum: number, e) => sum + e.amount, 0);
        const grossMargin = filteredProfits.reduce((sum: number, p) => sum + p.amount, 0);
        const netProfit = grossMargin - totalExpenses;
        const totalClients = filteredClients.length;
        const totalReservations = filteredReservations.length;

        const combinedData: Record<string, { revenue: number, expenses: number, profit: number }> = {};

        const getFormatKey = () => {
            if (['24h', '7d', '30d'].includes(period)) return 'yyyy-MM-dd'; // Group by day
            return 'yyyy-MM'; // Group by month
        }
        const formatKey = getFormatKey();

        [...filteredReservations, ...filteredQuickIncomes].forEach(inc => {
            const dateKey = 'checkInDate' in inc ? inc.checkInDate : inc.date;
            const month = format(parseISO(dateKey), formatKey, { locale: fr });
            if (!combinedData[month]) combinedData[month] = { revenue: 0, expenses: 0, profit: 0 };
            combinedData[month].revenue += ('totalAmount' in inc ? (inc.amountPaid || 0) : inc.amount);
        });

        filteredExpenses.forEach(exp => {
            const month = format(parseISO(exp.date), formatKey, { locale: fr });
            if (!combinedData[month]) combinedData[month] = { revenue: 0, expenses: 0, profit: 0 };
            combinedData[month].expenses += exp.amount;
        });

        filteredProfits.forEach(prof => {
            const month = format(parseISO(prof.date), formatKey, { locale: fr });
            if (!combinedData[month]) combinedData[month] = { revenue: 0, expenses: 0, profit: 0 };
            combinedData[month].profit += prof.amount;
        });

        const monthlyChartData = Object.keys(combinedData)
            .sort()
            .map(dateStr => ({
                name: formatKey === 'yyyy-MM-dd'
                    ? format(parseISO(dateStr), 'd MMM', { locale: fr })
                    : format(parseISO(`${dateStr}-01`), 'MMM yy', { locale: fr }),
                Revenus: combinedData[dateStr].revenue,
                Dépenses: combinedData[dateStr].expenses,
                Profit: combinedData[dateStr].profit - combinedData[dateStr].expenses
            }));

        const expenseCategory = filteredExpenses.reduce((acc, exp) => {
            const catName = categoryTranslations[exp.category] || exp.category;
            if (!acc[catName]) acc[catName] = 0;
            acc[catName] += exp.amount;
            return acc;
        }, {} as Record<string, number>);

        const expenseCategoryData = Object.entries(expenseCategory).map(([name, value]) => ({ name, value, fill: COLORS[Math.floor(Math.random() * COLORS.length)] }));

        const serviceTypeCounts = filteredReservations.reduce((acc, res) => {
            acc[res.roomType] = (acc[res.roomType] || 0) + res.totalAmount;
            return acc;
        }, {} as Record<string, number>);

        const serviceTypeData = Object.entries(serviceTypeCounts).map(([name, value]) => ({ name, value, fill: COLORS[Math.floor(Math.random() * COLORS.length)] }));

        return {
            kpiData: { totalRevenue, totalExpenses, grossMargin, netProfit, totalClients, totalReservations },
            monthlyChartData,
            expenseCategoryData,
            serviceTypeData
        };
    }, [expenses, reservations, quickIncomes, clients, profits, period, loadingData]);

    const chartConfig: ChartConfig = useMemo(() => ({
        Revenus: { label: `Revenus (${currencySymbol})`, color: "hsl(var(--chart-2))" },
        Dépenses: { label: `Dépenses (${currencySymbol})`, color: "hsl(var(--destructive))" },
        Profit: { label: `Profit (${currencySymbol})`, color: "hsl(var(--chart-1))" },
    }), [currencySymbol]);

    if (loadingData || authLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-80 lg:col-span-2" />
                    <Skeleton className="h-80" />
                </div>
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    <Skeleton className="h-80" />
                    <Skeleton className="h-80" />
                </div>
            </div>
        )
    }

    // Guard clause for when kpiData might still be null despite loadingData being false
    // (though our logic above ensures it's set if loadingData is false, it satisfies TypeScript)
    if (!kpiData) return null;

    return (
        <div className="space-y-6">
            <div className="print-only text-center mb-4">
                <h1 className="text-2xl font-bold">Rapport de Santé Financière</h1>
                <p className="text-sm text-gray-500">Pour {businessProfile?.name} - Période: {periodButtons.find(p => p.value === period)?.label}</p>
                <p className="text-sm text-gray-500">Généré le: {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: fr })}</p>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
                <h1 className="text-3xl font-headline font-semibold tracking-tight">Santé Financière</h1>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="bg-muted p-1 rounded-lg flex items-center gap-2 overflow-x-auto max-w-[calc(100vw-6rem)] sm:max-w-none scrollbar-hide">
                        {periodButtons.map(p => (
                            <Button
                                key={p.value}
                                variant={period === p.value ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setPeriod(p.value)}
                                className="h-8 whitespace-nowrap shrink-0"
                            >
                                {p.label}
                            </Button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={() => toast({ title: "Bientôt disponible", description: "La fonctionnalité d'impression de rapport sera activée prochainement." })}>
                        <Printer className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <KpiCard title="Revenu Brut" value={kpiData.totalRevenue} currency={currencySymbol} icon={TrendingUp} color="text-green-500" />
                <KpiCard title="Dépenses Totales" value={kpiData.totalExpenses} currency={currencySymbol} icon={TrendingDown} color="text-red-500" />
                <KpiCard title="Marge Brut" value={kpiData.grossMargin} currency={currencySymbol} icon={Wallet} color="text-yellow-600" />
                <KpiCard title="Profit Net" value={kpiData.netProfit} currency={currencySymbol} icon={TrendingUp} color="text-blue-500" />
                <KpiCard title="Nouveaux Clients" value={kpiData.totalClients} icon={Users} color="text-orange-500" />
                <KpiCard title="Prestations" value={kpiData.totalReservations} icon={ClipboardCheck} color="text-purple-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-3 shadow-lg print-break-inside-avoid">
                    <CardHeader>
                        <CardTitle>Performance sur la Période</CardTitle>
                        <CardDescription>Vue d'ensemble des revenus, dépenses et profits sur la période sélectionnée.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                            <AreaChart data={monthlyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickFormatter={(value) => `${(value as number / 1000).toLocaleString()}k`} />
                                <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                                <Legend />
                                <Area type="linear" dataKey="Revenus" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2), 0.3)" />
                                <Area type="linear" dataKey="Dépenses" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive), 0.3)" />
                                <Area type="linear" dataKey="Profit" stackId="2" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1), 0.3)" />
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-lg print-break-inside-avoid">
                    <CardHeader>
                        <CardTitle>Dépenses par Catégorie</CardTitle>
                        <CardDescription>Quelle part de vos dépenses chaque catégorie représente-t-elle ?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Tooltip content={<ChartTooltipContent nameKey="value" />} />
                                    <Pie data={expenseCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {expenseCategoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-lg print-break-inside-avoid">
                    <CardHeader>
                        <CardTitle>Revenus par Type de Prestation</CardTitle>
                        <CardDescription>Quels sont les services ou produits qui génèrent le plus de revenus ?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <BarChart data={serviceTypeData} layout="vertical" margin={{ left: 0, right: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tickLine={false}
                                        axisLine={false}
                                        stroke="hsl(var(--foreground))"
                                        width={90}
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
                                    />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" layout="vertical" radius={5}>
                                        {serviceTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
