
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, useSidebar } from "@/components/ui/sidebar";
import { CreditCard, History, Users, ChevronDown, LayoutDashboard, Archive, ShoppingCart, Utensils, ClipboardList, Puzzle, Lightbulb, Megaphone, Contact, Sparkles, Briefcase, Video, Gift, Wallet, Package, Shield, CalendarCheck, Wrench, Bell, DollarSign, Server, FileCheck, Trash2, Laptop } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import * as React from "react";
import { useLoading } from "@/providers/loading-provider";
import { Badge } from "@/components/ui/badge";

type NavItemType = {
    href: string;
    label: string;
    icon: React.ElementType;
    isPremium?: boolean;
    subItems?: NavItemType[];
    isSuperAdmin?: boolean;
};

const NavItem = ({ item, pathname, handleLinkClick }: { item: NavItemType, pathname: string, handleLinkClick: () => void }) => {
    const Icon = item.icon;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isParentActive = hasSubItems && item.subItems?.some(sub => pathname.startsWith(sub.href));

    const [isSubMenuOpen, setIsSubMenuOpen] = React.useState(isParentActive);

    React.useEffect(() => {
        if (isParentActive) {
            setIsSubMenuOpen(true);
        }
    }, [isParentActive]);

    const toggleSubMenu = () => {
        setIsSubMenuOpen(prev => !prev);
    };

    const { businessProfile } = useAuth();
    const isFreePlan = !businessProfile?.subscriptionType || businessProfile?.subscriptionType === 'gratuit';

    if (hasSubItems) {
        return (
            <>
                <SidebarMenuButton
                    onClick={toggleSubMenu}
                    isActive={isParentActive}
                    className="justify-between"
                    aria-expanded={isSubMenuOpen}
                >
                    <div className="flex items-center gap-2">
                        <Icon />
                        <span className="truncate">{item.label}</span>
                    </div>
                    <ChevronDown className={cn("transform transition-transform duration-200", isSubMenuOpen ? "rotate-180" : "")} />
                </SidebarMenuButton>
                {isSubMenuOpen && (
                    <SidebarMenuSub>
                        {item.subItems?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                                <SidebarMenuSubButton
                                    asChild
                                    isActive={pathname.startsWith(subItem.href)}
                                >
                                    <Link href={subItem.href} onClick={handleLinkClick}>
                                        {subItem.icon && <subItem.icon />}
                                        <span className="truncate">{subItem.label}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                )}
            </>
        );
    }

    const isActive = (item.href === '/overview' || item.href === '/')
        ? (pathname === '/overview' || pathname === '/')
        : pathname.startsWith(item.href);

    return (
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
            <Link href={item.href} onClick={handleLinkClick}>
                <Icon />
                <div className="group-data-[collapsible=icon]:hidden flex items-center gap-2 w-full justify-between">
                    <span className="truncate">{item.label}</span>
                    {item.isPremium && (
                        <Badge variant={isFreePlan ? "default" : "secondary"} className={cn(
                            "px-1.5 py-0.5 text-[10px] leading-tight",
                            isFreePlan && "bg-yellow-400/80 text-yellow-900"
                        )}>
                            Premium
                        </Badge>
                    )}
                </div>
            </Link>
        </SidebarMenuButton>
    );
};


export function MainNav() {
    const pathname = usePathname();
    const { isAdmin, isSuperAdmin, businessProfile } = useAuth();
    const { setOpenMobile } = useSidebar();
    const { showLoader } = useLoading();

    const handleLinkClick = () => {
        showLoader();
        if (setOpenMobile) {
            setOpenMobile(false);
        }
    };

    const navItems = React.useMemo((): NavItemType[] => {
        const baseItems: NavItemType[] = [
            { href: "/overview", label: "Tableau de bord", icon: LayoutDashboard },
            { href: "/financial-health", label: "Santé Financière", icon: DollarSign, isPremium: true },
            { href: "/assistant", label: "TRIX Business", icon: Sparkles },
        ];

        let dynamicItem: NavItemType = { href: "/reservations", label: "Prestations", icon: ClipboardList };
        const businessType = businessProfile?.type.toLowerCase() || '';

        if (businessType.includes('hôtel')) {
            dynamicItem = { href: "/reservations", label: "Réservations", icon: ClipboardList };
        } else if (businessType.includes('restaurant') || businessType.includes('bar')) {
            dynamicItem = { href: "/reservations", label: "Commandes", icon: Utensils };
        } else if (businessType.includes('quincaillerie') || businessType.includes('boutique') || businessType.includes('magasin')) {
            dynamicItem = { href: "/reservations", label: "Ventes", icon: ShoppingCart };
        } else if (businessType.includes('pharmacie') || businessType.includes('clinique') || businessType.includes('hôpital')) {
            dynamicItem = { href: "/reservations", label: "Patients", icon: Users };
        }

        const clientItem: NavItemType = { href: "/clients", label: "Clients", icon: Contact };

        const remainingItems: NavItemType[] = [
            { href: "/expenses", label: "Trésorerie", icon: Wallet },
            { href: "/stock", label: "Gestion de Stock", icon: Package },
            { href: "/planning", label: "Planification", icon: CalendarCheck },
            { href: "/server", label: "Mon Serveur (beta)", icon: Server },
            { href: "/notifications", label: "Notifications", icon: Bell },
            { href: "/activity-log", label: "Journal d'activité", icon: History },
            { href: "/publicity", label: "Faire une PUB", icon: Megaphone },
        ];

        let finalNav: NavItemType[] = [...baseItems, dynamicItem, clientItem, ...remainingItems];

        const isInvestmentPremium = true;
        const isGamesPremium = false;

        if (isAdmin || (businessProfile && businessProfile.investmentFeatureEnabledForEmployees !== false)) {
            const investmentItem: NavItemType = { href: "/investments", label: "Investissements", icon: Briefcase, isPremium: isInvestmentPremium };
            const stockIndex = finalNav.findIndex(item => item.href === '/stock');
            if (stockIndex !== -1) {
                finalNav.splice(stockIndex + 1, 0, investmentItem);
            } else {
                finalNav.push(investmentItem);
            }
        }

        if (isAdmin || (businessProfile && businessProfile.gamesForEmployeesEnabled !== false)) {
            finalNav.push({ href: "/games", label: "Jeux", icon: Puzzle, isPremium: isGamesPremium });
        }

        finalNav.push({ href: "/videos", label: "Vidéos", icon: Video });

        if (isAdmin) {
            const adminSubItems: NavItemType[] = [
                { href: "/admin/users", label: "Gestion utilisateurs", icon: Users },
                { href: "/admin/subscription", label: "Gérer l'abonnement", icon: Shield },
            ];

            if (isSuperAdmin) {
                adminSubItems.push({ href: "/admin/approvals", label: "Approbations", icon: FileCheck });
            }

            adminSubItems.push({ href: "/admin/sync", label: "Centre de Contrôle", icon: Laptop });
            adminSubItems.push({ href: "/admin/trash", label: "Corbeille", icon: Trash2 });

            finalNav.push({
                href: "#admin",
                label: "Administration",
                icon: Shield,
                subItems: adminSubItems,
                isPremium: true
            });
        }

        return finalNav;

    }, [businessProfile, isAdmin, isSuperAdmin]);

    return (
        <SidebarMenu>
            {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                    <NavItem
                        item={item}
                        pathname={pathname}
                        handleLinkClick={handleLinkClick}
                    />
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    );
}
