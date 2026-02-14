


"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { auth, database } from '@/lib/firebase/config';
import { ref, onValue } from 'firebase/database';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarRail, SidebarHeader, SidebarContent, SidebarFooter, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/layout/main-nav';
import { UserNav } from '@/components/layout/user-nav';
import { WalletButton } from '@/components/layout/wallet-button';
import { Button } from '@/components/ui/button';
import { Settings, AlertTriangle, ArrowRight, ShieldAlert, Briefcase, DollarSign, Star, HelpCircle, X, Clock } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { NotificationBell } from '@/components/layout/notification-bell';
import { cn } from '@/lib/utils';
import { PinLockScreen } from '@/components/auth/pin-lock-screen';
import { WelcomeSplash } from '@/components/layout/welcome-splash';
import { PremiumFeatureGuard } from '@/components/layout/premium-feature-guard';
import { useLoading } from '@/providers/loading-provider';
import { getPlanningItems } from '@/lib/firebase/database';
import type { PlanningItem } from '@/lib/types';
import { subDays, isSameDay } from 'date-fns';
import { AppLogo } from '@/components/layout/app-logo';
import { InstallButton } from '@/components/pwa/install-button';
import { HeaderStatusIcons } from '@/components/layout/header-status-icons';
import { FloatingCalculator } from '@/components/layout/floating-calculator';
import { GlobalSearch } from '@/components/layout/global-search';
import { GlobalSearchProvider } from '@/providers/global-search-provider';
import { useToast } from '@/hooks/use-toast';

import { BottomNavigation } from '@/components/bottom-navigation';
import { DeviceOverrideDialog } from '@/components/settings/device-override-dialog';



import { syncService } from '@/lib/sync-service';
import { sendDeviceOverrideEmail } from '@/lib/email/device-override-email';

