'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Wallet, Users, Zap, Briefcase, Bot, RotateCcw, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    href: string;
    isCenter?: boolean;
}

export function BottomNavigation() {
    const pathname = usePathname();
    const router = useRouter();
    const [isNavigatingToQuickSale, setIsNavigatingToQuickSale] = React.useState(false);

    // Desktop & Drag functionality
    const [isDesktop, setIsDesktop] = React.useState(false);
    const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
    const navRef = React.useRef<HTMLElement>(null);
    const dragRef = React.useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    React.useEffect(() => {
        const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isDesktop) return;
        e.preventDefault();
        const element = navRef.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        let currentX = position ? position.x : rect.left;
        let currentY = position ? position.y : rect.top;
        if (!position) setPosition({ x: currentX, y: currentY });
        dragRef.current = { startX: e.clientX, startY: e.clientY, initX: currentX, initY: currentY };
        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!dragRef.current) return;
            const dx = moveEvent.clientX - dragRef.current.startX;
            const dy = moveEvent.clientY - dragRef.current.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setIsDragging(true);
            let newX = dragRef.current.initX + dx;
            let newY = dragRef.current.initY + dy;
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            setPosition({ x: newX, y: newY });
        };
        const handleMouseUp = () => {
            dragRef.current = null;
            setTimeout(() => setIsDragging(false), 50);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // State for shrinking the Quick Sale button on mobile assistant page
    const [isQuickSaleShrunk, setIsQuickSaleShrunk] = React.useState(false);

    React.useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (pathname === '/assistant' && !isDesktop) {
            timeoutId = setTimeout(() => setIsQuickSaleShrunk(true), 3000);
        } else {
            timeoutId = setTimeout(() => setIsQuickSaleShrunk(false), 3000);
        }
        return () => clearTimeout(timeoutId);
    }, [pathname, isDesktop]);

    const navItems: BottomNavItem[] = [
        {
            id: 'publicity',
            label: 'Pub',
            icon: <Megaphone className="h-5 w-5" />,
            href: '/publicity',
        },
        {
            id: 'clients',
            label: 'Clients',
            icon: <Users className="h-5 w-5" />,
            href: '/clients',
        },
        {
            id: 'quick-sale',
            label: 'Vente Rapide',
            icon: <Zap className={cn("transition-all duration-700", isQuickSaleShrunk ? "h-5 w-5" : "h-6 w-6")} />,
            href: '/overview#vente-rapide',
            isCenter: true,
        },
        {
            id: 'treasury',
            label: 'Trésorerie',
            icon: <Wallet className="h-5 w-5" />,
            href: '/expenses',
        },
        {
            id: 'ai',
            label: 'IA',
            icon: <Bot className="h-5 w-5" />,
            href: '/assistant',
        },
    ];

    const isActive = (href: string) => {
        if (href === '/dashboard' || href === '/overview') {
            return pathname === '/' || pathname === '/dashboard' || pathname === '/overview';
        }
        return pathname.startsWith(href);
    };

    const handleNavClick = (e: React.MouseEvent, href: string) => {
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (href === '/overview#vente-rapide') {
            e.preventDefault();
            if (pathname === '/overview' || pathname === '/dashboard' || pathname === '/') {
                const element = document.getElementById('vente-rapide');
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const isVisible = (
                        rect.top >= 0 &&
                        rect.left >= 0 &&
                        rect.top <= (window.innerHeight || document.documentElement.clientHeight) / 2 &&
                        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                    );
                    if (isVisible) {
                        element.classList.remove('animate-shake');
                        void element.offsetWidth;
                        element.classList.add('animate-shake');
                    } else {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else {
                    router.push('/overview');
                    setTimeout(() => {
                        const el = document.getElementById('vente-rapide');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 500);
                }
            } else {
                setIsNavigatingToQuickSale(true);
                setTimeout(() => setIsNavigatingToQuickSale(false), 3000);
                router.push('/overview#vente-rapide');
            }
        }
    };

    // Calculate styles for Desktop Dragging
    const desktopStyle: React.CSSProperties = isDesktop
        ? position
            ? { left: position.x, top: position.y }
            : { top: '0.7rem', left: '50%', transform: 'translateX(-50%)' }
        : {};

    return (
        <nav
            ref={navRef}
            onMouseDown={handleMouseDown}
            style={desktopStyle}
            className={cn(
                "fixed z-50 bg-background border-border shadow-lg transition-shadow duration-200",
                isDesktop
                    ? "rounded-full border cursor-move bg-background/90 backdrop-blur-md px-4 py-2" // Desktop styles
                    : "bottom-0 left-0 right-0 border-t" // Mobile styles
            )}
        >
            <div className={cn(
                "flex items-center justify-around",
                isDesktop ? "gap-4 min-w-[320px]" : "px-2 pb-2 pt-1"
            )}>
                {navItems.map((item) => {
                    const active = isActive(item.href.split('#')[0]);

                    if (item.isCenter) {
                        // Bouton central (Vente Rapide)
                        return (
                            <div
                                key={item.id}
                                onClick={(e) => handleNavClick(e, item.href)}
                                className={cn(
                                    "flex flex-col items-center justify-center cursor-pointer transition-all duration-700 ease-in-out", // Added transition
                                    !isDesktop && !isQuickSaleShrunk && "-mt-6", // Only pop up on mobile if not shrunk
                                    !isDesktop && isQuickSaleShrunk && "mt-1", // Inline if shrunk
                                    isDesktop && "hover:scale-105"
                                )}
                            >
                                <div
                                    className={cn(
                                        'flex items-center justify-center rounded-full shadow-xl transition-all duration-700 ease-in-out', // Fluid transition
                                        isDesktop ? 'h-10 w-10' : (isQuickSaleShrunk ? 'h-10 w-10' : 'h-16 w-16'), // Size change
                                        isNavigatingToQuickSale
                                            ? 'bg-green-600 text-white scale-110'
                                            : active
                                                ? 'bg-primary text-primary-foreground scale-110'
                                                : 'bg-primary text-primary-foreground hover:scale-105'
                                    )}
                                >
                                    {item.icon}
                                </div>
                                <span className={cn(
                                    "text-xs font-medium mt-1 text-primary transition-all duration-700",
                                    isDesktop && "hidden xl:block" // Optionally hide text on smaller desktop or keep it
                                )}>
                                    {item.label}
                                </span>
                            </div>
                        );
                    }

                    // Boutons normaux
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            onClick={(e) => {
                                if (isDragging) {
                                    e.preventDefault();
                                    return;
                                }
                            }}
                            className={cn(
                                'flex flex-col items-center justify-center rounded-lg transition-all duration-200',
                                isDesktop ? 'min-w-[40px] px-2 py-1' : 'min-w-[60px] py-2 px-1',
                                active
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            )}
                            draggable={false} // Prevent native drag of links
                        >
                            <div
                                className={cn(
                                    'transition-transform duration-200',
                                    active && 'scale-110'
                                )}
                            >
                                {item.icon}
                            </div>
                            <span className={cn(
                                'text-xs font-medium mt-1 transition-all duration-200',
                                active && 'font-semibold',
                                isDesktop && "hidden xl:block" // Hide label on desktop if preferred for cleaner look, or keep logic simple
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}

                {isDesktop && position && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setPosition(null);
                        }}
                        className="ml-2 flex items-center justify-center p-2 rounded-full h-8 w-8 bg-secondary text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground transition-all cursor-pointer shadow-sm"
                        title="Rétablir la position par défaut"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </div>
                )}
            </div>

            {/* Indicateur de sécurité pour l'encoche des téléphones - Seulement mobile */}
            {!isDesktop && <div className="h-safe-area-inset-bottom bg-background" />}
        </nav>
    );
}
