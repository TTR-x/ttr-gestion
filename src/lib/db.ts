
import Dexie, { Table } from 'dexie';
import { Reservation, Expense, Client, StockItem, Investment, QuickIncome, ActivityLogEntry, DeletionHistory, Profit } from './types';

export interface SyncQueueItem {
    id?: number;
    collection: string; // 'reservations', 'expenses', etc.
    action: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
}

export interface LocalImage {
    id: string;
    stockItemId?: string;
    blob: Blob;
    fileName: string;
    fileSize: number;
    uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
    cloudinaryUrl?: string;
    createdAt: number;
    uploadedAt?: number;
}

export interface ImageUploadQueueItem {
    id?: number;
    imageId: string;
    timestamp: number;
    retryCount: number;
    lastError?: string;
}

export interface SyncMetadata {
    key: string;
    value: any;
    updatedAt: number;
}

export class AppDatabase extends Dexie {
    reservations!: Table<Reservation>;
    expenses!: Table<Expense>;
    clients!: Table<Client>;
    stock!: Table<StockItem>;
    investments!: Table<Investment>;
    quickIncomes!: Table<QuickIncome>;
    activityLog!: Table<ActivityLogEntry>;
    profits!: Table<Profit>;
    syncQueue!: Table<SyncQueueItem>;
    localImages!: Table<LocalImage>;
    imageUploadQueue!: Table<ImageUploadQueueItem>;
    syncMetadata!: Table<SyncMetadata>;
    deletionHistory!: Table<DeletionHistory>;

    constructor() {
        super('TTRGestionDB');
        this.version(1).stores({
            reservations: 'id, workspaceId, businessId, status, checkInDate, checkOutDate',
            expenses: 'id, workspaceId, businessId, date',
            clients: 'id, businessId, phoneNumber',
            stock: 'id, workspaceId, businessId',
            investments: 'id, businessId, date',
            quickIncomes: 'id, workspaceId, businessId',
            activityLog: 'id, workspaceId, timestamp',
            syncQueue: '++id, collection, action, timestamp'
        });

        // Version 2: Add workspaceId index to clients and investments
        this.version(2).stores({
            clients: 'id, workspaceId, businessId, phoneNumber',
            investments: 'id, workspaceId, businessId, date'
        });

        // Version 3: Update activityLog index
        this.version(3).stores({
            activityLog: 'id, workspaceId, deviceTimestamp'
        });

        // Version 4: Add local image storage tables
        this.version(4).stores({
            localImages: 'id, stockItemId, uploadStatus, createdAt',
            imageUploadQueue: '++id, imageId, timestamp, retryCount',
            syncMetadata: 'key, updatedAt'
        });

        // Version 5: Add deletion history table
        this.version(5).stores({
            deletionHistory: 'id, workspaceId, businessId, entityType, entityId, deletedAt, deletedByUid, canRestore'
        });

        // Version 6: Add profits tracking table
        this.version(6).stores({
            profits: 'id, workspaceId, businessId, date, relatedEntityId'
        });

        // Version 7: Add index on cloudinaryUrl for duplicate checking
        this.version(7).stores({
            localImages: 'id, stockItemId, uploadStatus, cloudinaryUrl, createdAt'
        });
    }
}

export const db = new AppDatabase();
