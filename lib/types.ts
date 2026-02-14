

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  href?: string;
  read: boolean;
  target?: 'all' | 'subscribed' | 'gratuit' | 'particulier' | 'petite_entreprise' | 'grande_entreprise';
  createdAt: number;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  role: 'admin' | 'employee'; // Role in the ACTIVE business
  businessId: string; // The ACTIVE business
  workspaces?: { [key: string]: 'admin' | 'employee' }; // All accessible businesses and roles
  phoneNumber?: string | null;
  pin?: string;
  isDeleted?: boolean;
  deletedAt?: number | null;
  createdAt?: number;
  updatedAt?: number;
}

export interface BusinessProfile {
  name: string;
  type: string;
  country: string;
  teamCode: string;
  currency?: string;
  ownerUid: string;
  createdAt: number;
  updatedAt: number;
  gamesForEmployeesEnabled?: boolean;
  investmentFeatureEnabledForEmployees?: boolean;
  requireEmployeePasswordOnLogin?: boolean;
  referralCode?: string;
  appliedReferralCode?: string;
  referredBy?: string; // Business ID of the referrer
  referralBalance?: number;
  isVerified: boolean;
  subscriptionType?: 'gratuit' | 'particulier' | 'petite_entreprise' | 'grande_entreprise';
  subscriptionExpiresAt?: number; // Timestamp
  trialExtended?: boolean;
}

export interface PersonalizationSettings {
  serviceTypes?: string[];
  // Future fields: rooms, tables, productCategories, etc.
}

export interface SubscriptionRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  businessId: string;
  businessName: string;
  plan: string;
  amount: number;
  currency: string;
  userPhoneNumber: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  processedAt?: number;
}

export interface AiFeedback {
    id: string;
    businessId: string;
    actorUid: string;
    prompt: string;
    response: string;
    feedback: 'like' | 'dislike';
    timestamp: number;
}

export interface Reservation {
  id: string;
  guestName: string;
  checkInDate: string; // ISO string
  checkOutDate: string; // ISO string
  roomType: string;
  numberOfGuests: number;
  totalAmount: number;
  amountPaid?: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'checked-in' | 'checked-out';
  notes?: string;
  createdBy: string; // actor's displayName
  updatedBy?: string; // actor's displayName
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number | null;
}

export interface Expense {
  id: string;
  itemName: string;
  amount: number;
  category: string;
  date: string; // ISO string
  description?: string;
  createdBy: string; // actor's displayName
  updatedBy?: string; // actor's displayName
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number | null;
}

export interface QuickIncome {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string
  createdBy: string; // actor's displayName
  updatedBy?: string; // actor's displayName
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number | null;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  actorUid: string;
  actorDisplayName?: string;
  action: string;
  details: Record<string, any>;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phoneNumber: string;
  address?: string;
  notes?: string;
  totalAmount?: number;
  amountPaid?: number;
  createdBy: string; // actor's displayName
  updatedBy?: string; // actor's displayName
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number | null;
}

export interface IdeaPost {
  id: string;
  authorUid: string;
  authorDisplayName: string;
  authorAvatarInitials: string;
  text?: string;
  imageUrl?: string;
  createdAt: number;
  isDeleted?: boolean;
  deletedAt?: number | null;
  likes?: Record<string, boolean>; // Map of user UIDs to true
  commentCount?: number;
}

export interface IdeaComment {
    id: string;
    postId: string;
    authorUid: string;
    authorDisplayName: string;
    authorAvatarInitials: string;
    text: string;
    createdAt: number;
}

export interface Investment {
  id: string;
  name: string;
  description: string;
  initialAmount: number;
  expectedReturn: number;
  timeframeMonths: number;
  riskLevel: 'Faible' | 'Moyen' | 'Élevé';
  status: 'Planification' | 'Actif' | 'Terminé' | 'En attente';
  profitabilityAnalysis?: string; // For future AI use
  createdBy: string;
  updatedBy?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number | null;
}

export interface StockItem {
  id: string;
  name: string;
  unit: string; // e.g., "pièces", "kg", "bouteilles"
  currentQuantity: number;
  price?: number; // Selling price per unit
  isForSale: boolean;
  lowStockThreshold: number;
  imageUrl?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number | null;
}

export interface PlanningItem {
  id: string;
  title: string;
  date: string; // ISO string
  type: 'task' | 'payment' | 'delivery' | 'appointment' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  reminderEnabled: boolean;
  reminderTime: 'on-day' | '1-day-before' | '2-days-before';
  createdBy: string;
  updatedBy?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number | null;
}

export interface Referral {
  id: string; // The business ID of the referred user
  referredBusinessName: string;
  status: 'pending' | 'active'; // pending until they subscribe, then active
  commissionEarned: number;
  currency?: string;
  date: number; // Timestamp of the referral
}


// Type for the complete data backup for a single business
export interface AppBackup {
  exportTimestamp: string;
  businessId: string;
  data: {
    profile: BusinessProfile | null;
    users: Record<string, User> | null;
    expenses: Record<string, Expense> | null;
    quickIncomes: Record<string, QuickIncome> | null;
    activityLog: Record<string, ActivityLogEntry> | null;
    reservations: Record<string, Reservation> | null;
    clients: Record<string, Client> | null;
    investments: Record<string, Investment> | null;
    stock: Record<string, StockItem> | null;
    personalization: Record<string, PersonalizationSettings> | null;
  };
}
