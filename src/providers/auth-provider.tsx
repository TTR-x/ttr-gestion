

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, database } from '@/lib/firebase/config';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updateProfile, type User as FirebaseAuthUser, setPersistence, browserLocalPersistence, reauthenticateWithCredential, EmailAuthProvider, updatePassword, sendEmailVerification } from 'firebase/auth';
import type { User as AppUser, BusinessProfile, PersonalizationSettings, AppNotification, PlanName, Workspace, SubscriptionRequest, PendingReceipt } from '@/lib/types';
import { fetchUserByUid, getBusinessProfile, logActivity, getPersonalizationSettings, createOrUpdateBusinessProfile, getUsers, getBusinessDataUsage, getAppNotifications, createUserProfile, getLastSubscriptionRequest, getWorkspaceSettings, saveUserPushToken } from '@/lib/firebase/database';
import { syncService } from '@/lib/sync-service';
import { messaging } from '@/lib/firebase/config';
import { getToken, onMessage } from 'firebase/messaging';
import { useRouter, usePathname } from 'next/navigation';
import { getDatabase, ref, update, query, orderByChild, equalTo, get } from 'firebase/database';
import { useToast } from "@/hooks/use-toast";
import { WelcomeSplash } from '@/components/layout/welcome-splash';
import { addDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

interface SignUpData {
  email: string;
  password?: string;
  userName: string;
}

interface PlanDetails {
  planName: string;
  expiresAt: number | null;
  employees: number | string;
  storage: number | string;
  bandwidth: number | string;
  aiQuestions: number | string;
  aiImages: number | string;
  maxDevices: number | string;
  maxWorkspaces: number | string;
  price?: string; // e.g. "1500 FCFA/an"
}

const planDefinitions: Record<string, any> = {
  gratuit: {
    planName: 'Gratuit',
    price: 'Gratuit',
    employees: 0,
    storage: 100 * 1024 * 1024, // 100 Mo
    bandwidth: 0,
    aiQuestions: 5, // "très limité"
    aiImages: 0,
    maxDevices: 1,
    maxWorkspaces: 1
  },
  particulier: {
    planName: 'Particulier',
    price: '1 500 FCFA/an',
    employees: 2,
    storage: 1 * 1024 * 1024 * 1024, // 1 Go
    bandwidth: 1.2 * 1024 * 1024 * 1024,
    aiQuestions: 50, // "standard"
    aiImages: 5,
    maxDevices: 3,
    maxWorkspaces: 2
  },
  entreprise: {
    planName: 'Entreprise',
    price: '4 800 FCFA/an',
    employees: 20,
    storage: 5 * 1024 * 1024 * 1024, // 5 Go
    bandwidth: 5 * 1024 * 1024 * 1024,
    aiQuestions: 100,
    aiImages: 20,
    maxDevices: 10,
    maxWorkspaces: 15
  },
  élite: {
    planName: 'Élite',
    price: '97 000 FCFA/an',
    employees: 'Illimité',
    storage: 'Illimité',
    bandwidth: 'Illimité',
    aiQuestions: 'Illimité',
    aiImages: 'Illimité',
    maxDevices: 'Illimité',
    maxWorkspaces: 'Illimité'
  },
};


const currencySymbols: Record<string, string> = {
  'EUR': '€', 'USD': '$', 'GBP': '£', 'JPY': '¥', 'CAD': '$', 'AUD': '$', 'CHF': 'CHF', 'CNY': '¥', 'NGN': '₦', 'GHS': '₵',
};

interface UsageStats {
  employeeCount: number;
  storageUsed: number; // in bytes
  bandwidthUsed: number; // in bytes
  aiQuestionsUsed: number;
  aiImagesUsed: number;
}



interface AuthContextType {
  currentUser: AppUser | null;
  businessId: string | null;
  businessProfile: BusinessProfile | null;
  personalizationSettings: PersonalizationSettings | null;
  workspaceSettings: PersonalizationSettings | null; // Added
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSubscriptionActive: boolean; // New state to control write access
  login: (email: string, password?: string) => Promise<FirebaseAuthUser>;
  loginWithPhoneNumberAndPassword: (phoneNumber: string, password: string) => Promise<void>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  signupAndCreateWorkspace: (data: SignUpData) => Promise<void>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  refreshAuthContext: () => Promise<void>;
  switchWorkspace: (newWorkspaceId: string) => Promise<void>;
  activeWorkspaceId: string | null;
  usageStats: UsageStats | null;
  planDetails: PlanDetails | null;
  isPinLocked: boolean;
  verifyPin: (pin: string) => Promise<boolean>;
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  getCurrencySymbol: (code?: string) => string;
  markAsRead: (id: 'all' | string) => void;
  clearNotifications: () => void;
  showLoader: () => void;
  pendingReceipts: PendingReceipt[];
  addPendingReceipt: (receipt: Omit<PendingReceipt, 'id' | 'timestamp'>) => void;
  clearPendingReceipts: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get notification state from localStorage
const getNotificationStateFromStorage = (userId: string | null) => {
  if (typeof window === 'undefined' || !userId) return {};
  const storedState = localStorage.getItem(`notification_state_${userId}`);
  try {
    return storedState ? JSON.parse(storedState) : {};
  } catch (e) {
    return {};
  }
};

// Helper function to set notification state to localStorage
const setNotificationStateToStorage = (userId: string, state: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`notification_state_${userId}`, JSON.stringify(state));
};


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [personalizationSettings, setPersonalizationSettings] = useState<PersonalizationSettings | null>(null);
  const [workspaceSettings, setWorkspaceSettings] = useState<PersonalizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [lastSubscriptionRequest, setLastSubscriptionRequest] = useState<SubscriptionRequest | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isPinLocked, setIsPinLocked] = useState(false);
  const [isPinVerifiedInSession, setIsPinVerifiedInSession] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);


  // Securely define the super admin email here.
  const isSuperAdmin = !!(currentUser && currentUser.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL);
  const isAdmin = !!(currentUser && currentUser.role === 'admin' && !currentUser.isDeleted);


  const getCurrencySymbol = useCallback((code?: string) => {
    const currencyCode = code || businessProfile?.currency || 'FCFA';
    return currencySymbols[currencyCode.toUpperCase()] || currencyCode;
  }, [businessProfile]);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    if (currentUser?.pin === pin) {
      setIsPinLocked(false);
      setIsPinVerifiedInSession(true);
      return true;
    }
    if (businessId && currentUser && activeWorkspaceId) {
      await logActivity(businessId, activeWorkspaceId, currentUser.uid, 'Tentative de connexion par PIN échouée', {});
    }
    return false;
  }, [currentUser, businessId, activeWorkspaceId]);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    const newNotification: AppNotification = {
      ...notification,
      id: new Date().toISOString() + Math.random(),
      read: false,
      createdAt: Date.now(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: 'all' | string) => {
    const notificationState = getNotificationStateFromStorage(currentUser?.uid || null);
    const newNotifications = notifications.map(n => {
      const shouldMark = id === 'all' || n.id === id;
      if (shouldMark) {
        notificationState[n.id] = { read: true };
        return { ...n, read: true };
      }
      return n;
    });
    setNotifications(newNotifications);
    if (currentUser) {
      setNotificationStateToStorage(currentUser.uid, notificationState);
    }
  }, [notifications, currentUser]);

  const clearNotifications = useCallback(() => {
    const notificationState = getNotificationStateFromStorage(currentUser?.uid || null);
    notifications.forEach(n => {
      notificationState[n.id] = { read: true, cleared: true };
    });
    setNotifications([]);
    if (currentUser) {
      setNotificationStateToStorage(currentUser.uid, notificationState);
    }
  }, [notifications, currentUser]);

  const addPendingReceipt = useCallback((receipt: Omit<PendingReceipt, 'id' | 'timestamp'>) => {
    const newReceipt: PendingReceipt = {
      ...receipt,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    setPendingReceipts(prev => [...prev, newReceipt]);
  }, []);

  const clearPendingReceipts = useCallback(() => {
    setPendingReceipts([]);
  }, []);


  const fetchAndSetNotifications = useCallback(async (profile: BusinessProfile | null, user: AppUser | null) => {
    if (!user || !user.createdAt) return;

    try {
      const allRemoteNotifications = await getAppNotifications();
      const userPlan = profile?.subscriptionType || 'gratuit';
      const notificationState = getNotificationStateFromStorage(user.uid);

      const filteredNotifications = allRemoteNotifications.filter(n => {
        if (notificationState[n.id]?.cleared) {
          return false;
        }
        // Handle targeted notifications
        if ('targetUid' in n && (n as any).targetUid) {
          return (n as any).targetUid === user.uid;
        }
        if (n.createdAt < user.createdAt!) {
          return false;
        }
        if (n.target === 'all') return true;
        if (n.target === 'subscribed' && userPlan !== 'gratuit') return true;
        return n.target === userPlan;
      });

      const finalNotifications = filteredNotifications.map(n => ({
        ...n,
        read: notificationState[n.id]?.read || false
      }));

      setNotifications(prevLocalNotifications => {
        const remoteNotificationIds = new Set(finalNotifications.map(n => n.id));
        const uniqueLocalNotifications = prevLocalNotifications.filter(n => !remoteNotificationIds.has(n.id));
        return [...finalNotifications, ...uniqueLocalNotifications].sort((a, b) => b.createdAt - a.createdAt);
      });

    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  const setupNotifications = useCallback(async (uid: string) => {
    if (typeof window === 'undefined' || !messaging || !uid) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Get FCM token
        // Note: You normally need a VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
        });

        if (token) {
          console.log('FCM Token generated:', token);
          await saveUserPushToken(uid, token);
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }

        // Listen for foreground messages
        onMessage(messaging, (payload) => {
          console.log('Foreground message received:', payload);
          if (payload.notification) {
            toast({
              title: payload.notification.title,
              description: payload.notification.body,
            });

            // Also add to internal notification list
            addNotification({
              title: payload.notification.title || 'Notification',
              description: payload.notification.body || '',
              target: 'all'
            });
          }
        });
      }
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  }, [addNotification, toast]);

  const calculateUsageAndLimits = useCallback(async (businessId: string, profile: BusinessProfile) => {
    try {
      const [users, storageBytes] = await Promise.all([
        getUsers(businessId),
        getBusinessDataUsage(businessId)
      ]);

      const employeeCount = users.filter(u => u.role === 'employee').length;

      // TODO: Implement actual AI and bandwidth usage tracking
      // For now, bandwidth is a simulation based on storage usage
      const bandwidthUsed = storageBytes * 1.5; // Simulate bandwidth as 1.5x storage
      const aiQuestionsUsed = 0; // TODO: Implement daily tracking
      const aiImagesUsed = 0; // TODO: Implement daily tracking

      setUsageStats({
        employeeCount,
        storageUsed: storageBytes,
        bandwidthUsed,
        aiQuestionsUsed,
        aiImagesUsed,
      });

      const planKey = profile.subscriptionType || 'gratuit';
      const details = planDefinitions[planKey] || planDefinitions.gratuit;

      setPlanDetails({
        ...details,
        expiresAt: profile.subscriptionExpiresAt || null,
      });

      // Set subscription status
      const isActive = !!(profile.subscriptionExpiresAt && profile.subscriptionExpiresAt > Date.now());
      setIsSubscriptionActive(isActive);

    } catch (error) {
      console.error("Failed to calculate usage stats:", error);
      // Set to default/error state
      setUsageStats({ employeeCount: 0, storageUsed: 0, bandwidthUsed: 0, aiQuestionsUsed: 0, aiImagesUsed: 0 });
      setPlanDetails({ ...planDefinitions.gratuit, expiresAt: null });
      setIsSubscriptionActive(false);
    }
  }, []);


  const loadUserData = useCallback(async (firebaseUser: FirebaseAuthUser | null) => {
    if (!firebaseUser) {
      if (currentUser !== null) setCurrentUser(null);
      if (businessId !== null) setBusinessId(null);
      if (activeWorkspaceId !== null) setActiveWorkspaceId(null);
      if (businessProfile !== null) setBusinessProfile(null);
      if (personalizationSettings !== null) setPersonalizationSettings(null);
      if (workspaceSettings !== null) setWorkspaceSettings(null);
      setUsageStats(null);
      setPlanDetails(null);
      setIsPinVerifiedInSession(false);
      setNotifications([]);
      setLastSubscriptionRequest(null);
      setLoading(false);
      return;
    }

    try {
      const userProfile = await fetchUserByUid(firebaseUser.uid);

      if (!userProfile) {
        const newUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser!.email!,
          emailVerified: firebaseUser!.emailVerified,
          displayName: firebaseUser!.displayName || 'Nouveau membre',
          role: 'admin',
          businessId: '',
          assignedWorkspaceId: '',
        };
        // Simple check for primitive/small object stability could be added but this case is rare (new user)
        setCurrentUser(newUser);

        setBusinessId(null);
        setBusinessProfile(null);
        setActiveWorkspaceId(null);
        setPersonalizationSettings(null);
        setWorkspaceSettings(null);
        setIsSubscriptionActive(false);
        setLastSubscriptionRequest(null);

      } else if (userProfile.isDeleted) {
        await signOut(auth);
      } else {
        const appUserWithVerification = { ...userProfile, emailVerified: firebaseUser.emailVerified };

        // Deep equal check for currentUser
        if (JSON.stringify(appUserWithVerification) !== JSON.stringify(currentUser)) {
          setCurrentUser(appUserWithVerification);
        }

        if (userProfile.pin && !isPinVerifiedInSession) {
          setIsPinLocked(true);
        }

        if (userProfile.businessId) {
          if (businessId !== userProfile.businessId) setBusinessId(userProfile.businessId);

          const currentActiveWorkspaceId = userProfile.assignedWorkspaceId || userProfile.businessId;
          if (activeWorkspaceId !== currentActiveWorkspaceId) setActiveWorkspaceId(currentActiveWorkspaceId);

          // Setup notifications
          setupNotifications(userProfile.uid);

          const [fetchedBusinessProfile, fetchedGlobalSettings, fetchedWorkspaceSettings, lastRequest] = await Promise.all([
            getBusinessProfile(userProfile.businessId),
            getPersonalizationSettings(userProfile.businessId),
            getWorkspaceSettings(userProfile.businessId, currentActiveWorkspaceId),
            getLastSubscriptionRequest(userProfile.uid)
          ]);

          // Deep equal checks
          if (JSON.stringify(fetchedBusinessProfile) !== JSON.stringify(businessProfile)) {
            setBusinessProfile(fetchedBusinessProfile);
          }
          if (JSON.stringify(fetchedGlobalSettings) !== JSON.stringify(personalizationSettings)) {
            setPersonalizationSettings(fetchedGlobalSettings);
          }
          if (JSON.stringify(fetchedWorkspaceSettings) !== JSON.stringify(workspaceSettings)) {
            setWorkspaceSettings(fetchedWorkspaceSettings);
          }

          setLastSubscriptionRequest(lastRequest);
          await fetchAndSetNotifications(fetchedBusinessProfile, userProfile);

          if (fetchedBusinessProfile) {
            await calculateUsageAndLimits(userProfile.businessId, fetchedBusinessProfile);
            // The business is now verified by default in this new flow
            setIsSubscriptionActive(true);
          } else {
            setIsSubscriptionActive(false);
          }
        } else {
          setBusinessId(null);
          setBusinessProfile(null);
          setActiveWorkspaceId(null);
          setPersonalizationSettings(null);
          setWorkspaceSettings(null);
          setIsSubscriptionActive(false);
          setLastSubscriptionRequest(null);
          await fetchAndSetNotifications(null, userProfile);
        }
      }

    } catch (error) {
      console.error("Error loading user data, logging out:", error);
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  }, [currentUser, businessProfile, personalizationSettings, workspaceSettings, businessId, activeWorkspaceId, isPinVerifiedInSession, fetchAndSetNotifications, calculateUsageAndLimits]);

  const refreshAuthContext = useCallback(async () => {
    setLoading(true);
    await loadUserData(auth.currentUser);
  }, [loadUserData]);


  // Use a ref to access the latest loadUserData without re-triggering the effect
  const loadUserDataRef = React.useRef(loadUserData);
  useEffect(() => {
    loadUserDataRef.current = loadUserData;
  }, [loadUserData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[Auth] Auth state changed:", user ? user.uid : 'null', user?.emailVerified);
      setLoading(true);
      // Call the latest loadUserData function
      if (loadUserDataRef.current) {
        await loadUserDataRef.current(user);
      }
    });
    return () => unsubscribe();
  }, []); // Run only once on mount

  const publicPages = ['/login', '/register', '/features'];
  const setupPage = '/setup';
  const invitePage = '/invite';
  const verificationPage = '/verify-email';
  const numberValidationPage = '/admin/number-validation';
  const subscriptionPage = '/admin/standard-subscription';
  const paymentPages = ['/admin/activate-plan', '/admin/payment-instructions'];

  useEffect(() => {
    if (loading) return;

    const isPublicPage = publicPages.some(p => pathname.startsWith(p));
    const isInvitePage = pathname.startsWith(invitePage);
    const isVerificationPage = pathname === verificationPage;
    const isSetupPage = pathname === setupPage;
    const isNumberValidationPage = pathname === numberValidationPage;
    const isSubscriptionPage = pathname === subscriptionPage;
    const isWelcomePage = pathname === '/welcome';
    const isPaymentPage = paymentPages.some(p => pathname.startsWith(p));

    // Allow access to error page and pending verification page
    if (pathname === '/error' || pathname === '/pending-verification') return;

    if (!currentUser) {
      if (!isPublicPage && !isInvitePage) router.replace('/login');
      return;
    }

    // --- ENREGISTREMENT FLOW STEPS ---

    // 1. Business profile setup check (Step 2)
    // We check both the state and the currentUser object for robustness
    if (currentUser.role === 'admin' && (!businessId || !businessProfile)) {
      if (!isSetupPage) {
        router.replace(setupPage);
      }
      return;
    }

    // 2. Email verification check (Step 3) - Only if business is set up
    if (!currentUser.emailVerified) {
      if (!isVerificationPage) {
        router.replace(verificationPage);
      }
      return;
    }

    // 3. Business phone number check (Step 4) (only for admins)
    // We check both the business profile AND the user's own document
    const userHasPhone = !!currentUser?.phoneNumber;
    const businessHasPhone = !!businessProfile?.businessPhoneNumber;

    if (currentUser.role === 'admin' && !userHasPhone && !businessHasPhone) {
      if (!isNumberValidationPage) {
        router.replace(numberValidationPage);
      }
      return;
    }

    // 4. Onboarding/Welcome check (Step 5)
    if (currentUser.role === 'admin' && !currentUser.onboardingCompleted) {
      if (!isWelcomePage) {
        router.replace('/welcome');
      }
      return;
    }

    // 5. Subscription plan check (Wait until everything else is done)
    if (currentUser.role === 'admin' && !businessProfile?.subscriptionType) {
      if (!isSubscriptionPage && !isPaymentPage) {
        router.replace(subscriptionPage);
      }
      return;
    }

    // If all checks pass, redirect from setup/verification pages to overview
    if (isPublicPage || isVerificationPage || isSetupPage || isNumberValidationPage || isWelcomePage) {
      router.replace('/overview');
    }

  }, [currentUser, businessId, businessProfile, loading, pathname, router]);


  const refreshCurrentUser = useCallback(async () => {
    if (auth.currentUser) {
      const userProfile = await fetchUserByUid(auth.currentUser.uid);
      if (userProfile && !userProfile.isDeleted) {
        const appUserWithVerification = { ...userProfile, emailVerified: auth.currentUser.emailVerified };
        setCurrentUser(appUserWithVerification);
      }
    }
  }, []);


  const login = async (email: string, password?: string): Promise<FirebaseAuthUser> => {
    await setPersistence(auth, browserLocalPersistence);
    const finalPassword = password || `secure_temp_pass_${Date.now()}`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, finalPassword);
      await loadUserData(userCredential.user);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  const loginWithPhoneNumberAndPassword = async (phoneNumber: string, password: string): Promise<void> => {
    const usersQuery = query(ref(database, 'users'), orderByChild('phoneNumber'), equalTo(phoneNumber));
    const snapshot = await get(usersQuery);
    if (!snapshot.exists()) {
      throw new Error("Aucun compte n'est associé à ce numéro de téléphone.");
    }
    const userData = snapshot.val();
    const userId = Object.keys(userData)[0];
    const userProfile: AppUser = userData[userId];

    if (userProfile.isDeleted) {
      throw new Error("Ce compte a été désactivé.");
    }

    try {
      await login(userProfile.email, password);
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error("Mot de passe incorrect.");
      }
      throw error;
    }
  };

  const changeUserPassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error("Utilisateur non trouvé ou non authentifié.");
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      if (businessId && activeWorkspaceId) {
        await logActivity(businessId, activeWorkspaceId, user.uid, 'Modification du mot de passe', {});
      }
    } catch (error: any) {
      console.error("Password change error:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error("Le mot de passe actuel est incorrect.");
      }
      throw new Error("Une erreur est survenue lors de la modification du mot de passe.");
    }
  };

  const sendVerificationEmail = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Utilisateur non authentifié.");
    }
    try {
      await sendEmailVerification(user);
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      throw new Error("Impossible d'envoyer l'e-mail de vérification. Veuillez réessayer plus tard.");
    }
  };


  const signupAndCreateWorkspace = async (data: SignUpData): Promise<void> => {
    if (!data.password) throw new Error("Le mot de passe est requis.");

    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const firebaseUser = userCredential.user;

    await updateProfile(firebaseUser, { displayName: data.userName });
    await sendEmailVerification(firebaseUser);

    // Create the user profile in RTDB immediately after auth creation
    await createUserProfile(firebaseUser.uid, {
      email: firebaseUser.email!,
      displayName: data.userName,
    });
    // The onAuthStateChanged listener will automatically handle the user state and redirection.
  };

  const switchWorkspace = async (newWorkspaceId: string) => {
    if (!currentUser || !businessId || !currentUser.workspaces || !currentUser.workspaces[newWorkspaceId]) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Accès non autorisé à cet espace de travail.' });
      return;
    }
    if (newWorkspaceId === activeWorkspaceId) {
      toast({ title: 'Info', description: 'Vous êtes déjà dans cet espace de travail.' });
      return;
    }

    const userRef = ref(database, `users/${currentUser.uid}`);
    await update(userRef, {
      assignedWorkspaceId: newWorkspaceId,
      role: currentUser.workspaces[newWorkspaceId] // Set the role for the new workspace
    });

    // Refresh context instead of full page reload for a smoother experience
    await refreshAuthContext();
    toast({ title: "Changement d'espace de travail", description: `Vous êtes maintenant dans l'espace ${businessProfile?.workspaces?.[newWorkspaceId]?.name}.` });
  };


  const logout = async () => {
    if (businessId) {
      await syncService.setOffline(businessId);
    }
    await signOut(auth);
    setIsPinVerifiedInSession(false);
    window.location.href = '/login';
  };

  const isVerificationPage = pathname === '/verify-email';
  const showSplash = loading && !publicPages.some(p => pathname.startsWith(p)) && !pathname.startsWith('/invite') && !isVerificationPage;

  return (
    <AuthContext.Provider value={{ currentUser, businessId, businessProfile, personalizationSettings, workspaceSettings, loading, isAdmin, isSuperAdmin, isSubscriptionActive, login, loginWithPhoneNumberAndPassword, changeUserPassword, sendVerificationEmail, signupAndCreateWorkspace, logout, refreshCurrentUser, refreshAuthContext, switchWorkspace, activeWorkspaceId, usageStats, planDetails, isPinLocked, verifyPin, notifications, addNotification, getCurrencySymbol, markAsRead, clearNotifications, showLoader: () => { }, pendingReceipts, addPendingReceipt, clearPendingReceipts }}>
      {showSplash ? <WelcomeSplash /> : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé au sein d\'un AuthProvider');
  }
  return context;
}
