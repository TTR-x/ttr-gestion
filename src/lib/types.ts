

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
  emailVerified: boolean;
  displayName: string;
  username?: string;
  role: 'admin' | 'employee'; // Role in the ACTIVE business
  businessId: string; // The ACTIVE business
  assignedWorkspaceId: string; // The ACTIVE workspace
  workspaces?: { [key: string]: 'admin' | 'employee' }; // All accessible businesses and roles
  phoneNumber?: string | null;
  pin?: string;
  isDeleted?: boolean;
  deletedAt?: number | null;
  createdAt?: number;
  updatedAt?: number;
  invitedBy?: string; // UID of the admin who invited them
  onboardingCompleted?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  type: string;
  isPrimary: boolean;
  createdAt: number;
}

export type PlanName = 'gratuit' | 'particulier' | 'entreprise' | 'essentiel' | 'croissance' | 'pro' | 'avancé' | 'premium' | 'élite';

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
  appliedPromoCode?: string;
  referredBy?: string; // Business ID of the referrer
  referredByAmbassadorId?: string;
  referralBalance?: number;
  isVerified: boolean;
  subscriptionType?: PlanName;
  subscriptionExpiresAt?: number; // Timestamp
  trialExtended?: boolean;
  logoUrl?: string;
  website?: string;
  businessPhoneNumber?: string;
  businessPhoneNumberStatus?: 'pending' | 'approved' | 'rejected';
  businessAddress?: string;
  professionalEmail?: string;
  termsAndConditions?: string;
  receiptWatermarkEnabled?: boolean;
  workspaces?: Record<string, Workspace>;
  premiumTestsUsed?: number;
}


export interface ServiceType {
  id?: string;
  name: string;
  price: number;
  purchasePrice?: number;
}

export interface PersonalizationSettings {
  serviceTypes?: ServiceType[];
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
  durationMonths: number;
  userPhoneNumber: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  processedAt?: number;
  appliedPromoCode?: string;
}

export interface NumberValidationRequest {
  id: string;
  userId: string;
  businessId: string;
  businessName: string;
  phoneNumber: string;
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

export interface ReservationItem {
  id: string; // Can be service ID or stock item ID
  name: string;
  quantity: number;
  price: number;
  purchasePrice?: number;
  type: 'service' | 'stock';
}

export interface Reservation {
  id: string;
  workspaceId: string;
  businessId?: string;
  clientId?: string;
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
  items: ReservationItem[];
}

export interface Expense {
  id: string;
  workspaceId: string;
  businessId?: string;
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

export interface Profit {
  id: string;
  workspaceId: string;
  businessId: string;
  date: string; // ISO string to match other entities
  amount: number; // The profit/margin amount
  sourceType: 'sale' | 'service' | 'quickIncome' | 'other';
  relatedEntityId?: string; // ID of the reservation, stock item, or quick income
  description?: string;
  createdBy: string;
  createdAt: number;
  isDeleted?: boolean;
}

export interface QuickIncome {
  id: string;
  workspaceId: string;
  businessId?: string;
  description: string;
  amount: number;
  purchasePrice?: number; // Added to track margin for manual inputs
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
  workspaceId: string;
  businessId?: string;
  deviceTimestamp: number;
  serverTimestamp: number;
  timestamp?: number; // Legacy support
  actorUid: string;
  actorDisplayName?: string;
  action: string;
  details: Record<string, any>;
}

export interface Client {
  id: string;
  workspaceId: string;
  businessId?: string;
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
  workspaceId: string;
  businessId?: string;
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
  workspaceId: string;
  businessId?: string;
  name: string;
  unit: string; // e.g., "pièces", "kg", "bouteilles"
  currentQuantity: number;
  price?: number; // Selling price per unit
  purchasePrice?: number; // Purchase price per unit
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
  workspaceId: string;
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

export interface Promotion {
  id: string;
  imageUrl: string;
  linkUrl: string;
  createdAt: number;
}

export interface ServerFile {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  type: string; // e.g., 'image/jpeg', 'application/pdf'
  size: number; // in bytes
  createdAt: number;
  createdBy: string;
  isDeleted?: boolean;
  deletedAt?: number;
}

export interface PendingReceipt {
  id: string;
  timestamp: number;
  type: 'sale' | 'expense' | 'income';
  description: string;
  amount: number;
}

export interface AuthorizedApp {
  id: string;
  name: string;
  apiKey: string;
  allowedRedirectUris: string[];
  creatorUid: string;
  createdAt: number;
}

export interface AffectedEntity {
  type: string;
  ids: string[];
  action: 'deleted' | 'updated';
}

export interface DeletionCalculations {
  stockAdjustment?: number;
  treasuryAdjustment?: number;
  totalPaymentsDeducted?: number;
  paymentsDeducted?: number;
}

export interface DeletionHistory {
  id: string;
  workspaceId: string;
  businessId: string;
  entityType: 'client' | 'reservation' | 'stock' | 'expense' | 'investment' | 'quickIncome';
  entityId: string;
  entityName: string;
  deletedBy: string;
  deletedByUid: string;
  deletedAt: number;
  affectedEntities: AffectedEntity[];
  calculations: DeletionCalculations;
  canRestore: boolean;
  restoredAt?: number;
  restoredBy?: string;
  restoredByUid?: string;
}

export interface DeletionResult {
  success: boolean;
  affectedEntities: AffectedEntity[];
  calculations: DeletionCalculations;
  error?: string;
}

export interface AppVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: string;
  category?: string;
  createdAt: number;
}
