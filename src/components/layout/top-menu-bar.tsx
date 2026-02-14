'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Activity,
    Stethoscope,
    Zap,
    Briefcase,
    Menu,
    Calendar,
    Settings
} from 'lucide-react';
import { TrixBusinessLogo } from '@/components/icons/trix-business-logo';

export function TopMenuBar() {
    const pathname = usePathname();

    // Menu inspiré du BottomNavigation mais adapté au format Desktop Toolbar
    const menuItems = [
        {
            label: 'Vue d\'ensemble',
            href: '/overview',
            icon: LayoutDashboard,
            activeColor: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20'
        },
        {
            label: 'Caisse',
            href: '/reservations/new',
            icon: ShoppingCart, // Ou Zap pour "Vente Rapide"
            activeColor: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
        },
        {
            label: 'Stock',
            href: '/stock',
            icon: Package,
            activeColor: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20'
        },
        {
            label: 'Clients',
            href: '/clients',
            icon: Users,
            activeColor: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20'
        },
        {
            label: 'Prestations',
            href: '/reservations',
            icon: Briefcase,
            activeColor: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20'
        },
        {
            label: 'IA TRIX',
            href: '/assistant',
            icon: TrixBusinessLogo,
            activeColor: 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20'
        },
    ];

    return (
        <div className="hidden md:flex items-center w-full h-10 bg-background border-b border-border select-none fixed top-16 left-0 right-0 z-20 transition-all duration-300 md:pl-[calc(var(--sidebar-width)+1.5rem)] lg:pl-[calc(var(--sidebar-width)+2rem)] px-4">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/overview' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center px-3 py-1.5 text-sm font-medium transition-all duration-200 rounded-md mx-0.5 group relative overflow-hidden",
                                isActive
                                    ? cn("font-semibold shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10", item.activeColor)
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent hover:shadow-sm"
                            )}
                        >
                            <Icon className={cn(
                                "h-4 w-4 mr-2 transition-transform duration-300 group-hover:scale-110",
                                isActive && "scale-110"
                            )} />
                            <span className="relative z-10">{item.label}</span>

                            {/* Petit indicateur animé en bas si actif */}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current opacity-50 animate-in slide-in-from-left-2 duration-300" />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Partie Droite : Infos Système */}
            <div className="ml-auto flex items-center px-4 text-xs text-muted-foreground gap-4 border-l border-border h-full bg-muted/20">
                <span className="font-mono opacity-70">v1.1.0</span>
                <div className="h-4 w-[1px] bg-border"></div>

                <div className="flex items-center gap-2 group cursor-help" title="Statut du serveur : Opérationnel">
                    <div className="relative">
                        <Stethoscope className="h-3.5 w-3.5 text-green-500 transition-transform group-hover:rotate-12" />
                        <span className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse ring-1 ring-background" />
                    </div>
                    <span className="hidden lg:inline group-hover:text-foreground transition-colors">Système Connecté</span>
                </div>

                <div className="h-4 w-[1px] bg-border hidden lg:block"></div>

                <Link href="/settings" className="p-1.5 hover:bg-accent rounded-full transition-colors hidden lg:flex" title="Paramètres rapides">
                    <Settings className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    );
}
