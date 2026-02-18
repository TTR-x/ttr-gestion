

import { database, firebaseConfig, storage } from './config';
import { set, get, push, update, remove, serverTimestamp, query, orderByChild, equalTo, ref as dbRef, runTransaction, limitToLast } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Reservation, Expense, ActivityLogEntry, User as AppUser, BusinessProfile, AppBackup, Client, Investment, PersonalizationSettings, QuickIncome, StockItem, Referral, PlanningItem, AppNotification, AiFeedback, Promotion, PlanName, Workspace, SubscriptionRequest, ServerFile, ReservationItem, ServiceType, NumberValidationRequest, AuthorizedApp } from '@/lib/types';
import { getAuth, createUserWithEmailAndPassword, updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import { uploadDataUriToCloudinary, uploadToCloudinary } from '../cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addMonths, addYears } from 'date-fns';
import { getEstimatedServerTime } from '../components/layout/time-sync-guard';

// Helper function to get user display info for logs from the DB
async function getActorDisplayInfo(actorUid: string): Promise<string> {
  if (actorUid.startsWith('api_')) {
    return 'API';
  }
  if (actorUid === 'system') {
    return 'Système';
  }
  const userProfile = await fetchUserByUid(actorUid);
  return userProfile?.displayName || userProfile?.email || actorUid;
}

// --- Activity Log ---
export async function logActivity(
  businessId: string,
  workspaceId: string,
  actorUid: string,
  action: string,
  details: Record<string, any>
): Promise<void> {
  try {
    const actorDisplayName = await getActorDisplayInfo(actorUid);
    const logEntry: Omit<ActivityLogEntry, 'id' | 'serverTimestamp' | 'deviceTimestamp'> = {
      actorUid,
      workspaceId,
      actorDisplayName,
      action,
      details,
    };
    const activityLogRef = dbRef(database, `businesses/${businessId}/activityLog`);
    const newLogRef = push(activityLogRef);
    await set(newLogRef, {
      ...logEntry,
      id: newLogRef.key,
      deviceTimestamp: Date.now(),
      serverTimestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

// --- AI Feedback ---
export async function logAiFeedback(
  businessId: string,
  actorUid: string,
  feedbackData: Omit<AiFeedback, 'id' | 'businessId' | 'actorUid' | 'timestamp'>
): Promise<void> {
  try {
    const feedbackRef = dbRef(database, `ai-feedback`);
    const newFeedbackRef = push(feedbackRef);
    const feedbackEntry: AiFeedback = {
      id: newFeedbackRef.key!,
      businessId,
      actorUid,
      ...feedbackData,
      timestamp: serverTimestamp() as any,
    };
    await set(newFeedbackRef, feedbackEntry);
  } catch (error: any) {
    console.warn("Error logging AI feedback:", error.message || error);
    // Throwing ensures the UI can handle it or ignore it, but we log the specific permission error for debugging
    throw error;
  }
}


// --- Business Profile Management ---
export async function getBusinessProfile(businessId: string): Promise<BusinessProfile | null> {
  try {
    const profileRef = dbRef(database, `businesses/${businessId}/profile`);
    const snapshot = await get(profileRef);
    return snapshot.exists() ? snapshot.val() as BusinessProfile : null;
  } catch (error) {
    console.error("Erreur lors de la récupération du profil d'entreprise:", error);
    throw error;
  }
}

/**
 * Fetches all business profiles. Super-admin only.
 * @returns A promise that resolves to an array of all business profiles.
 */
export async function getAllBusinessProfiles(): Promise<BusinessProfile[]> {
  try {
    const businessesRef = dbRef(database, 'businesses');
    const snapshot = await get(businessesRef);
    if (snapshot.exists()) {
      const businessesData = snapshot.val();
      // Extract only the profile from each business
      return Object.values(businessesData).map((business: any) => business.profile);
    }
    return [];
  } catch (error) {
    console.error("Error fetching all business profiles:", error);
    throw new Error("Impossible de récupérer tous les profils d'entreprise. Vérifiez les règles de sécurité.");
  }
}


export async function createNewWorkspace(
  actorUid: string,
  businessId: string,
  newWorkspaceData: { name: string; type: string }
): Promise<string> {
  const businessProfile = await getBusinessProfile(businessId);
  if (!businessProfile) {
    throw new Error("Profil de l'entreprise principale introuvable.");
  }

  const currentWorkspaceCount = Object.keys(businessProfile.workspaces || {}).length;
  const plan = businessProfile.subscriptionType || 'gratuit';

  const limits: Record<string, number | 'Illimité'> = {
    gratuit: 1,
    particulier: 2,
    entreprise: 15,
    élite: "Illimité"
  };
  const limit = limits[plan] || 1;

  if (typeof limit === 'number' && currentWorkspaceCount >= limit) {
    throw new Error(`Limite de ${limit} espace(s) de travail atteinte pour le forfait '${plan}'. Veuillez mettre à niveau.`);
  }

  const newWorkspaceRef = push(dbRef(database, `businesses/${businessId}/profile/workspaces`));
  const newWorkspaceId = newWorkspaceRef.key;
  if (!newWorkspaceId) {
    throw new Error("Impossible de générer un ID pour le nouvel espace de travail.");
  }

  const workspace: Workspace = {
    id: newWorkspaceId,
    name: newWorkspaceData.name,
    type: newWorkspaceData.type,
    isPrimary: false,
    createdAt: Date.now(),
  };

  await set(newWorkspaceRef, workspace);

  // Add access to the creator
  const userWorkspaceAccessRef = dbRef(database, `users/${actorUid}/workspaces/${newWorkspaceId}`);
  await set(userWorkspaceAccessRef, 'admin');

  await logActivity(businessId, newWorkspaceId, actorUid, `Création du sous-espace de travail: ${workspace.name}`, {});

  return newWorkspaceId;
}

export async function createOrUpdateBusinessProfile(
  data: Partial<Omit<BusinessProfile, 'ownerUid' | 'createdAt' | 'updatedAt'>>,
  ownerUid: string,
): Promise<{ businessId: string; promoApplied: boolean }> {
  let promoApplied = false;
  let referredByAmbassadorId: string | null = null;

  const userRef = dbRef(database, `users/${ownerUid}`);
  const userSnapshot = await get(userRef);
  if (!userSnapshot.exists()) {
    throw new Error("Opération non autorisée: Aucun profil utilisateur trouvé pour cet identifiant.");
  }

  const newBusinessId = push(dbRef(database, 'businesses')).key;
  if (!newBusinessId) throw new Error("Impossible de générer un ID pour la nouvelle entreprise.");

  if (data.appliedPromoCode) {
    const { verifyPromoCode, sanitizePromoCode } = await import('@/lib/services/promo-service');

    const cleanCode = sanitizePromoCode(data.appliedPromoCode);
    // Pass business name and user email for ABT webhook
    const userEmail = userSnapshot.exists() ? userSnapshot.val().email : undefined;
    const result = await verifyPromoCode(cleanCode, newBusinessId, 'inscrit', data.name, userEmail);

    if (!result.success) {
      console.error('Promo code validation failed:', result.error);
      throw new Error(result.error || "Code promo invalide ou expiré.");
    }

    if (!result.ambassadorId) {
      throw new Error("Réponse invalide du service de validation de code promo.");
    }

    referredByAmbassadorId = result.ambassadorId;
    promoApplied = true;
  }

  const newReferralCode = `TTR-${newBusinessId.slice(-6).toUpperCase()}`;
  const primaryWorkspace: Workspace = { id: newBusinessId, name: data.name!, type: data.type!, isPrimary: true, createdAt: Date.now() };

  const profileData: any = {
    name: data.name!,
    type: data.type!,
    country: data.country!,
    currency: data.currency || 'FCFA',
    ownerUid: ownerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isVerified: false,
    subscriptionType: 'gratuit',
    subscriptionExpiresAt: 0,
    referralCode: newReferralCode,
    referralBalance: 0,
    teamCode: newBusinessId.slice(0, 6).toUpperCase(),
    workspaces: { [newBusinessId]: primaryWorkspace },
  };

  if (data.appliedPromoCode) {
    profileData.appliedPromoCode = data.appliedPromoCode;
  }
  if (referredByAmbassadorId) {
    profileData.referredByAmbassadorId = referredByAmbassadorId;
  }

  await set(dbRef(database, `businesses/${newBusinessId}/profile`), profileData);
  await set(dbRef(database, `referralCodeIndex/${newReferralCode}`), newBusinessId);

  // Update the existing user's profile with the new business info
  await updateUserProfile(ownerUid, {
    businessId: newBusinessId,
    assignedWorkspaceId: newBusinessId,
    workspaces: { [newBusinessId]: 'admin' },
    role: 'admin',
    onboardingCompleted: false, // Default to false for new users
  }, ownerUid, newBusinessId);

  return { businessId: newBusinessId, promoApplied: promoApplied };
}


export async function updateBusinessProfile(
  businessId: string,
  data: Partial<Omit<BusinessProfile, 'ownerUid' | 'createdAt'>>,
  actorUid: string,
): Promise<void> {
  try {
    const profileRef = dbRef(database, `businesses/${businessId}/profile`);
    const updates = { ...data, updatedAt: serverTimestamp() };
    await update(profileRef, updates);
    await logActivity(businessId, businessId, actorUid, `Mise à jour du profil d'entreprise`, { updates: data });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil d'entreprise:", error);
    throw error;
  }
}

export async function deleteBusinessLogo(businessId: string, actorUid: string): Promise<void> {
  try {
    const logoUrlRef = dbRef(database, `businesses/${businessId}/profile/logoUrl`);
    const snapshot = await get(logoUrlRef);

    if (snapshot.exists()) {
      const logoUrl = snapshot.val();
      await logActivity(businessId, businessId, actorUid, `Suppression du logo de l'entreprise`, {
        orphanedFileUrl: logoUrl,
        action: "A user requested logo deletion. The file URL is logged for server-side cleanup.",
      });
      await remove(logoUrlRef);
      console.warn("Client-side deletion only removes the DB reference. The file at", logoUrl, "is now orphaned on Cloudinary and requires server-side cleanup.");
    }
  } catch (error) {
    console.error("Error deleting business logo reference:", error);
    throw new Error("Impossible de supprimer la référence du logo.");
  }
}

export async function saveUserPushToken(uid: string, token: string): Promise<void> {
  try {
    // We use a simplified device identifier (e.g., hash of the token or just a generic key)
    // To support multiple devices, we store them in a list or as keys.
    const tokenHash = btoa(token).slice(-20).replace(/[/+=]/g, '');
    const tokenRef = dbRef(database, `users/${uid}/pushTokens/${tokenHash}`);
    await set(tokenRef, {
      token,
      updatedAt: serverTimestamp(),
      platform: 'web'
    });
  } catch (error) {
    console.error("Error saving push token:", error);
  }
}

// --- App Notifications ---
export async function sendAppNotification(notificationData: {
  title: string;
  description: string;
  target: 'all' | 'subscribed' | 'gratuit' | 'particulier' | 'petite_entreprise' | 'grande_entreprise' | 'essentiel' | 'croissance' | 'pro' | 'avancé' | 'premium' | 'élite';
  href?: string;
}): Promise<void> {
  try {
    const notificationsRef = dbRef(database, 'app-notifications');
    const newNotificationRef = push(notificationsRef);
    const newNotification = {
      ...notificationData,
      id: newNotificationRef.key,
      createdAt: serverTimestamp(),
    };
    await set(newNotificationRef, newNotification);
  } catch (error) {
    console.error("Error sending app notification:", error);
    throw new Error("Could not send the notification.");
  }
}

export async function sendTargetedNotificationToUser(
  targetUid: string,
  notificationData: {
    title: string;
    description: string;
    href?: string;
  },
  actorUid: string
): Promise<void> {
  try {
    const userRef = dbRef(database, `users/${targetUid}`);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) {
      throw new Error("Utilisateur cible introuvable.");
    }
    const user = userSnapshot.val() as AppUser;

    // We still use the global app-notifications but add a targetUid field.
    // The client-side logic will have to filter this.
    // This is a simplification. A better approach would be a user-specific notifications path.
    const notificationsRef = dbRef(database, 'app-notifications');
    const newNotificationRef = push(notificationsRef);
    const newNotification = {
      ...notificationData,
      id: newNotificationRef.key,
      targetUid: targetUid, // Specific user target
      target: `user_${targetUid}`, // A unique target name
      createdAt: serverTimestamp(),
    };
    await set(newNotificationRef, newNotification);

    await logActivity(user.businessId, user.assignedWorkspaceId, actorUid, `Envoi d'une notification ciblée`, { targetUser: user.displayName });
  } catch (error) {
    console.error("Error sending targeted notification:", error);
    throw new Error("Could not send the targeted notification.");
  }
}


export async function getAppNotifications(): Promise<AppNotification[]> {
  try {
    const notificationsQuery = query(dbRef(database, 'app-notifications'), orderByChild('createdAt'));
    const snapshot = await get(notificationsQuery);
    if (snapshot.exists()) {
      const notificationsObject = snapshot.val() as Record<string, AppNotification>;
      const allNotifications = Object.keys(notificationsObject)
        .map(key => ({ ...notificationsObject[key], id: key, read: false }))
        .sort((a, b) => b.createdAt - a.createdAt); // Sort newest first
      return allNotifications;
    }
    return [];
  } catch (error) {
    console.error("Error fetching app notifications:", error);
    throw error;
  }
}


// --- Subscription Management ---
export async function addSubscriptionRequest(data: Omit<SubscriptionRequest, 'id' | 'status' | 'createdAt' | 'processedAt'>): Promise<void> {
  try {
    const profile = await getBusinessProfile(data.businessId);
    const requestsRef = dbRef(database, 'subscriptionRequests');
    const newRequestRef = push(requestsRef);
    const requestData: Partial<SubscriptionRequest> = {
      ...data,
      id: newRequestRef.key!,
      status: 'pending',
      createdAt: serverTimestamp() as any,
    };

    if (profile?.appliedPromoCode) {
      requestData.appliedPromoCode = profile.appliedPromoCode;
    }

    await set(newRequestRef, requestData);
    await logActivity(data.businessId, data.businessId, data.userId, "Soumission d'une preuve de paiement", { plan: data.plan, amount: data.amount });
  } catch (error) {
    console.error("Error adding subscription request:", error);
    throw error;
  }
}

export async function getSubscriptionRequests(status?: 'pending' | 'approved' | 'rejected'): Promise<SubscriptionRequest[]> {
  try {
    let requestsQuery;
    if (status) {
      requestsQuery = query(dbRef(database, 'subscriptionRequests'), orderByChild('status'), equalTo(status));
    } else {
      requestsQuery = query(dbRef(database, 'subscriptionRequests'), orderByChild('createdAt'));
    }

    const snapshot = await get(requestsQuery);
    if (snapshot.exists()) {
      const requestsObject = snapshot.val();
      return Object.values(requestsObject).sort((a: any, b: any) => b.createdAt - a.createdAt) as SubscriptionRequest[];
    }
    return [];
  } catch (error) {
    console.error("Error fetching subscription requests:", error);
    throw error;
  }
}

export async function getSubscriptionRequestsByUser(userId: string): Promise<SubscriptionRequest[]> {
  try {
    const requestsQuery = query(dbRef(database, 'subscriptionRequests'), orderByChild('userId'), equalTo(userId));
    const snapshot = await get(requestsQuery);
    if (snapshot.exists()) {
      const requestsObject = snapshot.val();
      return Object.values(requestsObject).sort((a: any, b: any) => b.createdAt - a.createdAt) as SubscriptionRequest[];
    }
    return [];
  } catch (error) {
    console.error(`Error fetching subscription requests for user ${userId}:`, error);
    throw error;
  }
}


export async function getLastSubscriptionRequest(userId: string): Promise<SubscriptionRequest | null> {
  try {
    const requestsQuery = query(dbRef(database, 'subscriptionRequests'), orderByChild('userId'), equalTo(userId));
    const snapshot = await get(requestsQuery);
    if (snapshot.exists()) {
      const requestsObject = snapshot.val();
      const allRequests = Object.values(requestsObject) as SubscriptionRequest[];
      return allRequests.sort((a, b) => b.createdAt - a.createdAt)[0] || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching last subscription request:", error);
    throw error;
  }
}


export async function processSubscriptionRequest(requestId: string, businessId: string, action: 'approve' | 'reject'): Promise<void> {
  const requestRef = dbRef(database, `subscriptionRequests/${requestId}`);
  const requestSnap = await get(requestRef);
  if (!requestSnap.exists()) {
    throw new Error("Demande d'abonnement introuvable.");
  }
  const requestData = requestSnap.val() as SubscriptionRequest;

  if (action === 'reject') {
    await update(requestRef, { status: 'rejected', processedAt: serverTimestamp() });
    return;
  }

  const currentProfile = await getBusinessProfile(businessId);
  if (!currentProfile) throw new Error("Profil d'entreprise introuvable.");

  // --- Main Subscription Logic ---
  const now = Date.now();
  const startDate = (currentProfile?.subscriptionExpiresAt && currentProfile.subscriptionExpiresAt > now)
    ? new Date(currentProfile.subscriptionExpiresAt)
    : new Date(now);

  // Using addMonths for accurate date calculation
  let expirationDate = addMonths(startDate, requestData.durationMonths || 0);

  const promoCode = currentProfile.appliedPromoCode;

  if (promoCode && currentProfile.referredByAmbassadorId) {
    // Add 1 full year for the promo
    expirationDate = addMonths(expirationDate, 12);
  }

  const profileUpdates: Partial<BusinessProfile> = {
    subscriptionType: requestData.plan.toLowerCase().replace(' ', '_') as PlanName,
    subscriptionExpiresAt: expirationDate.getTime(),
    isVerified: true,
  };

  await updateBusinessProfile(businessId, profileUpdates, requestData.userId);
  await update(requestRef, { status: 'approved', processedAt: serverTimestamp() });

  // --- Notify ABT app about the successful payment if it's an ambassador code ---
  if (promoCode) {
    try {
      const { notifyAbtActivation } = await import('@/lib/services/promo-service');

      const result = await notifyAbtActivation(
        currentProfile.appliedPromoCode!,
        businessId,
        requestData.amount,
        requestData.businessName || currentProfile.name, // Use request business name or profile name
        requestData.userEmail || undefined
      );

      if (!result.success) {
        console.warn("Failed to notify ABT app:", result.error);
        // Non-critical error, do not block the main flow.
      } else {
        console.log("ABT app notified successfully about subscription activation");
      }
    } catch (notifyError) {
      console.error("Failed to notify ABT app about subscription activation:", notifyError);
      // Non-critical error, do not block the main flow.
    }
  }
}

// --- Manual Subscription Grant (Super-Admin) ---
export async function grantSubscription(
  businessId: string,
  monthsToAdd: number,
  daysToAdd: number,
  actorUid: string,
  planName?: PlanName,
): Promise<void> {
  const currentProfile = await getBusinessProfile(businessId);
  if (!currentProfile) throw new Error("Profil d'entreprise introuvable.");

  const now = Date.now();
  const startDate = (currentProfile.subscriptionExpiresAt && currentProfile.subscriptionExpiresAt > now)
    ? new Date(currentProfile.subscriptionExpiresAt)
    : new Date(now);

  let newExpirationDate = startDate;
  if (monthsToAdd > 0) {
    newExpirationDate = addMonths(newExpirationDate, monthsToAdd);
  }
  if (daysToAdd > 0) {
    newExpirationDate = addDays(newExpirationDate, daysToAdd);
  }

  const profileUpdates: Partial<BusinessProfile> = {
    subscriptionExpiresAt: newExpirationDate.getTime(),
    isVerified: true,
  };

  if (planName) {
    profileUpdates.subscriptionType = planName;
  } else if (!currentProfile.subscriptionType || currentProfile.subscriptionType === 'gratuit') {
    profileUpdates.subscriptionType = 'pro'; // Default to 'pro' if no plan exists
  }

  await updateBusinessProfile(businessId, profileUpdates, actorUid);
  await logActivity(businessId, businessId, actorUid, `Octroi manuel d'abonnement`, {
    monthsAdded: monthsToAdd,
    daysAdded: daysToAdd,
    newExpiry: newExpirationDate.toISOString(),
    newPlan: planName || 'Unchanged'
  });
}

// --- Number Validation Request Management ---
export async function createNumberValidationRequest(
  userId: string,
  businessId: string,
  businessName: string,
  phoneNumber: string
): Promise<void> {
  const requestsRef = dbRef(database, `trialRequests`);
  const newRequestRef = push(requestsRef); // Create a unique ID for each request
  const newRequest: NumberValidationRequest = {
    id: newRequestRef.key!,
    userId,
    businessId,
    businessName,
    phoneNumber,
    status: 'pending',
    createdAt: serverTimestamp() as any,
  };
  await set(newRequestRef, newRequest);
}


export async function getNumberValidationRequests(status: 'pending' | 'approved' | 'rejected'): Promise<NumberValidationRequest[]> {
  const requestsQuery = query(dbRef(database, 'trialRequests'), orderByChild('status'), equalTo(status));
  const snapshot = await get(requestsQuery);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(key => ({ ...data[key], id: key }));
  }
  return [];
}

export async function processNumberValidationRequest(requestId: string, businessId: string, action: 'approve' | 'reject'): Promise<void> {
  const requestRef = dbRef(database, `trialRequests/${requestId}`);
  const updates = {
    status: action === 'approve' ? 'approved' : 'rejected',
    processedAt: serverTimestamp(),
  };
  await update(requestRef, updates);
  await updateBusinessProfile(businessId, { businessPhoneNumberStatus: action === 'approve' ? 'approved' : 'rejected' }, 'superadmin');
}


// --- Personalization Settings ---
export async function getPersonalizationSettings(businessId: string): Promise<PersonalizationSettings | null> {
  try {
    const path = `businesses/${businessId}/personalization`;
    const settingsRef = dbRef(database, path);
    const snapshot = await get(settingsRef);
    return snapshot.exists() ? snapshot.val() as PersonalizationSettings : null;
  } catch (error) {
    console.error("Erreur lors de la récupération des paramètres de personnalisation:", error);
    throw error;
  }
}

export async function updatePersonalizationSettings(
  businessId: string,
  data: PersonalizationSettings,
  actorUid: string
): Promise<void> {
  try {
    const path = `businesses/${businessId}/personalization`;
    const settingsRef = dbRef(database, path);

    await set(settingsRef, data);
    await logActivity(businessId, businessId, actorUid, `Mise à jour de la personnalisation`, { updatedKeys: Object.keys(data) });
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de la personnalisation pour l'entreprise ${businessId}:`, error);
    throw error;
  }
}

// --- Workspace-specific Personalization ---
export async function getWorkspaceSettings(businessId: string, workspaceId: string): Promise<PersonalizationSettings | null> {
  const path = `businesses/${businessId}/workspaceSettings/${workspaceId}`;
  const settingsRef = dbRef(database, path);
  const snapshot = await get(settingsRef);
  return snapshot.exists() ? snapshot.val() as PersonalizationSettings : null;
}

export async function updateWorkspaceSettings(businessId: string, workspaceId: string, data: PersonalizationSettings, actorUid: string): Promise<void> {
  const path = `businesses/${businessId}/workspaceSettings/${workspaceId}`;
  const settingsRef = dbRef(database, path);
  await set(settingsRef, data);
  await logActivity(businessId, workspaceId, actorUid, `Mise à jour des paramètres de l'espace de travail`, { updatedKeys: Object.keys(data) });
}

export async function linkServiceTypesToWorkspaces(businessId: string, targetWorkspaceIds: string[], servicesToLink: ServiceType[], actorUid: string): Promise<void> {
  if (!servicesToLink || servicesToLink.length === 0) return;

  for (const workspaceId of targetWorkspaceIds) {
    const path = `businesses/${businessId}/workspaceSettings/${workspaceId}`;
    const settingsRef = dbRef(database, path);

    try {
      await runTransaction(settingsRef, (currentSettings: PersonalizationSettings | null) => {
        if (!currentSettings) {
          currentSettings = { serviceTypes: [] };
        }
        const existingServiceNames = new Set((currentSettings.serviceTypes || []).map(st => st.name.toLowerCase()));

        servicesToLink.forEach(service => {
          if (!existingServiceNames.has(service.name.toLowerCase())) {
            currentSettings!.serviceTypes!.push({ ...service, id: uuidv4() });
          }
        });

        return currentSettings;
      });
      await logActivity(businessId, workspaceId, actorUid, `Liaison de services`, { count: servicesToLink.length, targetWorkspace: workspaceId });
    } catch (error) {
      console.error(`Failed to link services to workspace ${workspaceId}`, error);
      throw new Error(`Impossible de lier les services à l'espace de travail ${workspaceId}.`);
    }
  }
}


// --- User Profile Management in Realtime DB ---
export async function fetchUserByUid(uid: string): Promise<AppUser | null> {
  try {
    const userRef = dbRef(database, `users/${uid}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? { ...snapshot.val(), uid } as AppUser : null;
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'utilisateur par UID ${uid}:`, error);
    return null;
  }
}

export async function getUsers(businessId: string, adminUid?: string): Promise<AppUser[]> {
  try {
    const usersInBusinessQuery = query(
      dbRef(database, 'users'),
      orderByChild('businessId'),
      equalTo(businessId)
    );
    const snapshot = await get(usersInBusinessQuery);
    if (snapshot.exists()) {
      const usersObject = snapshot.val() as Record<string, AppUser>;
      let usersList = Object.values(usersObject).filter(user => !user.isDeleted);

      // If adminUid is provided, filter by employees invited by that admin
      if (adminUid) {
        usersList = usersList.filter(user => user.role === 'admin' || user.invitedBy === adminUid);
      }
      return usersList;
    }
    return [];
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    throw error;
  }
}

export async function createUserProfile(
  uid: string,
  data: Partial<Omit<AppUser, 'uid'>>
): Promise<AppUser> {
  const userRef = dbRef(database, `users/${uid}`);

  // Check if a profile already exists to prevent overwriting
  const existingSnapshot = await get(userRef);
  if (existingSnapshot.exists()) {
    console.warn(`User profile for UID ${uid} already exists. Skipping creation.`);
    return existingSnapshot.val() as AppUser;
  }

  const newUserProfile: AppUser = {
    uid,
    email: data.email!,
    emailVerified: data.emailVerified || false,
    displayName: data.displayName!,
    role: data.role || 'admin',
    businessId: data.businessId || '',
    assignedWorkspaceId: data.assignedWorkspaceId || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDeleted: false,
    deletedAt: null,
  };
  await set(userRef, newUserProfile);

  const snapshot = await get(userRef);
  return snapshot.val() as AppUser;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<AppUser, 'uid' | 'createdAt' | 'updatedAt'>>,
  actorUid: string,
  businessId: string,
  workspaceId?: string
): Promise<void> {
  try {
    const userRef = dbRef(database, `users/${uid}`);
    const updates = { ...data, updatedAt: serverTimestamp() as any };
    await update(userRef, updates);

    const logDetails: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      const typedKey = key as keyof typeof data;
      if (data[typedKey] !== undefined) {
        logDetails[typedKey] = data[typedKey];
      }
    });

    if (Object.keys(logDetails).length > 0 && businessId) {
      await logActivity(businessId, workspaceId || businessId, actorUid, `Mise à jour du profil utilisateur (UID: ${uid})`, { updates: logDetails });
    }
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de l'utilisateur ${uid}:`, error);
    throw error;
  }
}

export async function softDeleteUser(
  uidToDelete: string,
  actorUid: string,
  businessId: string
): Promise<void> {
  const userRef = dbRef(database, `users/${uidToDelete}`);
  const userSnapshot = await get(userRef);
  if (!userSnapshot.exists()) {
    throw new Error("Utilisateur à supprimer introuvable.");
  }
  const user = userSnapshot.val() as AppUser;

  await update(userRef, {
    isDeleted: true,
    deletedAt: serverTimestamp(),
  });

  await logActivity(
    businessId,
    user.assignedWorkspaceId,
    actorUid,
    `Désactivation de l'utilisateur: ${user.displayName}`,
    { deactivatedUid: uidToDelete }
  );
}


// --- Employee Invitation Flow ---
interface InviteTokenPayload {
  businessId: string;
  workspaceId: string;
  actorUid: string;
  role: 'employee';
  employeePhoneNumber: string;
}

export async function generateInviteToken(payload: InviteTokenPayload): Promise<string> {
  const token = uuidv4();
  const tokenRef = dbRef(database, `invitations/${token}`);

  const businessProfile = await getBusinessProfile(payload.businessId);
  if (!businessProfile) {
    throw new Error("Profil d'entreprise introuvable.");
  }

  // Check Employee Limits
  const users = await getUsers(payload.businessId);
  const activeEmployeeCount = users.filter(u => u.role === 'employee' && !u.isDeleted).length;
  const plan = businessProfile.subscriptionType || 'gratuit';

  const employeeLimits: Record<string, number | 'Illimité'> = {
    gratuit: 0,
    particulier: 2,
    entreprise: 20,
    élite: 'Illimité'
  };
  const limit = employeeLimits[plan] ?? 0;

  if (limit !== 'Illimité' && activeEmployeeCount >= limit) {
    throw new Error(`Limite d'employés atteinte (${activeEmployeeCount}/${limit}) pour le forfait '${plan}'. Veuillez mettre à niveau.`);
  }

  await set(tokenRef, {
    businessId: payload.businessId,
    businessName: businessProfile.name,
    workspaceId: payload.workspaceId,
    role: payload.role,
    createdBy: payload.actorUid, // We store the inviter's UID
    employeePhoneNumber: payload.employeePhoneNumber,
    createdAt: serverTimestamp(),
  });

  return token;
}

export async function getInviteTokenData(token: string): Promise<{ employeePhoneNumber: string; businessName: string } | null> {
  const tokenRef = dbRef(database, `invitations/${token}`);
  const snapshot = await get(tokenRef);
  if (!snapshot.exists()) {
    return null;
  }
  const tokenData = snapshot.val();

  return {
    employeePhoneNumber: tokenData.employeePhoneNumber,
    businessName: tokenData.businessName
  };
}


interface ValidateInviteParams {
  token: string;
  userData: {
    uid: string;
    displayName: string;
    email: string;
  };
}

export async function validateInviteTokenAndCreateUser({ token, userData }: ValidateInviteParams): Promise<void> {
  const tokenRef = dbRef(database, `invitations/${token}`);
  const snapshot = await get(tokenRef);

  if (!snapshot.exists()) {
    throw new Error("Ce lien d'invitation est invalide.");
  }

  const tokenData = snapshot.val();
  const businessId = tokenData.businessId;
  const workspaceId = tokenData.workspaceId;

  if (!businessId || !workspaceId) {
    throw new Error("ID de l'entreprise ou de l'espace de travail manquant dans le jeton.");
  }

  const newUserProfile: AppUser = {
    uid: userData.uid,
    email: userData.email,
    emailVerified: false,
    displayName: userData.displayName,
    phoneNumber: tokenData.employeePhoneNumber,
    role: tokenData.role,
    businessId: tokenData.businessId,
    assignedWorkspaceId: tokenData.workspaceId,
    workspaces: {
      [tokenData.workspaceId]: tokenData.role
    },
    invitedBy: tokenData.createdBy, // Store the UID of the admin who invited this user
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const userRef = dbRef(database, `users/${userData.uid}`);
  await set(userRef, newUserProfile);

  await logActivity(tokenData.businessId, tokenData.workspaceId, userData.uid, "Inscription d'employé réussie via invitation", { createdBy: tokenData.createdBy });
}



// --- Specific functions for Reservation, Expense, etc. ---
export async function addReservation(
  businessId: string,
  data: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'isDeleted' | 'deletedAt'>,
  actorDisplayName: string,
  actorUid: string
) {
  const newItemKey = await addData<Reservation>('reservations', businessId, data, actorDisplayName, actorUid);

  const stockItemsToUpdate = (data.items || []).filter(item => item.type === 'stock');

  if (stockItemsToUpdate.length > 0) {
    try {
      for (const item of stockItemsToUpdate) {
        await adjustStockQuantity(businessId, item.id, -item.quantity, actorDisplayName, actorUid);
      }
    } catch (stockError) {
      // If stock adjustment fails, we should ideally roll back the reservation creation.
      console.error("Stock adjustment failed after creating reservation:", stockError);
      if (newItemKey) {
        await deleteData('reservations', businessId, newItemKey, 'system', true, data.workspaceId);
      }
      throw stockError; // Re-throw the error to notify the user
    }
  }
}

export const getReservations = (businessId: string, workspaceId: string) => getData<Reservation>('reservations', businessId, workspaceId);
export const getReservationById = (businessId: string, id: string) => getData<Reservation>('reservations', businessId, id, true);

export const updateReservation = async (
  businessId: string,
  id: string,
  data: Partial<Omit<Reservation, 'id' | 'createdAt' | 'createdBy'>>,
  actorDisplayName: string,
  actorUid: string
) => {
  try {
    const dataRef = dbRef(database, `businesses/${businessId}/reservations/${id}`);

    // --- Read-Modify-Write Pattern ---
    const existingDataSnapshot = await get(dataRef);
    if (!existingDataSnapshot.exists()) {
      throw new Error("L'élément à mettre à jour est introuvable.");
    }

    // Merge new data with existing data
    const mergedData = { ...existingDataSnapshot.val(), ...data };

    const updates = {
      ...mergedData,
      updatedBy: actorDisplayName,
      updatedAt: serverTimestamp(),
    };

    await set(dataRef, updates);

    await logActivity(
      businessId,
      mergedData.workspaceId,
      actorUid,
      `Mise à jour de la prestation ${id}`,
      { updates: Object.keys(data) }
    );
  } catch (error) {
    console.error(`Erreur lors de la mise à jour des données pour reservations/${id}:`, error);
    throw error;
  }
};

export const deleteReservation = (businessId: string, id: string, actorUid: string, isAdmin: boolean, workspaceId: string) => deleteData('reservations', businessId, id, actorUid, isAdmin, workspaceId);

export const addExpense = (businessId: string, data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'isDeleted' | 'deletedAt'>, actorDisplayName: string, actorUid: string) => addData<Expense>('expenses', businessId, data, actorDisplayName, actorUid);
export const getExpenses = (businessId: string, workspaceId: string) => getData<Expense>('expenses', businessId, workspaceId);
export const getExpenseById = (businessId: string, id: string) => getData<Expense>('expenses', businessId, id, true);
export const updateExpense = (businessId: string, id: string, data: Partial<Omit<Expense, 'id' | 'createdAt' | 'createdBy' | 'isDeleted' | 'deletedAt'>>, actorDisplayName: string, actorUid: string) => updateData<Expense>('expenses', businessId, id, data, actorDisplayName, actorUid);
export const deleteExpense = (businessId: string, id: string, actorUid: string, isAdmin: boolean, workspaceId: string) => deleteData('expenses', businessId, id, actorUid, isAdmin, workspaceId);

export const addQuickIncome = (businessId: string, data: Omit<QuickIncome, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'isDeleted' | 'deletedAt'>, actorDisplayName: string, actorUid: string) => addData<QuickIncome>('quickIncomes', businessId, data, actorDisplayName, actorUid);
export const getQuickIncomes = (businessId: string, workspaceId: string) => getData<QuickIncome>('quickIncomes', businessId, workspaceId);
export const getQuickIncomeById = (businessId: string, id: string) => getData<QuickIncome>('quickIncomes', businessId, id, true);
export const deleteQuickIncome = async (businessId: string, id: string, actorUid: string, isAdmin: boolean, workspaceId: string) => {
  await deleteData('quickIncomes', businessId, id, actorUid, isAdmin, workspaceId);
};

export const addClient = async (
  businessId: string,
  clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'isDeleted' | 'deletedAt'>,
  actorDisplayName: string,
  actorUid: string
): Promise<string | null> => {
  return await addData<Client>('clients', businessId, clientData, actorDisplayName, actorUid);
};

export const getClients = (businessId: string, workspaceId: string) => getData<Client>('clients', businessId, workspaceId);
export const getClientById = (businessId: string, id: string) => getData<Client>('clients', businessId, id, true);
export const updateClient = (businessId: string, id: string, data: Partial<Omit<Client, 'id' | 'createdAt' | 'createdBy' | 'isDeleted' | 'deletedAt'>>, actorDisplayName: string, actorUid: string) => updateDataWithDetail<Client>('clients', businessId, id, data, actorDisplayName, actorUid);
export const deleteClient = (businessId: string, id: string, actorUid: string, isAdmin: boolean, workspaceId: string) => deleteData('clients', businessId, id, actorUid, isAdmin, workspaceId);

export const addInvestment = (businessId: string, data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'isDeleted' | 'deletedAt'>, actorDisplayName: string, actorUid: string) => addData<Investment>('investments', businessId, data, actorDisplayName, actorUid);
export const getInvestments = (businessId: string, workspaceId: string) => getData<Investment>('investments', businessId, workspaceId);
export const getInvestmentById = (businessId: string, id: string) => getData<Investment>('investments', businessId, id, true);
export const updateInvestment = (businessId: string, id: string, data: Partial<Omit<Investment, 'id' | 'createdAt' | 'createdBy' | 'isDeleted' | 'deletedAt'>>, actorDisplayName: string, actorUid: string) => updateData<Investment>('investments', businessId, id, data, actorDisplayName, actorUid);
export const deleteInvestment = (businessId: string, id: string, actorUid: string, isAdmin: boolean, workspaceId: string) => deleteData('investments', businessId, id, actorUid, isAdmin, workspaceId);

export async function addStockItem(
  businessId: string,
  data: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'isDeleted' | 'deletedAt'>,
  actorDisplayName: string,
  actorUid: string
): Promise<string | null> {
  const newItemKey = await addData<StockItem>('stock', businessId, data, actorDisplayName, actorUid);
  if (!newItemKey) {
    throw new Error("Failed to get new item key");
  }
  return newItemKey;
}

export const getStockItems = (businessId: string, workspaceId: string) => getData<StockItem>('stock', businessId, workspaceId);
export const getStockItemById = (businessId: string, id: string) => getData<StockItem>('stock', businessId, id, true);
export const updateStockItem = (businessId: string, id: string, data: Partial<Omit<StockItem, 'id' | 'createdAt' | 'createdBy' | 'isDeleted' | 'deletedAt' | 'currentQuantity'>>, actorDisplayName: string, actorUid: string) => updateData<StockItem>('stock', businessId, id, data, actorDisplayName, actorUid);
export const deleteStockItem = (businessId: string, id: string, actorUid: string, isAdmin: boolean, workspaceId: string) => deleteData('stock', businessId, id, actorUid, isAdmin, workspaceId);

export async function adjustStockQuantity(
  businessId: string,
  itemId: string,
  quantityChange: number, // negative for usage, positive for restock
  actorDisplayName: string,
  actorUid: string
) {
  const itemRef = dbRef(database, `businesses/${businessId}/stock/${itemId}`);

  try {
    const transactionResult = await runTransaction(itemRef, (currentItem: StockItem | null) => {
      if (currentItem && !currentItem.isDeleted) {
        const newQuantity = currentItem.currentQuantity + quantityChange;

        if (newQuantity < 0) {
          // Abort transaction by returning undefined if stock would go negative
          return;
        }

        currentItem.currentQuantity = newQuantity;
        currentItem.updatedAt = serverTimestamp() as any;
        currentItem.updatedBy = actorDisplayName;
      }
      return currentItem;
    });

    if (!transactionResult.committed) {
      throw new Error("La quantité en stock est insuffisante pour cette opération.");
    }

    const updatedItem = transactionResult.snapshot.val() as StockItem;
    const itemName = updatedItem?.name || "Article inconnu";
    const itemUnit = updatedItem?.unit || "";

    const logAction = quantityChange > 0 ? `Réapprovisionnement de stock: ${itemName}` : `Utilisation de stock: ${itemName}`;
    const details = { "Quantité": `${Math.abs(quantityChange)} ${itemUnit}`.trim() };
    await logActivity(businessId, updatedItem.workspaceId, actorUid, logAction, details);

  } catch (error) {
    console.error("Erreur lors de l'ajustement de la quantité de stock :", error);
    if ((error as Error).message.includes("insuffisante")) {
      throw error;
    }
    throw new Error("Impossible de mettre à jour la quantité de stock.");
  }
}

export const addPlanningItem = (businessId: string, data: Omit<PlanningItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'isDeleted' | 'deletedAt'>, actorDisplayName: string, actorUid: string) => addData<PlanningItem>('planning', businessId, data, actorDisplayName, actorUid);
export const getPlanningItems = (businessId: string, workspaceId: string) => getData<PlanningItem>('planning', businessId, workspaceId);
export const getPlanningItemById = (businessId: string, id: string) => getData<PlanningItem>('planning', businessId, id, true);
export const updatePlanningItem = (businessId: string, id: string, data: Partial<Omit<PlanningItem, 'id' | 'createdAt' | 'createdBy' | 'isDeleted' | 'deletedAt'>>, actorDisplayName: string, actorUid: string) => updateData<PlanningItem>('planning', businessId, id, data, actorDisplayName, actorUid);
export const deletePlanningItem = (businessId: string, id: string, actorUid: string, isAdmin: boolean, workspaceId: string) => deleteData('planning', businessId, id, actorUid, isAdmin, workspaceId);

export const addServerFile = (businessId: string, data: Omit<ServerFile, 'id' | 'createdAt' | 'isDeleted' | 'deletedAt'>, actorDisplayName: string, actorUid: string) => addData<ServerFile>('serverFiles', businessId, data, actorDisplayName, actorUid);
export const getServerFiles = (businessId: string, workspaceId: string) => getData<ServerFile>('serverFiles', businessId, workspaceId);
export const deleteServerFile = async (businessId: string, fileId: string, actorUid: string, workspaceId: string): Promise<void> => {
  try {
    const fileRef = dbRef(database, `businesses/${businessId}/serverFiles/${fileId}`);
    const snapshot = await get(fileRef);
    if (snapshot.exists()) {
      const fileData = snapshot.val() as ServerFile;

      // This assumes the file URL is a direct Cloudinary URL that can be deleted
      // A more robust solution might store the public_id and use the Admin API via a cloud function
      console.warn("Cloudinary file deletion from client-side is not implemented for security reasons. File will be orphaned on Cloudinary.");

      // Delete from Realtime Database
      await remove(fileRef);
      await logActivity(businessId, workspaceId, actorUid, "Suppression d'un fichier du serveur", { fileName: fileData.name });
    }
  } catch (error) {
    console.error('Error deleting server file:', error);
    throw error;
  }
}


export const getActivityLog = (businessId: string, workspaceId: string) => getData<ActivityLogEntry>('activityLog', businessId, workspaceId);

// --- EXPORT & USAGE ---
export async function getBusinessDataForExport(businessId: string): Promise<AppBackup | null> {
  const businessRef = dbRef(database, `businesses/${businessId}`);
  const usersQuery = query(dbRef(database, 'users'), orderByChild('businessId'), equalTo(businessId));

  const [businessSnapshot, usersSnapshot] = await Promise.all([
    get(businessRef),
    get(usersQuery),
  ]);

  if (!businessSnapshot.exists()) {
    return null;
  }

  const businessData = businessSnapshot.val();
  const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

  return {
    exportTimestamp: new Date().toISOString(),
    businessId: businessId,
    data: {
      profile: businessData.profile || null,
      users: usersData,
      expenses: businessData.expenses || null,
      quickIncomes: businessData.quickIncomes || null,
      activityLog: businessData.activityLog || null,
      reservations: businessData.reservations || null,
      clients: businessData.clients || null,
      investments: businessData.investments || null,
      stock: businessData.stock || null,
      personalization: businessData.personalization || null,
    }
  };
}


export async function getBusinessDataUsage(businessId: string): Promise<number> {
  try {
    const businessRef = dbRef(database, `businesses/${businessId}`);
    const usersQuery = query(dbRef(database, 'users'), orderByChild('businessId'), equalTo(businessId));

    const [businessSnapshot, usersSnapshot] = await Promise.all([
      get(businessRef),
      get(usersQuery),
    ]);

    const businessData = businessSnapshot.exists() ? businessSnapshot.val() : {};
    const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

    // Calculate size of JSON data
    const jsonData = {
      businessData,
      usersData,
    };
    const jsonString = JSON.stringify(jsonData);
    // Using TextEncoder for accurate byte length, which is a good representation of "frappes"
    const dbSizeInBytes = new TextEncoder().encode(jsonString).length;

    // Estimate image storage size
    let imageCount = 0;
    const stockItems: StockItem[] = businessData.stock ? Object.values(businessData.stock) : [];
    stockItems.forEach(item => {
      if (item.imageUrl) {
        imageCount++;
      }
    });

    const promotionsSnapshot = await get(query(dbRef(database, 'promotions'), orderByChild('createdAt')));
    if (promotionsSnapshot.exists()) {
      const promotions: Promotion[] = Object.values(promotionsSnapshot.val());
      promotions.forEach(promo => {
        if (promo.imageUrl) imageCount++;
      });
    }

    // Add a reasonable average size per image (e.g., 500KB)
    const imageSizeInBytes = imageCount * 500 * 1024;

    return dbSizeInBytes + imageSizeInBytes;

  } catch (error) {
    console.error("Error calculating data usage:", error);
    throw error;
  }
}

// --- Aggregated Data Functions ---
async function getCashBalanceForBusiness(businessId: string): Promise<number> {
  try {
    const [reservations, expenses, clients, quickIncomes] = await Promise.all([
      getReservations(businessId, businessId), // Assuming primary workspace for now
      getExpenses(businessId, businessId),
      getClients(businessId, businessId),
      getQuickIncomes(businessId, businessId)
    ]);

    const totalReservationIncome = (reservations || []).filter(r => r.status !== 'cancelled').reduce((sum, res) => sum + (res.amountPaid || 0), 0);
    const totalClientIncome = (clients || []).reduce((sum, client) => sum + (client.amountPaid || 0), 0);
    const totalQuickIncome = (quickIncomes || []).reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = (expenses || []).reduce((sum, exp) => sum + exp.amount, 0);

    return totalReservationIncome + totalClientIncome + totalQuickIncome - totalExpenses;
  } catch (error) {
    console.error(`Failed to get cash balance for business ${businessId}`, error);
    return 0; // Return 0 if there's an error for a single business
  }
}

export async function getAggregatedCashBalance(userId: string): Promise<number> {
  const user = await fetchUserByUid(userId);
  if (!user || !user.workspaces) {
    throw new Error("Utilisateur ou espaces de travail introuvables.");
  }

  // This is a simplification. A real implementation would need to iterate through
  // each workspace and sum their balances, which is complex on the client side.
  // Here, we just calculate the balance for the user's primary businessId.
  const primaryBusinessId = user.businessId;
  if (!primaryBusinessId) return 0;

  return await getCashBalanceForBusiness(primaryBusinessId);
}


export async function getEmployeeLoginDetails(teamCode: string, username: string): Promise<{ adminEmail: string; businessId: string; userId: string; password?: string } | null> {
  throw new Error("Cette méthode de connexion est obsolète et a été remplacée par la connexion par téléphone.");
}


// --- Referrals ---
// This function is now OBSOLETE as the referral logic is handled by ABT.
// Kept for historical reference.
export async function findBusinessByReferralCode(code: string): Promise<string | null> {
  try {
    const indexRef = dbRef(database, `referralCodeIndex/${code}`);
    const snapshot = await get(indexRef);
    return snapshot.exists() ? snapshot.val() as string : null;
  } catch (error) {
    console.error("Error finding business by referral code:", error);
    return null;
  }
}

// This function is now OBSOLETE.
export async function getReferrals(businessId: string): Promise<Referral[]> {
  console.warn("getReferrals is deprecated. Referral logic is now handled by the ABT application.");
  return [];
}


// --- Authorized Apps (OAuth) ---
export async function getAuthorizedApps(): Promise<AuthorizedApp[]> {
  const snapshot = await get(dbRef(database, 'authorizedApps'));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val()) as AuthorizedApp[];
}

export async function getAuthorizedAppByApiKey(apiKey: string): Promise<AuthorizedApp | null> {
  const q = query(dbRef(database, 'authorizedApps'), orderByChild('apiKey'), equalTo(apiKey));
  const snapshot = await get(q);
  if (!snapshot.exists()) return null;
  const data = snapshot.val();
  const appId = Object.keys(data)[0];
  return data[appId] as AuthorizedApp;
}

export async function addAuthorizedApp(appName: string, redirectUris: string[], creatorUid: string): Promise<string> {
  const newAppRef = push(dbRef(database, 'authorizedApps'));
  const newAppId = newAppRef.key;
  if (!newAppId) throw new Error("Could not generate app ID.");
  const newApiKey = `ttr_sk_${uuidv4().replace(/-/g, '')}`;

  const newApp: AuthorizedApp = {
    id: newAppId,
    name: appName,
    apiKey: newApiKey,
    allowedRedirectUris: redirectUris,
    creatorUid: creatorUid,
    createdAt: Date.now(),
  };
  await set(newAppRef, newApp);
  return newApiKey;
}

export async function deleteAuthorizedApp(appId: string): Promise<void> {
  await remove(dbRef(database, `authorizedApps/${appId}`));
}


// --- DELETION ZONE ---
// Generic data deletion for a specific workspace
async function deleteChildData(businessId: string, workspaceId: string) {
  const paths = ['reservations', 'expenses', 'clients', 'stock', 'investments', 'planning', 'quickIncomes'];
  for (const path of paths) {
    const queryRef = query(dbRef(database, `businesses/${businessId}/${path}`), orderByChild('workspaceId'), equalTo(workspaceId));
    const snapshot = await get(queryRef);
    if (snapshot.exists()) {
      const updates: Record<string, null> = {};
      snapshot.forEach(child => {
        updates[`businesses/${businessId}/${path}/${child.key}`] = null;
      });
      await update(dbRef(database), updates);
    }
  }
}

export async function deleteWorkspace(businessId: string, workspaceId: string, actorUid: string): Promise<void> {
  const businessProfile = await getBusinessProfile(businessId);
  if (!businessProfile || !businessProfile.workspaces?.[workspaceId]) {
    throw new Error("Espace de travail introuvable.");
  }
  if (businessProfile.workspaces[workspaceId].isPrimary) {
    throw new Error("Impossible de supprimer l'espace de travail principal.");
  }

  // 1. Delete all data associated with this workspace
  await deleteChildData(businessId, workspaceId);

  // 2. Remove workspace from business profile
  await remove(dbRef(database, `businesses/${businessId}/profile/workspaces/${workspaceId}`));

  // 3. Remove workspace access from all users
  const allUsers = await getUsers(businessId);
  const updates: Record<string, any> = {};
  allUsers.forEach(user => {
    if (user.workspaces?.[workspaceId]) {
      updates[`/users/${user.uid}/workspaces/${workspaceId}`] = null;
      // If this was the user's active workspace, reassign them to the primary one
      if (user.assignedWorkspaceId === workspaceId) {
        const primaryWorkspaceId = Object.values(businessProfile.workspaces || {}).find(w => w.isPrimary)?.id || businessId;
        updates[`/users/${user.uid}/assignedWorkspaceId`] = primaryWorkspaceId;
        updates[`/users/${user.uid}/role`] = user.workspaces[primaryWorkspaceId];
      }
    }
  });
  await update(dbRef(database), updates);

  await logActivity(businessId, businessId, actorUid, "Suppression de l'espace de travail", { deletedWorkspaceId: workspaceId });
}

export async function deleteEntireBusiness(businessId: string, actorUid: string): Promise<void> {
  const profile = await getBusinessProfile(businessId);
  if (profile?.ownerUid !== actorUid) {
    throw new Error("Seul le propriétaire peut supprimer l'entreprise.");
  }

  // In a real production app, this would be a multi-step Cloud Function process.
  // 1. Get all users associated with the business
  const allUsersInBusiness = await getUsers(businessId);
  const auth = getAuth(getApp());
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Réauthentification requise.");

  // For this simulation, we assume we can delete users. In reality, this requires Admin SDK.
  console.warn("SIMULATION: Le code suivant pour supprimer les utilisateurs Firebase Auth nécessite un environnement d'administration et échouera sur le client.");

  try {
    for (const user of allUsersInBusiness) {
      // Soft delete from DB
      const userUpdates: Record<string, any> = {};
      userUpdates[`/users/${user.uid}`] = null;
      await update(dbRef(database), userUpdates);

      // This part will fail on client, but simulates the full process
      // If the user being deleted is the current user, we can't re-authenticate.
      // This flow is flawed for client-side execution and is illustrative only.
      console.log(`SIMULATION: Supprimer l'utilisateur d'authentification pour ${user.email}`);
    }
  } catch (e) {
    console.error("Erreur lors de la tentative de suppression des utilisateurs. Ceci est attendu côté client.", e);
  }

  // 2. Delete the entire business node from RTDB
  await remove(dbRef(database, `businesses/${businessId}`));
  if (profile.referralCode) {
    await remove(dbRef(database, `referralCodeIndex/${profile.referralCode}`));
  }

  // 3. Log out the current user who initiated the deletion
  await auth.signOut();
  window.location.href = '/login';
}

// --- Generic data CRUD functions ---
async function addData<T extends { workspaceId: string }>(path: string, businessId: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'isDeleted' | 'deletedAt'>, actorDisplayName: string, actorUid: string): Promise<string | null> {
  try {
    const dataRef = dbRef(database, `businesses/${businessId}/${path}`);
    const newPushRef = push(dataRef);
    const fullData: any = {
      ...data, id: newPushRef.key, createdBy: actorDisplayName, updatedBy: actorDisplayName,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), isDeleted: false, deletedAt: null,
    };
    await set(newPushRef, fullData);
    await logActivity(businessId, data.workspaceId, actorUid, `Création d'un nouvel élément dans ${path}`, { itemId: newPushRef.key });

    return newPushRef.key;
  } catch (error) {
    console.error(`Erreur lors de l'ajout de données à ${path}:`, error);
    throw error;
  }
}

async function getData<T extends { id?: string, isDeleted?: boolean, workspaceId?: string }>(path: string, businessId: string, workspaceId?: string): Promise<T[] | null>;
async function getData<T extends { id?: string, isDeleted?: boolean, workspaceId?: string }>(path: string, businessId: string, id?: string, isById?: boolean): Promise<T | null>;
async function getData<T extends { id?: string, isDeleted?: boolean, workspaceId?: string }>(path: string, businessId: string, idOrWorkspaceId?: string, isById?: boolean): Promise<T | T[] | null> {
  if (!businessId) {
    console.warn(`getData called with missing businessId for path: ${path}`);
    return isById ? null : [];
  }
  if (!idOrWorkspaceId) {
    // This is a new check to prevent the 'undefined' error
    console.warn(`getData called with missing idOrWorkspaceId (workspaceId or entityId) for path: ${path}`);
    return isById ? null : [];
  }

  try {
    if (isById) {
      const dataRef = dbRef(database, `businesses/${businessId}/${path}/${idOrWorkspaceId}`);
      const snapshot = await get(dataRef);
      if (snapshot.exists()) {
        const item = { ...snapshot.val(), id: idOrWorkspaceId } as T;
        return item.isDeleted ? null : item;
      }
      return null;
    }

    const dataQuery = query(dbRef(database, `businesses/${businessId}/${path}`), orderByChild('workspaceId'), equalTo(idOrWorkspaceId));
    const snapshot = await get(dataQuery);

    if (snapshot.exists()) {
      const itemsObject = snapshot.val();
      if (itemsObject && typeof itemsObject === 'object') {
        const allItems = Object.keys(itemsObject)
          .map(key => ({ ...itemsObject[key], id: key })) as T[];
        return allItems.filter(item => !item.isDeleted);
      }
    }
    return []; // Return empty array if no data for that workspace
  } catch (error) {
    console.error(`Erreur lors de la récupération des données de ${path}:`, error);
    throw error;
  }
}


async function updateData<T extends { workspaceId: string }>(
  path: string,
  businessId: string,
  id: string,
  data: Partial<Omit<T, 'id'>>,
  actorDisplayName: string,
  actorUid: string
) {
  try {
    const dataRef = dbRef(database, `businesses/${businessId}/${path}/${id}`);

    const existingDataSnapshot = await get(dataRef);
    if (!existingDataSnapshot.exists()) {
      throw new Error("L'élément à mettre à jour est introuvable.");
    }

    const updates = {
      ...data,
      updatedBy: actorDisplayName,
      updatedAt: serverTimestamp(),
    };

    await update(dataRef, updates);

    await logActivity(
      businessId,
      (data as any).workspaceId || existingDataSnapshot.val().workspaceId,
      actorUid,
      `Mise à jour de l'élément ${id} dans ${path}`,
      { updates: Object.keys(data) }
    );
  } catch (error) {
    console.error(`Erreur lors de la mise à jour des données pour ${path}/${id}:`, error);
    throw error;
  }
}

async function updateDataWithDetail<T extends { workspaceId: string }>(
  path: string,
  businessId: string,
  id: string,
  data: Partial<Omit<T, 'id'>>,
  actorDisplayName: string,
  actorUid: string
) {
  try {
    const dataRef = dbRef(database, `businesses/${businessId}/${path}/${id}`);

    const existingDataSnapshot = await get(dataRef);
    if (!existingDataSnapshot.exists()) {
      throw new Error("L'élément à mettre à jour est introuvable.");
    }
    const oldData = existingDataSnapshot.val() as T;

    const updates = {
      ...data,
      updatedBy: actorDisplayName,
      updatedAt: serverTimestamp(),
    };

    await update(dataRef, updates);

    const changes: Record<string, { from: any, to: any }> = {};
    for (const key in data) {
      const typedKey = key as keyof typeof data;
      if (data[typedKey] !== oldData[typedKey]) {
        changes[key] = { from: oldData[typedKey], to: data[typedKey] };
      }
    }

    if (Object.keys(changes).length > 0) {
      await logActivity(
        businessId,
        (data as any).workspaceId || oldData.workspaceId,
        actorUid,
        `Mise à jour de: ${path.slice(0, -1)} ${id}`,
        { entityId: id, changes }
      );
    }
  } catch (error) {
    console.error(`Erreur lors de la mise à jour des données pour ${path}/${id}:`, error);
    throw error;
  }
}


async function deleteData(path: string, businessId: string, id: string, actorUid: string, isAdmin: boolean, workspaceId: string) {
  if (!isAdmin) {
    await logActivity(businessId, workspaceId, actorUid, `Tentative de suppression non autorisée`, { path, id, status: "Échouée" });
    throw new Error("Seul un administrateur peut effectuer cette action.");
  }

  try {
    const dataRef = dbRef(database, `businesses/${businessId}/${path}/${id}`);
    const updates = { isDeleted: true, deletedAt: serverTimestamp() };
    await update(dataRef, updates);
    await logActivity(businessId, workspaceId, actorUid, `Élément marqué comme supprimé`, { path, itemId: id });
  } catch (error) {
    console.error(`Erreur lors du marquage comme supprimé de ${path}/${id}:`, error);
    throw error;
  }
}

// --- Promotions ---
export async function addPromotion(data: { imageUrl: string; linkUrl: string }): Promise<void> {
  const { imageUrl, linkUrl } = data;
  if (!imageUrl || !linkUrl) {
    throw new Error("Image URL and link URL are required.");
  }

  try {
    const promotionsRef = dbRef(database, 'promotions');
    const newPromotionRef = push(promotionsRef);
    const newPromotion: Promotion = {
      id: newPromotionRef.key!,
      imageUrl: imageUrl,
      linkUrl: linkUrl,
      createdAt: serverTimestamp() as any,
    };
    await set(newPromotionRef, newPromotion);
  } catch (error) {
    console.error('Error adding promotion:', error);
    throw error;
  }
}


export async function getPromotions(): Promise<Promotion[] | null> {
  try {
    const promotionsRef = query(dbRef(database, 'promotions'), orderByChild('createdAt'));
    const snapshot = await get(promotionsRef);
    if (snapshot.exists()) {
      return Object.values(snapshot.val()).reverse() as Promotion[];
    }
    return null;
  } catch (error) {
    console.error('Error fetching promotions:', error);
    throw error;
  }
}

export async function deletePromotion(promotion: Promotion): Promise<void> {
  try {
    const promotionRef = dbRef(database, `promotions/${promotion.id}`);
    await remove(promotionRef);
    // Note: This does not delete the image from Cloudinary to avoid needing admin API keys on the client.
    // This could be handled by a Cloud Function in a production environment.
  } catch (error) {
    console.error('Error deleting promotion:', error);
    throw error;
  }
}

// --- Payout Management ---
export async function requestPayout(
  businessId: string,
  amount: number,
  userId: string,
  userName: string,
  method: string
): Promise<void> {

  // 1. Transaction to check and deduct balance
  const balanceRef = dbRef(database, `businesses/${businessId}/profile/referralBalance`);

  // We update the balance atomically.
  const result = await runTransaction(balanceRef, (currentBalance) => {
    if ((currentBalance || 0) < amount) {
      return; // Abort transaction if insufficient funds
    }
    return (currentBalance || 0) - amount;
  });

  if (!result.committed) {
    throw new Error("Solde insuffisant pour le retrait (Transaction annulée).");
  }

  // 2. Create the Payout Request record
  const requestsRef = dbRef(database, 'payoutRequests');
  const newRequestRef = push(requestsRef);
  const requestData = {
    id: newRequestRef.key,
    businessId,
    amount,
    userId,
    userName,
    method,
    status: 'pending',
    createdAt: serverTimestamp(),
  };

  await set(newRequestRef, requestData);

  // 3. Log activity
  await logActivity(businessId, businessId, userId, "Demande de retrait Monoyi", {
    amount: amount,
    method: method,
    requestId: newRequestRef.key
  });
}