// These are the main navigation routes. Any route not in this list will be considered an "annex" page.
const mainRoutes = [
  '/overview', '/reservations', '/customers', '/expenses', '/stock', '/investments',
  '/activity-log', '/advice', '/publicity', '/referrals', '/games', '/ideas',
  '/videos', '/settings', '/admin/users', '/admin/tools', '/admin/subscription', '/admin/standard-subscription', '/planning', '/notifications',
  '/financial-health', '/server',
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading, usageStats, planDetails, isAdmin, businessProfile, isPinLocked, addNotification, activeWorkspaceId, showLoader, businessId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [timeLeft, setTimeLeft] = useState('');
  const [isHelpButtonVisible, setIsHelpButtonVisible] = useState(false);
  const [isPremiumBannerVisible, setIsPremiumBannerVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isVerifyingPresence, setIsVerifyingPresence] = useState(true);
  const [blockReason, setBlockReason] = useState("");
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [isOverrideLoading, setIsOverrideLoading] = useState(false);

  const isAssistantPage = pathname === '/assistant';

  useEffect(() => {
    // AuthProvider now handles all redirection logic based on loading and currentUser state.
    // This simplifies the layout's responsibility.
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  // Sync data on load & Real-time listeners
  const syncCount = React.useRef(0);
  const lastDeps = React.useRef<any>(null);

  useEffect(() => {
    if (currentUser && businessId && activeWorkspaceId && navigator.onLine) {
      syncCount.current++;

      const currentDeps = { currentUser: currentUser.uid, businessId, activeWorkspaceId, profileId: businessProfile?.id, profileUpdated: businessProfile?.updatedAt };

      console.log(`[Layout] Sync effect run #${syncCount.current}`, {
        changes: lastDeps.current ? Object.keys(currentDeps).filter(k => (currentDeps as any)[k] !== (lastDeps.current as any)[k]) : 'initial'
      });

      lastDeps.current = currentDeps;

      if (syncCount.current > 20) {
        console.error("[Layout] Detected potential infinite loop in sync effect. Stopping.");
        return;
      }

      let isMounted = true;
      let stopRealTimeSync: (() => void) | undefined;

      const runSync = async () => {
        setIsVerifyingPresence(true);
        // 1. Initialize Presence & Check Limits
        const planId = businessProfile?.subscriptionType || 'gratuit';
        const presenceResult = await syncService.initializePresence(businessId, navigator.userAgent, planId);

        if (!presenceResult.success) {
          if (presenceResult.reason === "MAX_DEVICES_REACHED") {
            const limit = presenceResult.max || 1;
            const msg = `Votre plan ${planId} est limité à ${limit} appareil(s) simultané(s). Veuillez déconnecter un autre appareil ou passer au plan supérieur.`;
            if (isMounted) {
              setBlockReason(msg);
              setIsBlocked(true);
              setIsVerifyingPresence(false); // Verification done (failed)
            }
            return;
          }
        } else {
          if (isMounted) {
            setIsBlocked(false);
            setIsVerifyingPresence(false); // Verification done (success)
          }
        }

        const { id: toastId, dismiss } = toast({
          title: "Synchronisation...",
          description: "Connexion au serveur en cours...",
          duration: 1000000,
        });

        await syncService.initialSync(businessId, activeWorkspaceId, (progress, message) => {
          if (!isMounted) return;
          if (progress >= 100) {
            dismiss();
            toast({
              title: "Synchronisé & Connecté",
              description: "Vos données sont à jour et votre appareil est actif.",
              duration: 3000,
              variant: "default",
              className: "bg-green-50 dark:bg-green-900 border-green-200"
            });
          }
        });

        // Start Real-time listeners
        stopRealTimeSync = syncService.initializeRealTimeSync(businessId, activeWorkspaceId);
      };

      runSync();

      return () => {
        isMounted = false;
        if (stopRealTimeSync) stopRealTimeSync();
      };
    } else if (!navigator.onLine) {
      // In offline mode, we allow access but without presence check
      setIsVerifyingPresence(false);
      setIsBlocked(false);
    }
  }, [currentUser, businessId, activeWorkspaceId, businessProfile, toast]);


  // Real-time Block/Unblock Listener
  useEffect(() => {
    if (!businessId || !navigator.onLine) return;

    // We only need to listen actively if we are blocked OR to prevent over-limit during session?
    // Listening always is safer to catch "kicked" state too.

    // However, to fix the specific issue "not unblocking", lets focus on that.
    // If we are waiting, we want to know when a spot opens.

    // We use imported ref, onValue and database from config

    const devicesRef = ref(database, `businesses/${businessId}/devices`);

    const unsubscribe = onValue(devicesRef, (snapshot: any) => {
      if (!snapshot.exists()) return;
      const devices = snapshot.val();

      // My Device ID
      const DEVICE_ID_KEY = 'ttr_device_id';
      const myDeviceId = localStorage.getItem(DEVICE_ID_KEY);

      // Active others
      const activeOthers = Object.values(devices).filter((d: any) => d.status === 'online' && d.id !== myDeviceId).length;

      const planId = businessProfile?.subscriptionType || 'gratuit';

      // Use standard plan limits (must match planDefinitions in auth-provider)
      let MAX_DEVICES = 1;
      if (planId === 'particulier') MAX_DEVICES = 3;
      else if (planId === 'entreprise') MAX_DEVICES = 10;
      else if (planId === 'élite') MAX_DEVICES = 999; // Unlimited

      // Auto-Unblock if space available
      if (isBlocked && activeOthers < MAX_DEVICES) {
        console.log(`[Presence] Space freed up (Plan: ${planId}, Max: ${MAX_DEVICES}). Auto-unblocking.`);
        setIsBlocked(false);
        setBlockReason("");
      }
    });

    return () => unsubscribe();
  }, [businessId, isBlocked, businessProfile]);

  // Free plan premium banner logic
  useEffect(() => {
    if (!businessProfile || businessProfile.subscriptionType !== 'gratuit') {
      setIsPremiumBannerVisible(false);
      return;
    }

    const dismissedUntil = localStorage.getItem('premiumBannerDismissedUntil');
    const now = new Date().getTime();

    if (!dismissedUntil || now > parseInt(dismissedUntil, 10)) {
      setIsPremiumBannerVisible(true);
    } else {
      setIsPremiumBannerVisible(false);
    }

  }, [businessProfile]);

  // Reminder and Notification Permission logic
  useEffect(() => {
    // Request browser notification permission on load
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (!currentUser?.businessId || !activeWorkspaceId) return;

    const checkReminders = async () => {
      const items = await getPlanningItems(currentUser.businessId!, activeWorkspaceId!);
      if (!items) return;

      const now = new Date();
      const remindedKey = `reminded_planning_items_${currentUser.uid}`; // User-specific key
      const remindedItems: Record<string, string> = JSON.parse(localStorage.getItem(remindedKey) || '{}');

      for (const item of items) {
        if (item.reminderEnabled && item.status === 'pending' && !remindedItems[item.id]) {
          const dueDate = new Date(item.date);
          let reminderDate = dueDate;

          if (item.reminderTime === '1-day-before') {
            reminderDate = subDays(dueDate, 1);
          } else if (item.reminderTime === '2-days-before') {
            reminderDate = subDays(dueDate, 2);
          }

          if (isSameDay(now, reminderDate)) {
            const title = `Rappel: ${item.title}`;
            const body = `Ceci est un rappel pour l'élément planifié : "${item.title}" qui est dû le ${new Date(item.date).toLocaleDateString()}.`;

            addNotification({ title, description: body, href: "/planning" });

            if (Notification.permission === 'granted') {
              new Notification(title, { body, icon: '/ttr gestion.png' });
            }

            remindedItems[item.id] = new Date().toISOString();
          }
        }
      }
      localStorage.setItem(remindedKey, JSON.stringify(remindedItems));
    };

    const intervalId = setInterval(checkReminders, 10 * 60 * 1000); // Check every 10 minutes
    checkReminders(); // Initial check

    return () => clearInterval(intervalId);

  }, [currentUser, activeWorkspaceId, addNotification]);

  // Logic for the permanently dismissible help button
  useEffect(() => {
    const helpButtonState = localStorage.getItem('helpButtonHidden');
    if (helpButtonState !== 'true') {
      setIsHelpButtonVisible(true);
    }
  }, []);

  const animationClass = useMemo(() => {
    const isMainPage = mainRoutes.includes(pathname);
    return isMainPage ? 'animate-fade-in' : 'animate-flow-in';
  }, [pathname]);

  const createWhatsAppLink = () => {
    const phoneNumber = "+22899974389";
    const message = `Bonjour, j'ai besoin d'une assistance pour TTR Gestion. Mon entreprise est "${businessProfile?.name || 'inconnue'}".`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  const handleCloseHelpButton = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem('helpButtonHidden', 'true');
    setIsHelpButtonVisible(false);
    toast({
      title: 'Assistance',
      description: "Le bouton d'assistance a été masqué. Vous pouvez toujours le retrouver dans les Paramètres.",
    });
  };

  const handleDismissPremiumBanner = () => {
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const dismissedUntil = new Date().getTime() + thirtyDaysInMs;
    localStorage.setItem('premiumBannerDismissedUntil', dismissedUntil.toString());
    setIsPremiumBannerVisible(false);
  };

  const handleDeviceOverride = async () => {
    if (!currentUser?.email || !businessId) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de récupérer les informations utilisateur."
      });
      return;
    }

    setIsOverrideLoading(true);
    try {
      // Get current device ID (we'll use a temporary one for now)
      const deviceId = localStorage.getItem('deviceId') || 'unknown';

      const result = await sendDeviceOverrideEmail(
        currentUser.email,
        businessId,
        deviceId
      );

      if (result.success) {
        toast({
          title: "Email envoyé !",
          description: "Un email de confirmation a été envoyé. Le lien a été copié dans votre presse-papiers pour les tests.",
          duration: 10000
        });
        setShowOverrideDialog(false);
      } else {
        throw new Error(result.error || "Échec de l'envoi de l'email");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Échec de l'envoi",
        description: error.message || "Impossible d'envoyer l'email de confirmation."
      });
    } finally {
      setIsOverrideLoading(false);
    }
  };

  if (loading || isVerifyingPresence) {
    return <WelcomeSplash />; // Prevent any flash of content during verification
  }

  if (!currentUser) {
    return null; // AuthProvider handles the redirect, returning null prevents rendering the layout.
  }

  if (isPinLocked) {
    return <PinLockScreen />;
  }

  const usagePercentage = (usageStats && planDetails?.storage && typeof planDetails.storage === 'number')
    ? (usageStats.storageUsed / (planDetails.storage * 1024 * 1024)) * 100
    : 0;
  const showUsageWarning = isAdmin && usagePercentage >= 75;

  const isSubscriptionPath = pathname === '/admin/subscription' ||
    pathname === '/admin/standard-subscription' ||
    pathname === '/admin/activate-plan' ||
    pathname.startsWith('/admin/payment-instructions');

  if (isBlocked && !isSubscriptionPath) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4 text-center animate-in fade-in zoom-in duration-300">
        <div className="rounded-full bg-red-100 p-6 mb-6 dark:bg-red-900/20">
          <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Limite d'appareils atteinte</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          {blockReason || "Vous avez atteint le nombre maximum d'appareils connectés pour votre plan."}
        </p>

        <div className="flex flex-col gap-3 w-full max-w-sm mb-6">
          <Button asChild className="w-full">
            <Link href="/admin/standard-subscription">
              <Star className="mr-2 h-4 w-4" />
              Passer au plan supérieur
            </Link>
          </Button>

          <Button
            variant="outline"
            className="w-full text-orange-600 border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
            onClick={() => setShowOverrideDialog(true)}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Écraser l'appareil occupé
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" onClick={() => window.location.reload()} size="sm">
            <Clock className="mr-2 h-4 w-4" /> Réessayer
          </Button>
          <Button variant="ghost" onClick={() => auth.signOut()} size="sm">
            <X className="mr-2 h-4 w-4" /> Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <GlobalSearchProvider>
      <SidebarProvider defaultOpen={false} className="w-full overflow-x-hidden">
        {!isBlocked && (
          <>
            <Sidebar collapsible="icon" variant="sidebar" side="left" className="hidden md:flex border-r !top-16 !h-[calc(100svh-4rem)] bg-background">
              <SidebarHeader className="p-2 pt-4 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pt-4">
                <Link href="/overview" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center" onClick={showLoader}>
                  <AppLogo className="h-8 w-8 shrink-0" />
                  <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                    <span className="text-lg font-bold tracking-tight">TTR</span>
                    <span className="text-xs text-sidebar-foreground/70 -mt-1">Gestion</span>
                  </div>
                </Link>
              </SidebarHeader>
              <SidebarContent className="p-2">
                <MainNav />
              </SidebarContent>
              <SidebarFooter className="p-2">
                <Button variant="ghost" className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center" asChild>
                  <Link href="/settings" onClick={showLoader}>
                    <Settings className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden">Paramètres</span>
                  </Link>
                </Button>
              </SidebarFooter>
            </Sidebar>
            <SidebarRail />
          </>
        )}

        <header className="fixed top-0 left-0 right-0 z-30 flex h-16 items-center justify-between border-b bg-white dark:bg-background px-2 md:px-4 transition-all duration-300">
          <div className="flex h-16 w-full items-center justify-between">
            {!isBlocked && <SidebarTrigger />}
            {isBlocked ? (
              <div className="flex items-center gap-2 px-2">
                <AppLogo className="h-8 w-8" />
                <span className="font-bold tracking-tight">TTR Gestion</span>
                <span className="hidden sm:inline-block text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium ml-2">Appareil Limité</span>
              </div>
            ) : (
              <HeaderStatusIcons />
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              {!isBlocked && (
                <>
                  <WalletButton />
                  <GlobalSearch />
                  <NotificationBell />
                </>
              )}
              <UserNav />
            </div>
          </div>
        </header>

        <div className={cn("flex flex-1 w-full min-h-screen pt-16", isBlocked && "md:pl-0")}>
          <div className="flex-1 flex flex-col transition-all duration-300">

            {isPremiumBannerVisible && (
              <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-gray-50 px-6 py-2.5 sm:px-3.5 sm:before:flex-1 m-4 mb-0 rounded-lg border border-gray-200">
                <div
                  className="absolute left-[max(-7rem,calc(50%-52rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
                  aria-hidden="true"
                >
                  <div
                    className="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-30"
                    style={{
                      clipPath:
                        'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)',
                    }}
                  />
                </div>
                <div
                  className="absolute left-[max(45rem,calc(50%+8rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl"
                  aria-hidden="true"
                >
                  <div
                    className="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-30"
                    style={{
                      clipPath:
                        'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)',
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="text-sm leading-6 text-gray-900">
                    <strong className="font-semibold">Passez à la vitesse supérieure !</strong>
                    <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true">
                      <circle cx={1} cy={1} r={1} />
                    </svg>
                    Débloquez des fonctionnalités puissantes comme plus d'employés et l'IA.
                  </p>
                  <Button size="sm" variant="default" className="flex-none rounded-full bg-gray-900 px-3.5 py-1 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900" asChild>
                    <Link href="/admin/standard-subscription" onClick={showLoader}>
                      Voir les forfaits <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </Button>
                </div>
                <div className="flex flex-1 justify-end">
                  <button type="button" className="-m-3 p-3 focus-visible:outline-offset-[-4px]" onClick={handleDismissPremiumBanner}>
                    <span className="sr-only">Fermer</span>
                    <X className="h-5 w-5 text-gray-900" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {showUsageWarning && (
              <Alert variant="destructive" className="m-4 mb-0 border-2 border-destructive/80 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Avertissement sur l'utilisation du stockage</AlertTitle>
                <AlertDescription className="flex justify-between items-center">
                  <div>
                    Vous avez utilisé {usagePercentage.toFixed(0)}% de votre stockage.
                    Pensez à mettre à niveau pour éviter toute interruption de service.
                  </div>
                  <Button size="sm" asChild>
                    <Link href="/admin/subscription" onClick={showLoader}>Gérer l'abonnement <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <main className={cn("flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-6 flex flex-col items-center", isAssistantPage && "p-0 md:p-0 lg:p-0 pb-24 md:pb-0")}>
              <div className={cn("flex-1 flex flex-col w-full max-w-[1600px]", animationClass)}>
                <PremiumFeatureGuard pathname={pathname}>
                  {children}
                </PremiumFeatureGuard>
              </div>
            </main>
          </div>
        </div>
        {!isBlocked && <FloatingCalculator />}

        {!isBlocked && <BottomNavigation />}

        {/* Device Override Dialog */}
        <DeviceOverrideDialog
          isOpen={showOverrideDialog}
          onClose={() => setShowOverrideDialog(false)}
          onConfirm={handleDeviceOverride}
          userEmail={currentUser?.email || ''}
          isLoading={isOverrideLoading}
        />
      </SidebarProvider>
    </GlobalSearchProvider>
  );

}