
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    currency?: string;
}

export function KpiCard({ title, value, icon: Icon, color, currency }: KpiCardProps) {
    const cardColorClasses: { [key: string]: string } = {
        "text-green-500": "dark:bg-green-950/20 bg-green-50",
        "text-red-500": "dark:bg-red-950/20 bg-red-50",
        "text-blue-500": "dark:bg-blue-950/20 bg-blue-50",
        "text-orange-500": "dark:bg-orange-950/20 bg-orange-50",
        "text-purple-500": "dark:bg-purple-950/20 bg-purple-50",
    };

    return (
        <Card className={cn("shadow-lg transition-transform hover:scale-105", cardColorClasses[color])}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={cn("h-5 w-5 text-muted-foreground", color)} />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">
                    {value.toLocaleString('fr-FR')} {currency}
                </div>
            </CardContent>
        </Card>
    );
}
