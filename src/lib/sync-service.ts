import { db, SyncQueueItem } from './db';
import { Reservation, Expense, Client, StockItem, Investment, QuickIncome, ActivityLogEntry, Profit } from './types';
import { database } from './firebase/config';
import { ref, push, set, update, remove, get, query, orderByChild, equalTo, serverTimestamp, onChildAdded, onChildChanged, onChildRemoved, onDisconnect } from 'firebase/database';
import { getEstimatedServerTime } from '../components/layout/time-sync-guard';
import { v4 as uuidv4 } from 'uuid';
import { localImageService } from './local-image-service';

export const syncService = {
    // --- Core Sync Logic (Updated with sanitization) ---

    // Helper to remove undefined values which Firebase RTDB doesn't allow
    sanitizeForFirebase(obj: any): any {
        if (obj === null || typeof obj !== 'object') return obj;

        const sanitized = Array.isArray(obj) ? [] : {};

        Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (value !== undefined) {
                if (typeof value === 'object' && value !== null) {
                    (sanitized as any)[key] = this.sanitizeForFirebase(value);
                } else {
                    (sanitized as any)[key] = value;
                }
            }
        });

        return sanitized;
    },

    async initialSync(businessId: string, workspaceId: string, onProgress?: (progress: number, message: string) => void) {
        try {
            console.log(`Starting initial sync for business ${businessId}, workspace ${workspaceId}`);
            if (onProgress) onProgress(10, "Connexion au serveur...");

            const basePath = `businesses/${businessId}`;

            // Build queries matching database.ts logic
            const qReservations = query(ref(database, `${basePath}/reservations`), orderByChild('workspaceId'), equalTo(workspaceId));
            const qExpenses = query(ref(database, `${basePath}/expenses`), orderByChild('workspaceId'), equalTo(workspaceId));
            const qStock = query(ref(database, `${basePath}/stock`), orderByChild('workspaceId'), equalTo(workspaceId));
            const qClients = query(ref(database, `${basePath}/clients`), orderByChild('workspaceId'), equalTo(workspaceId));
            const qQuickIncomes = query(ref(database, `${basePath}/quickIncomes`), orderByChild('workspaceId'), equalTo(workspaceId));
            const qInvestments = query(ref(database, `${basePath}/investments`), orderByChild('workspaceId'), equalTo(workspaceId));
            const qActivityLog = query(ref(database, `${basePath}/activityLog`), orderByChild('workspaceId'), equalTo(workspaceId));
            const qProfits = query(ref(database, `${basePath}/profits`), orderByChild('workspaceId'), equalTo(workspaceId));

            if (onProgress) onProgress(30, "Téléchargement des données...");

            // Use Promise.allSettled for robustness
            const results = await Promise.allSettled([
                get(qReservations),
                get(qExpenses),
                get(qStock),
                get(qClients),
                get(qQuickIncomes),
                get(qInvestments),
                get(qActivityLog),
                get(qProfits)
            ]);

            if (onProgress) onProgress(60, "Traitement des données...");

            const [
                reservationsRes,
                expensesRes,
                stockRes,
                clientsRes,
                quickIncomesRes,
                investmentsRes,
                activityLogRes,
                profitsRes
            ] = results;

            // Helper to process results
            const processResult = async <T extends { id: string }>(result: any, table: any, collectionName: string) => {
                if (result.status === 'fulfilled' && result.value.exists()) {
                    const data = result.value.val();
                    let items = Object.keys(data).map(key => ({ ...data[key], id: key, businessId })) as T[];

                    // CRITICAL FIX: Don't overwrite local items that have pending changes!
                    // Get all pending items for this collection
                    const pendingItems = await db.syncQueue
                        .where('collection').equals(collectionName)
                        .toArray();

                    const pendingIds = new Set(pendingItems.map(i => i.data?.id).filter(id => id));

                    // Filter out items that are currently pending sync (local version is newer)
                    items = items.filter(item => !pendingIds.has(item.id));

                    const activeItems = items.filter((i: any) => !i.isDeleted);

                    // We use bulkPut but only for items We didn't filter out.
                    // This creates a potential issue: what if an item was DELETED on server but modified locally?
                    // If modified locally, it's in pendingIds, so we keep local.
                    // If deleted on server, 'items' won't contain it. Local DB might have it.
                    // bulkPut won't delete it.
                    // We need to handle deletions? 
                    // processResult logic: currently just puts activeItems.
                    // It does NOT remove items that are not in the server response (it's not a full replace).
                    // So deletions must be handled by 'isDeleted' flag usually.

                    if (activeItems.length > 0) {
                        await table.bulkPut(activeItems);

                        // If these are stock items, cache their images in background
                        if (collectionName === 'stock') {
                            activeItems.forEach((item: any) => {
                                if (item.imageUrl && item.imageUrl.startsWith('http')) {
                                    localImageService.cacheRemoteImage(item.imageUrl, item.id).catch(() => { });
                                }
                            });
                        }
                    }
                } else if (result.status === 'rejected') {
                    console.error("Sync failed for a collection:", result.reason);
                }
            };

            await processResult<Reservation>(reservationsRes, db.reservations, 'reservations');
            await processResult<Expense>(expensesRes, db.expenses, 'expenses');
            await processResult<StockItem>(stockRes, db.stock, 'stock');
            await processResult<Client>(clientsRes, db.clients, 'clients');
            await processResult<QuickIncome>(quickIncomesRes, db.quickIncomes, 'quickIncomes');
            await processResult<Investment>(investmentsRes, db.investments, 'investments');
            await processResult<ActivityLogEntry>(activityLogRes, db.activityLog, 'activityLog');
            await processResult<Profit>(profitsRes, db.profits, 'profits');

            if (onProgress) onProgress(100, "Synchronisation terminée !");
            console.log("Synchronisation initiale terminée avec succès.");

        } catch (error) {
            console.error("Erreur critique lors de la synchronisation initiale:", error);
            if (onProgress) onProgress(0, "Erreur de synchronisation.");
        }
    },

    // --- Real-Time Sync Logic ---
    // Listen for changes from Firebase and update local Dexie DB
    // Returns an unsubscribe function
    initializeRealTimeSync(businessId: string, workspaceId: string) {
        console.log(`Initializing Real-Time Sync for business ${businessId}, workspace ${workspaceId}`);
        const basePath = `businesses/${businessId}`;
        const collections = [
            { name: 'reservations', query: query(ref(database, `${basePath}/reservations`), orderByChild('workspaceId'), equalTo(workspaceId)), table: db.reservations },
            { name: 'expenses', query: query(ref(database, `${basePath}/expenses`), orderByChild('workspaceId'), equalTo(workspaceId)), table: db.expenses },
            { name: 'stock', query: query(ref(database, `${basePath}/stock`), orderByChild('workspaceId'), equalTo(workspaceId)), table: db.stock },
            { name: 'clients', query: query(ref(database, `${basePath}/clients`), orderByChild('workspaceId'), equalTo(workspaceId)), table: db.clients },
            { name: 'quickIncomes', query: query(ref(database, `${basePath}/quickIncomes`), orderByChild('workspaceId'), equalTo(workspaceId)), table: db.quickIncomes },
            { name: 'investments', query: query(ref(database, `${basePath}/investments`), orderByChild('workspaceId'), equalTo(workspaceId)), table: db.investments },
            { name: 'activityLog', query: query(ref(database, `${basePath}/activityLog`), orderByChild('workspaceId'), equalTo(workspaceId)), table: db.activityLog },
            { name: 'profits', query: query(ref(database, `${basePath}/profits`), orderByChild('workspaceId'), equalTo(workspaceId)), table: db.profits },
        ];

        const unsubscribers: (() => void)[] = [];

        // Dynamic import to avoid SSR issues if this file is imported there, 
        // though sync-service is usually client-side. 
        // We use the firebase/database functions directly.

        // We need to listen to ChildAdded, ChildChanged, ChildRemoved
        // 'child_added' is good for initial load + new items.
        // 'child_changed' for updates.
        // 'child_removed' for deletions.

        collections.forEach(({ name, query, table }) => {
            // Child Added
            const unsubAdded = onChildAdded(query, async (snapshot: any) => {
                if (snapshot.exists()) {
                    const val = snapshot.val();
                    const item = { ...val, id: snapshot.key, businessId };

                    // Check if we have a pending sync for this item
                    const isPending = await syncService.isItemPendingSync(name, item.id);
                    if (isPending) {
                        console.log(`[Sync] Skipping server update for ${name}/${item.id} because local changes are pending.`);
                        return;
                    }

                    if (!item.isDeleted) {
                        await table.put(item);

                        // If it's a stock item with a remote image, cache it locally
                        if (name === 'stock' && item.imageUrl && item.imageUrl.startsWith('http')) {
                            localImageService.cacheRemoteImage(item.imageUrl, item.id);
                        }
                    }
                }
            });
            unsubscribers.push(unsubAdded);

            // Child Changed
            const unsubChanged = onChildChanged(query, async (snapshot: any) => {
                if (snapshot.exists()) {
                    const val = snapshot.val();
                    const item = { ...val, id: snapshot.key, businessId };

                    // Check if we have a pending sync for this item
                    const isPending = await syncService.isItemPendingSync(name, item.id);
                    if (isPending) {
                        console.log(`[Sync] Skipping server update for ${name}/${item.id} because local changes are pending.`);
                        return;
                    }

                    if (item.isDeleted) {
                        await table.delete(item.id);
                    } else {
                        await table.put(item);

                        // If it's a stock item with a remote image, cache it locally
                        if (name === 'stock' && item.imageUrl && item.imageUrl.startsWith('http')) {
                            localImageService.cacheRemoteImage(item.imageUrl, item.id);
                        }
                    }
                }
            });
            unsubscribers.push(unsubChanged);

            // Child Removed
            const unsubRemoved = onChildRemoved(query, async (snapshot: any) => {
                if (snapshot.key) {
                    // Check pending? If I deleted it locally, it's pending 'delete'.
                    // If I modified it locally, and server says 'removed'... conflict.
                    // If pending, we keep local? 
                    // If pending delete, and server removed... ok to remove.
                    // If pending update, and server removed... we might want to keep it and re-push?
                    // For safety, if pending, ignore server remove.
                    const isPending = await syncService.isItemPendingSync(name, snapshot.key);
                    if (isPending) {
                        console.log(`[Sync] Skipping server removal for ${name}/${snapshot.key} because local changes are pending.`);
                        return;
                    }

                    await table.delete(snapshot.key);
                }
            });
            unsubscribers.push(unsubRemoved);
        });

        return () => {
            console.log("Stopping Real-Time Sync...");
            unsubscribers.forEach(unsub => unsub());
        };
    },

    // Helper to check if an item has pending offline changes
    async isItemPendingSync(collectionName: string, itemId: string): Promise<boolean> {
        try {
            // Since we can't easily query by deep property 'data.id' in Dexie without a custom index,
            // we first filter by collection (which is indexed), then iterate.
            // Given the sync queue should remain small (it's cleared on sync), this is acceptable.
            const count = await db.syncQueue
                .where('collection').equals(collectionName)
                .filter(item => item.data && item.data.id === itemId)
                .count();
            return count > 0;
        } catch (e) {
            console.error("Error checking pending sync status:", e);
            return false;
        }
    },

    // --- Presence & Device Management ---
    async initializePresence(businessId: string, deviceName: string = navigator.userAgent, planId: string = 'gratuit') {
        try {
            console.log(`[Presence] Initializing for business ${businessId} (Plan: ${planId})`);
            const DEVICE_ID_KEY = 'ttr_device_id';
            let deviceId = localStorage.getItem(DEVICE_ID_KEY);
            if (!deviceId) {
                deviceId = uuidv4();
                localStorage.setItem(DEVICE_ID_KEY, deviceId);
            }
            console.log(`[Presence] Device ID: ${deviceId}`);

            const deviceRef = ref(database, `businesses/${businessId}/devices/${deviceId}`);
            const devicesRef = ref(database, `businesses/${businessId}/devices`);
            const historyRef = ref(database, `businesses/${businessId}/connection_history`);

            // Log Attempt
            const attemptLog = {
                deviceId,
                deviceName,
                timestamp: serverTimestamp(),
                action: 'connect_attempt',
                userAgent: navigator.userAgent
            };
            const attemptRef = await push(historyRef, attemptLog);

            // Check active connection count limit
            const snapshot = await get(devicesRef);
            let activeDevicesCount = 0;

            if (snapshot.exists()) {
                const devices = snapshot.val();
                // Count online devices, EXCLUDING current device (in case it's a reconnect)
                const onlineDevices = Object.values(devices).filter((d: any) => d.status === 'online' && d.id !== deviceId);
                activeDevicesCount = onlineDevices.length;

                // Dynamic Limit
                const MAX_DEVICES = (planId === 'gratuit' || !planId) ? 1 : 3;

                if (activeDevicesCount >= MAX_DEVICES) {
                    // We are over limit.
                    // Check if we are already online (reclaiming session)? 
                    // The filter above `d.id !== deviceId` handles this: we assume we are NOT one of the OTHER online devices.
                    // So if OTHERS >= MAX, we can't join.

                    console.warn(`Max devices reached (${MAX_DEVICES}). Connection denied. Active: ${activeDevicesCount}`);

                    // Log Failure
                    await update(ref(database, `businesses/${businessId}/connection_history/${attemptRef.key}`), {
                        status: 'blocked',
                        reason: 'max_limit_reached',
                        limit: MAX_DEVICES,
                        activeCount: activeDevicesCount
                    });

                    return { success: false, reason: "MAX_DEVICES_REACHED", max: MAX_DEVICES };
                }
            }

            // Set presence
            const presenceData = {
                id: deviceId,
                name: deviceName,
                status: 'online',
                lastSeen: serverTimestamp(),
                userAgent: navigator.userAgent
            };

            await set(deviceRef, presenceData);

            // Log Success
            await update(ref(database, `businesses/${businessId}/connection_history/${attemptRef.key}`), {
                status: 'connected',
                activeCount: activeDevicesCount + 1
            });

            onDisconnect(deviceRef).update({
                status: 'offline',
                lastSeen: serverTimestamp()
            });

            return { success: true, deviceId };

        } catch (error) {
            console.error("Error initializing presence:", error);
            return { success: false, reason: "ERROR" };
        }
    },

    async setOffline(businessId: string) {
        try {
            const DEVICE_ID_KEY = 'ttr_device_id';
            const deviceId = localStorage.getItem(DEVICE_ID_KEY);
            if (!deviceId) return;

            console.log(`[Presence] Setting device ${deviceId} offline for business ${businessId}`);
            const deviceRef = ref(database, `businesses/${businessId}/devices/${deviceId}`);

            // We use 'update' to set status to offline.
            // onDisconnect will also fire eventually, but this is immediate.
            await update(deviceRef, {
                status: 'offline',
                lastSeen: serverTimestamp()
            });
        } catch (error) {
            console.error("Error setting offline status:", error);
        }
    },



    async syncToCloud() {
        if (!typeof window || !navigator.onLine) return;

        // Trigger image upload queue processing in background
        localImageService.processUploadQueue().catch(err => console.error("Background image upload processing failed:", err));

        // Check if syncQueue exists before accessing it
        if (!db.syncQueue) return;

        const items = await db.syncQueue.orderBy('timestamp').toArray();
        if (items.length === 0) return;

        console.log(`Processing ${items.length} items from sync queue...`);

        for (const item of items) {
            try {
                // Validate businessId existence before processing
                if (!item.data || !item.data.businessId) {
                    console.warn("Skipping invalid queue item (missing businessId):", JSON.stringify(item));
                    if (item.id) await db.syncQueue.delete(item.id);
                    continue;
                }

                // DIRECT WRITE MODE: Write directly to the database nodes
                // This ensures that local changes are immediately reflected on the server
                // and prevents data loss on refresh (since initialSync will fetch the updated data).
                await this.processQueueItem(item);

                // Remove from local queue because it has been processed
                await db.syncQueue.delete(item.id!);

            } catch (error) {
                console.error("Error processing queue item:", item, error);
                // Keep in queue to retry?
            }
        }
    },

    async submitToPending(businessId: string, item: SyncQueueItem) {
        const pendingRef = ref(database, `businesses/${businessId}/pending_changes`);
        await push(pendingRef, {
            ...item,
            submittedAt: serverTimestamp(),
            deviceId: localStorage.getItem('ttr_device_id') || 'unknown'
        });
    },

    // OLD processQueueItem (kept for reference or direct sync if we revert)
    // This function is now intended to be called by an Admin client or Cloud Function
    // to apply a change that has been approved from the pending_changes queue.
    async processQueueItem(item: SyncQueueItem) {
        const { collection, action, data } = item;

        switch (collection) {
            case 'reservations':
                await this.syncReservation(action, data as Reservation);
                break;
            case 'clients':
                await this.syncClient(action, data as Client);
                break;
            case 'expenses':
                await this.syncExpense(action, data as Expense);
                break;
            case 'stock':
                await this.syncStockItem(action, data as StockItem);
                break;
            case 'quickIncomes':
                await this.syncQuickIncome(action, data);
                break;
            case 'investments':
                await this.syncInvestment(action, data);
                break;
            case 'activityLog':
                await this.syncActivityLog(action, data);
                break;
            case 'profits':
                await this.syncProfit(action, data);
                break;
        }
    },

    async syncReservation(action: string, data: Reservation) {
        // Path: businesses/{businessId}/reservations/{id}
        const path = `businesses/${data.businessId}/reservations/${data.id}`;
        const dbRef = ref(database, path);

        if (action === 'create' || action === 'update') {
            await set(dbRef, this.sanitizeForFirebase({ ...data, isDeleted: data.isDeleted ?? false }));
        } else if (action === 'delete') {
            const updates = this.sanitizeForFirebase({ isDeleted: true, deletedAt: serverTimestamp() }); // Soft delete matches database.ts
            await update(dbRef, updates);
        }
    },

    async syncClient(action: string, data: Client) {
        const path = `businesses/${data.businessId}/clients/${data.id}`;
        const dbRef = ref(database, path);

        if (action === 'create' || action === 'update') {
            await set(dbRef, this.sanitizeForFirebase({ ...data, isDeleted: data.isDeleted ?? false }));
        } else if (action === 'delete') {
            const updates = this.sanitizeForFirebase({ isDeleted: true, deletedAt: serverTimestamp() });
            await update(dbRef, updates);
        }
    },

    async syncExpense(action: string, data: any) {
        const path = `businesses/${data.businessId}/expenses/${data.id}`;
        const dbRef = ref(database, path);

        if (action === 'create' || action === 'update') {
            await set(dbRef, this.sanitizeForFirebase({ ...data, isDeleted: data.isDeleted ?? false }));
        } else if (action === 'delete') {
            const updates = this.sanitizeForFirebase({ isDeleted: true, deletedAt: serverTimestamp() });
            await update(dbRef, updates);
        }
    },

    async syncStockItem(action: string, data: StockItem) {
        const path = `businesses/${data.businessId}/stock/${data.id}`;
        const dbRef = ref(database, path);

        if (action === 'create' || action === 'update') {
            await set(dbRef, this.sanitizeForFirebase({ ...data, isDeleted: data.isDeleted ?? false }));
        } else if (action === 'delete') {
            const updates = this.sanitizeForFirebase({ isDeleted: true, deletedAt: serverTimestamp() });
            await update(dbRef, updates);
        }
    },

    async syncQuickIncome(action: string, data: QuickIncome) {
        const path = `businesses/${data.businessId}/quickIncomes/${data.id}`;
        const dbRef = ref(database, path);

        if (action === 'create' || action === 'update') {
            await set(dbRef, this.sanitizeForFirebase({ ...data, isDeleted: data.isDeleted ?? false }));
        } else if (action === 'delete') {
            const updates = this.sanitizeForFirebase({ isDeleted: true, deletedAt: serverTimestamp() });
            await update(dbRef, updates);
        }
    },

    async syncInvestment(action: string, data: Investment) {
        const path = `businesses/${data.businessId}/investments/${data.id}`;
        const dbRef = ref(database, path);

        if (action === 'create' || action === 'update') {
            await set(dbRef, this.sanitizeForFirebase({ ...data, isDeleted: data.isDeleted ?? false }));
        } else if (action === 'delete') {
            const updates = this.sanitizeForFirebase({ isDeleted: true, deletedAt: serverTimestamp() });
            await update(dbRef, updates);
        }
    },

    async syncActivityLog(action: string, data: ActivityLogEntry & { businessId: string }) {
        const path = `businesses/${data.businessId}/activityLog/${data.id}`;
        const dbRef = ref(database, path);

        if (action === 'create' || action === 'update') {
            const { businessId, ...logData } = data;
            // When syncing to cloud, we can use serverTimestamp() for the server side
            // but we keep the estimated one if we want to show it immediately.
            // However, Firebase will replace serverTimestamp() with the real thing.
            await set(dbRef, this.sanitizeForFirebase({
                ...logData,
                serverTimestamp: serverTimestamp(),
            }));
        } else if (action === 'delete') {
            // Logs usually aren't deleted by client, but ok
            await remove(dbRef);
        }
    },

    async syncProfit(action: string, data: Profit) {
        const path = `businesses/${data.businessId}/profits/${data.id}`;
        const dbRef = ref(database, path);

        if (action === 'create' || action === 'update') {
            await set(dbRef, this.sanitizeForFirebase({ ...data, isDeleted: data.isDeleted ?? false }));
        } else if (action === 'delete') {
            const updates = this.sanitizeForFirebase({ isDeleted: true, deletedAt: serverTimestamp() });
            await update(dbRef, updates);
        }
    },

    // --- Local Operations (Called by UI) ---

    async createReservation(data: Reservation) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.reservations.put(payload);
        await db.syncQueue.add({ collection: 'reservations', action: 'create', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async updateReservation(data: Reservation) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.reservations.put(payload);
        await db.syncQueue.add({ collection: 'reservations', action: 'update', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async deleteReservation(id: string, businessId: string, workspaceId: string) {
        await db.reservations.delete(id);
        await db.syncQueue.add({
            collection: 'reservations',
            action: 'delete',
            data: { id, businessId, workspaceId },
            timestamp: Date.now()
        });
        this.syncToCloud();
    },

    async createClient(data: Client) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.clients.put(payload);
        await db.syncQueue.add({ collection: 'clients', action: 'create', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async updateClient(data: Client) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.clients.put(payload);
        await db.syncQueue.add({ collection: 'clients', action: 'update', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async deleteClient(id: string, businessId: string) {
        await db.clients.delete(id);
        await db.syncQueue.add({ collection: 'clients', action: 'delete', data: { id, businessId }, timestamp: Date.now() });
        this.syncToCloud();
    },

    async createExpense(data: Expense) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.expenses.put(payload);
        await db.syncQueue.add({ collection: 'expenses', action: 'create', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async updateExpense(data: Expense) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.expenses.put(payload);
        await db.syncQueue.add({ collection: 'expenses', action: 'update', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async deleteExpense(id: string, businessId: string, workspaceId: string) {
        await db.expenses.delete(id);
        await db.syncQueue.add({ collection: 'expenses', action: 'delete', data: { id, businessId, workspaceId }, timestamp: Date.now() });
        this.syncToCloud();
    },

    async createStockItem(data: StockItem) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.stock.put(payload);
        await db.syncQueue.add({ collection: 'stock', action: 'create', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async updateStockItem(data: StockItem) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.stock.put(payload);
        await db.syncQueue.add({ collection: 'stock', action: 'update', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async deleteStockItem(id: string, businessId: string, workspaceId: string) {
        await db.stock.delete(id);
        await db.syncQueue.add({ collection: 'stock', action: 'delete', data: { id, businessId, workspaceId }, timestamp: Date.now() });
        this.syncToCloud();
    },

    async createQuickIncome(data: QuickIncome) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.quickIncomes.put(payload);
        await db.syncQueue.add({ collection: 'quickIncomes', action: 'create', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async updateQuickIncome(data: QuickIncome) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.quickIncomes.put(payload);
        await db.syncQueue.add({ collection: 'quickIncomes', action: 'update', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async deleteQuickIncome(id: string, businessId: string, workspaceId: string) {
        await db.quickIncomes.delete(id);
        await db.syncQueue.add({ collection: 'quickIncomes', action: 'delete', data: { id, businessId, workspaceId }, timestamp: Date.now() });
        this.syncToCloud();
    },

    async createInvestment(data: Investment) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.investments.put(payload);
        await db.syncQueue.add({ collection: 'investments', action: 'create', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async updateInvestment(data: Investment) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.investments.put(payload);
        await db.syncQueue.add({ collection: 'investments', action: 'update', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async deleteInvestment(id: string, businessId: string, workspaceId: string) {
        await db.investments.delete(id);
        await db.syncQueue.add({ collection: 'investments', action: 'delete', data: { id, businessId, workspaceId }, timestamp: Date.now() });
        this.syncToCloud();
    },

    async createActivityLog(data: Omit<ActivityLogEntry, 'id' | 'deviceTimestamp' | 'serverTimestamp'> & { id?: string, businessId: string }) {
        const { id, ...rest } = data;
        const logEntry: ActivityLogEntry = {
            id: id || uuidv4(),
            ...rest,
            deviceTimestamp: Date.now(),
            serverTimestamp: getEstimatedServerTime(),
        };
        await db.activityLog.put(logEntry);
        await db.syncQueue.add({
            collection: 'activityLog',
            action: 'create',
            data: logEntry,
            timestamp: Date.now()
        });
        this.syncToCloud();
    },

    async createProfit(data: Profit) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.profits.put(payload);
        await db.syncQueue.add({ collection: 'profits', action: 'create', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async updateProfit(data: Profit) {
        const payload = { ...data, isDeleted: data.isDeleted ?? false };
        await db.profits.put(payload);
        await db.syncQueue.add({ collection: 'profits', action: 'update', data: payload, timestamp: Date.now() });
        this.syncToCloud();
    },

    async deleteProfit(id: string, businessId: string, workspaceId: string) {
        await db.profits.delete(id);
        await db.syncQueue.add({
            collection: 'profits',
            action: 'delete',
            data: { id, businessId, workspaceId },
            timestamp: Date.now()
        });
        this.syncToCloud();
    }
};

// Hook to listen for online status and trigger sync
if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
        console.log('Online! Syncing data and images...');

        // Sync regular data
        syncService.syncToCloud();

        // Sync images in background
        try {
            await localImageService.processUploadQueue();
            console.log('Image upload queue processed');
        } catch (error) {
            console.error('Error processing image upload queue:', error);
        }
    });

    // Trigger on first load if online
    if (navigator.onLine) {
        syncService.syncToCloud();
    }

    // Register callback for image service to trigger sync after background uploads
    localImageService.onSyncRequired = () => {
        console.log('[Sync] Image processing complete, triggering data sync to cloud...');
        syncService.syncToCloud();
    };
}
