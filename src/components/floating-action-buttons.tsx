'use client';

import React, { useState } from 'react';
import { Calculator, Zap, Package, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface FloatingAction {
    id: string;
    icon: React.ReactNode;
    label: string;
    classColor: string; // Renommé pour éviter conflit avec prop HTML
    path?: string;      // Chemin de navigation optionnel
    action?: () => void; // Action spécifique optionnelle
}

interface FloatingActionButtonsProps {
    onCalculatorClick?: () => void;
    onQuickSaleClick?: () => void;
    onStockClick?: () => void;
    onMarketingClick?: () => void;
}

export function FloatingActionButtons({
    onCalculatorClick,
    onQuickSaleClick,
    onStockClick,
    onMarketingClick,
}: FloatingActionButtonsProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const router = useRouter();

    const handleAction = (action: FloatingAction) => {
        if (action.action) {
            action.action();
        } else if (action.path) {
            router.push(action.path);
        }
        setIsExpanded(false);
    };

    const actions: FloatingAction[] = [
        {
            id: 'calculator',
            icon: <Calculator className="h-5 w-5" />,
            label: 'Calculatrice',
            classColor: 'bg-blue-500 hover:bg-blue-600',
            action: onCalculatorClick, // Pas de path par défaut car géré par un autre composant souvent
        },
        {
            id: 'quick-sale',
            icon: <Zap className="h-5 w-5" />,
            label: 'Vente Rapide',
            classColor: 'bg-yellow-500 hover:bg-yellow-600',
            action: onQuickSaleClick,
            path: '/reservations/new',
        },
        {
            id: 'stock',
            icon: <Package className="h-5 w-5" />,
            label: 'Stock',
            classColor: 'bg-green-500 hover:bg-green-600',
            action: onStockClick,
            path: '/stock',
        },
        {
            id: 'marketing',
            icon: <Megaphone className="h-5 w-5" />,
            label: 'Publicité',
            classColor: 'bg-purple-500 hover:bg-purple-600',
            action: onMarketingClick,
            path: '/publicity',
        },
    ];

    return (
        <>
            {/* Onglet latéral (Edge Panel style) */}
            <button
                className={cn(
                    'fixed right-0 top-1/2 -translate-y-1/2 z-50',
                    'w-1 h-16 bg-primary rounded-l-full',
                    'transition-all duration-300 hover:w-1.5',
                    'shadow-lg',
                    isExpanded && 'opacity-0 pointer-events-none'
                )}
                onClick={() => setIsExpanded(true)}
                aria-label="Ouvrir le menu rapide"
            />

            {/* Boutons flottants (apparaissent quand expanded) */}
            <div
                className={cn(
                    'fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3',
                    'transition-all duration-300 origin-right',
                    isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                )}
            >
                {actions.map((action, index) => (
                    <Button
                        key={action.id}
                        size="icon"
                        className={cn(
                            'h-12 w-12 rounded-full shadow-lg text-white transition-all duration-300 stagger-item',
                            action.classColor
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => handleAction(action)}
                        title={action.label}
                    >
                        {action.icon}
                    </Button>
                ))}
            </div>

            {/* Backdrop (fond sombre quand ouvert) */}
            {isExpanded && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </>
    );
}
