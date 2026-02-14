import { db } from './db';
import { syncService } from './sync-service';
import { v4 as uuidv4 } from 'uuid';
import type {
    DeletionResult,
    DeletionHistory,
    Client,
    Reservation,
    StockItem,
    Expense,
    Investment,
    QuickIncome
} from './types';

/**
 * Centralized Deletion Service
 * Handles intelligent cascade deletion with automatic calculations
 */
class DeletionService {
    /**
     * Delete a client and all related entities (reservations, quick incomes)
     * Calculates total payments and creates deletion history
     */
    async deleteClient(
        clientId: string,
        businessId: string,
        workspaceId: string,
        currentUserDisplayName: string,
        currentUserUid: string
    ): Promise<DeletionResult> {
        try {
            // 1. Get client data
            const client = await db.clients.get(clientId);
            if (!client) {
                throw new Error('Client introuvable');
            }

            // 2. Get all client reservations (not already deleted)
            const reservations = await db.reservations
                .where('clientId')
                .equals(clientId)
                .and(r => !r.isDeleted)
                .toArray();

            // 3. Calculate total payments from reservations
            let totalPayments = 0;
            reservations.forEach(res => {
                if (res.amountPaid) {
                    totalPayments += res.amountPaid;
                }
            });

            // 4. Get quick incomes for this client
            const quickIncomes = await db.quickIncomes
                .where('clientId')
                .equals(clientId)
                .and(q => !q.isDeleted)
                .toArray();

            // Add quick incomes to total
            quickIncomes.forEach(qi => {
                totalPayments += qi.amount;
            });

            // 5. Mark client as deleted
            await syncService.deleteClient(clientId, businessId);

            // 6. Mark all reservations as deleted and restore stock
            for (const res of reservations) {
                await syncService.deleteReservation(res.id, businessId, workspaceId);
                if (res.items && res.items.length > 0) {
                    await this.restoreStockFromItems(res.items, currentUserDisplayName);
                }
            }

            // 7. Mark all quick incomes as deleted and restore stock
            for (const qi of quickIncomes) {
                await syncService.deleteQuickIncome(qi.id, businessId, workspaceId);
                if (qi.description.startsWith('Vente:')) {
                    await this.restoreStockFromQuickIncome(qi, currentUserDisplayName);
                }
            }

            // 8. Create deletion history
            const historyEntry: DeletionHistory = {
                id: uuidv4(),
                workspaceId,
                businessId,
                entityType: 'client',
                entityId: clientId,
                entityName: client.name,
                deletedBy: currentUserDisplayName,
                deletedByUid: currentUserUid,
                deletedAt: Date.now(),
                affectedEntities: [
                    { type: 'reservations', ids: reservations.map(r => r.id), action: 'deleted' },
                    { type: 'quickIncomes', ids: quickIncomes.map(q => q.id), action: 'deleted' }
                ],
                calculations: {
                    totalPaymentsDeducted: totalPayments
                },
                canRestore: true
            };

            await db.deletionHistory.add(historyEntry);

            return {
                success: true,
                affectedEntities: [
                    { type: 'client', ids: [clientId], action: 'deleted' },
                    { type: 'reservations', ids: reservations.map(r => r.id), action: 'deleted' },
                    { type: 'quickIncomes', ids: quickIncomes.map(q => q.id), action: 'deleted' }
                ],
                calculations: {
                    treasuryAdjustment: -totalPayments
                }
            };
        } catch (error: any) {
            console.error('Error deleting client:', error);
            return {
                success: false,
                affectedEntities: [],
                calculations: {},
                error: error.message || 'Erreur lors de la suppression du client'
            };
        }
    }

    /**
     * Delete a reservation and deduct payments from treasury
     */
    async deleteReservation(
        reservationId: string,
        businessId: string,
        workspaceId: string,
        currentUserDisplayName: string,
        currentUserUid: string
    ): Promise<DeletionResult> {
        try {
            const reservation = await db.reservations.get(reservationId);
            if (!reservation) {
                throw new Error('Réservation introuvable');
            }

            // Calculate total payments
            const totalPayments = reservation.amountPaid || 0;

            // Mark as deleted
            await syncService.deleteReservation(reservationId, businessId, workspaceId);

            // Create history
            const historyEntry: DeletionHistory = {
                id: uuidv4(),
                workspaceId,
                businessId,
                entityType: 'reservation',
                entityId: reservationId,
                entityName: `Réservation ${reservation.guestName}`,
                deletedBy: currentUserDisplayName,
                deletedByUid: currentUserUid,
                deletedAt: Date.now(),
                affectedEntities: [],
                calculations: {
                    paymentsDeducted: totalPayments
                },
                canRestore: true
            };

            await db.deletionHistory.add(historyEntry);

            // 5. Restore Stock
            if (reservation.items && reservation.items.length > 0) {
                await this.restoreStockFromItems(reservation.items, currentUserDisplayName);
            }

            return {
                success: true,
                affectedEntities: [
                    { type: 'reservation', ids: [reservationId], action: 'deleted' }
                ],
                calculations: {
                    treasuryAdjustment: -totalPayments
                }
            };
        } catch (error: any) {
            console.error('Error deleting reservation:', error);
            return {
                success: false,
                affectedEntities: [],
                calculations: {},
                error: error.message || 'Erreur lors de la suppression de la réservation'
            };
        }
    }

    /**
     * Delete a stock item (with validation to prevent deleting items in use)
     */
    async deleteStockItem(
        stockId: string,
        businessId: string,
        workspaceId: string,
        currentUserDisplayName: string,
        currentUserUid: string
    ): Promise<DeletionResult> {
        try {
            const stockItem = await db.stock.get(stockId);
            if (!stockItem) {
                throw new Error('Article de stock introuvable');
            }

            // Check if stock item is used in active reservations
            const activeReservations = await db.reservations
                .where('workspaceId')
                .equals(workspaceId)
                .and(r => !r.isDeleted)
                .toArray();

            const usedInReservations = activeReservations.filter(res =>
                res.items?.some(item => item.name === stockItem.name && item.type === 'stock')
            );

            if (usedInReservations.length > 0) {
                throw new Error(
                    `Cet article est utilisé dans ${usedInReservations.length} réservation(s) active(s). ` +
                    `Veuillez d'abord supprimer ou modifier ces réservations.`
                );
            }

            // Mark as deleted
            await syncService.deleteStockItem(stockId, businessId, workspaceId);

            // Create history
            const historyEntry: DeletionHistory = {
                id: uuidv4(),
                workspaceId,
                businessId,
                entityType: 'stock',
                entityId: stockId,
                entityName: stockItem.name,
                deletedBy: currentUserDisplayName,
                deletedByUid: currentUserUid,
                deletedAt: Date.now(),
                affectedEntities: [],
                calculations: {},
                canRestore: true
            };

            await db.deletionHistory.add(historyEntry);

            return {
                success: true,
                affectedEntities: [
                    { type: 'stock', ids: [stockId], action: 'deleted' }
                ],
                calculations: {}
            };
        } catch (error: any) {
            console.error('Error deleting stock item:', error);
            return {
                success: false,
                affectedEntities: [],
                calculations: {},
                error: error.message || 'Erreur lors de la suppression de l\'article'
            };
        }
    }

    /**
     * Delete an expense
     */
    async deleteExpense(
        expenseId: string,
        businessId: string,
        workspaceId: string,
        currentUserDisplayName: string,
        currentUserUid: string
    ): Promise<DeletionResult> {
        try {
            const expense = await db.expenses.get(expenseId);
            if (!expense) {
                throw new Error('Dépense introuvable');
            }

            await syncService.deleteExpense(expenseId, businessId, workspaceId);

            const historyEntry: DeletionHistory = {
                id: uuidv4(),
                workspaceId,
                businessId,
                entityType: 'expense',
                entityId: expenseId,
                entityName: expense.itemName,
                deletedBy: currentUserDisplayName,
                deletedByUid: currentUserUid,
                deletedAt: Date.now(),
                affectedEntities: [],
                calculations: {
                    treasuryAdjustment: expense.amount // Expense deletion adds back to treasury
                },
                canRestore: true
            };

            await db.deletionHistory.add(historyEntry);

            return {
                success: true,
                affectedEntities: [
                    { type: 'expense', ids: [expenseId], action: 'deleted' }
                ],
                calculations: {
                    treasuryAdjustment: expense.amount
                }
            };
        } catch (error: any) {
            console.error('Error deleting expense:', error);
            return {
                success: false,
                affectedEntities: [],
                calculations: {},
                error: error.message || 'Erreur lors de la suppression de la dépense'
            };
        }
    }

    /**
     * Delete an investment
     */
    async deleteInvestment(
        investmentId: string,
        businessId: string,
        workspaceId: string,
        currentUserDisplayName: string,
        currentUserUid: string
    ): Promise<DeletionResult> {
        try {
            const investment = await db.investments.get(investmentId);
            if (!investment) {
                throw new Error('Investissement introuvable');
            }

            await syncService.deleteInvestment(investmentId, businessId, workspaceId);

            const historyEntry: DeletionHistory = {
                id: uuidv4(),
                workspaceId,
                businessId,
                entityType: 'investment',
                entityId: investmentId,
                entityName: investment.name,
                deletedBy: currentUserDisplayName,
                deletedByUid: currentUserUid,
                deletedAt: Date.now(),
                affectedEntities: [],
                calculations: {
                    treasuryAdjustment: investment.initialAmount
                },
                canRestore: true
            };

            await db.deletionHistory.add(historyEntry);

            return {
                success: true,
                affectedEntities: [
                    { type: 'investment', ids: [investmentId], action: 'deleted' }
                ],
                calculations: {
                    treasuryAdjustment: investment.initialAmount
                }
            };
        } catch (error: any) {
            console.error('Error deleting investment:', error);
            return {
                success: false,
                affectedEntities: [],
                calculations: {},
                error: error.message || 'Erreur lors de la suppression de l\'investissement'
            };
        }
    }

    /**
     * Delete a quick income
     */
    async deleteQuickIncome(
        incomeId: string,
        businessId: string,
        workspaceId: string,
        currentUserDisplayName: string,
        currentUserUid: string
    ): Promise<DeletionResult> {
        try {
            const income = await db.quickIncomes.get(incomeId);
            if (!income) {
                throw new Error('Vente rapide introuvable');
            }

            await syncService.deleteQuickIncome(incomeId, businessId, workspaceId);

            const historyEntry: DeletionHistory = {
                id: uuidv4(),
                workspaceId,
                businessId,
                entityType: 'quickIncome',
                entityId: incomeId,
                entityName: income.description || 'Vente rapide',
                deletedBy: currentUserDisplayName,
                deletedByUid: currentUserUid,
                deletedAt: Date.now(),
                affectedEntities: [],
                calculations: {
                    treasuryAdjustment: -income.amount
                },
                canRestore: true
            };

            await db.deletionHistory.add(historyEntry);

            // 5. Restore Stock if it's a sale
            if (income.description.startsWith('Vente:')) {
                await this.restoreStockFromQuickIncome(income, currentUserDisplayName);
            }

            return {
                success: true,
                affectedEntities: [
                    { type: 'quickIncome', ids: [incomeId], action: 'deleted' }
                ],
                calculations: {
                    treasuryAdjustment: -income.amount
                }
            };
        } catch (error: any) {
            console.error('Error deleting quick income:', error);
            return {
                success: false,
                affectedEntities: [],
                calculations: {},
                error: error.message || 'Erreur lors de la suppression de la vente rapide'
            };
        }
    }

    /**
     * Restore a deleted entity and all its related entities
     */
    async restore(
        entityType: string,
        entityId: string,
        businessId: string,
        workspaceId: string,
        currentUserDisplayName: string,
        currentUserUid: string
    ): Promise<DeletionResult> {
        try {
            // Get deletion history
            const history = await db.deletionHistory
                .where('entityId')
                .equals(entityId)
                .and(h => h.canRestore)
                .first();

            if (!history) {
                // Allow force restore even if history is missing/inactive?
                // For now, require history.
                throw new Error('Aucun historique de suppression trouvé ou restauration impossible');
            }

            // Restore main entity
            switch (entityType) {
                case 'client':
                    const client = await db.clients.get(entityId);
                    if (client) {
                        await syncService.updateClient({
                            ...client,
                            isDeleted: false,
                            deletedAt: null
                        });
                    }

                    // Restore related reservations
                    const reservationIds = history.affectedEntities.find(e => e.type === 'reservations')?.ids || [];
                    for (const resId of reservationIds) {
                        const res = await db.reservations.get(resId);
                        if (res) {
                            await syncService.updateReservation({
                                ...res,
                                isDeleted: false,
                                deletedAt: null
                            });
                        }
                    }

                    // Restore quick incomes
                    const qiIds = history.affectedEntities.find(e => e.type === 'quickIncomes')?.ids || [];
                    for (const qiId of qiIds) {
                        const qi = await db.quickIncomes.get(qiId);
                        if (qi) {
                            await syncService.updateQuickIncome({
                                ...qi,
                                isDeleted: false,
                                deletedAt: null
                            });
                        }
                    }
                    break;

                case 'reservation':
                    const res = await db.reservations.get(entityId);
                    if (res) {
                        await syncService.updateReservation({
                            ...res,
                            isDeleted: false,
                            deletedAt: null
                        });
                    }
                    break;

                case 'stock':
                    const stock = await db.stock.get(entityId);
                    if (stock) {
                        await syncService.updateStockItem({
                            ...stock,
                            isDeleted: false,
                            deletedAt: null
                        });
                    }
                    break;

                case 'expense':
                    const expense = await db.expenses.get(entityId);
                    if (expense) {
                        await syncService.updateExpense({
                            ...expense,
                            isDeleted: false,
                            deletedAt: null
                        });
                    }
                    break;

                case 'investment':
                    const investment = await db.investments.get(entityId);
                    if (investment) {
                        await syncService.updateInvestment({
                            ...investment,
                            isDeleted: false,
                            deletedAt: null
                        });
                    }
                    break;

                case 'quickIncome':
                    const qi = await db.quickIncomes.get(entityId);
                    if (qi) {
                        await syncService.updateQuickIncome({
                            ...qi,
                            isDeleted: false,
                            deletedAt: null
                        });
                    }
                    break;

                default:
                    throw new Error('Type d\'entité non supporté');
            }

            // --- RESTORE STOCK LOGIC ---
            // If we are RESTORING a deletion, we need to DEDUCT the stock again if it was a sale
            if (entityType === 'reservation') {
                const res = await db.reservations.get(entityId);
                if (res && res.items) {
                    await this.deductStockFromItems(res.items, currentUserDisplayName);
                }
            } else if (entityType === 'quickIncome') {
                const qi = await db.quickIncomes.get(entityId);
                if (qi && qi.description.startsWith('Vente:')) {
                    await this.deductStockFromQuickIncome(qi, currentUserDisplayName);
                }
            } else if (entityType === 'client') {
                // For client, we need to re-deduct stock for all their reservations
                const reservationIds = history.affectedEntities.find(e => e.type === 'reservations')?.ids || [];
                for (const resId of reservationIds) {
                    const res = await db.reservations.get(resId);
                    if (res && res.items) {
                        await this.deductStockFromItems(res.items, currentUserDisplayName);
                    }
                }
            }

            // Mark history as restored
            await db.deletionHistory.update(history.id, {
                restoredAt: Date.now(),
                restoredBy: currentUserDisplayName,
                restoredByUid: currentUserUid,
                canRestore: false
            });

            return {
                success: true,
                affectedEntities: history.affectedEntities,
                calculations: {
                    // Inverse of deletion calculations
                    treasuryAdjustment: -(history.calculations.treasuryAdjustment || 0),
                    stockAdjustment: history.calculations.stockAdjustment // Inform UI that stock was adjusted
                }
            };
        } catch (error: any) {
            console.error('Error restoring entity:', error);
            return {
                success: false,
                affectedEntities: [],
                calculations: {},
                error: error.message || 'Erreur lors de la restauration'
            };
        }
    }

    /**
     * Private helper to restore stock from reservation items
     */
    private async restoreStockFromItems(items: any[], actorName: string) {
        for (const item of items) {
            if (item.type === 'stock') {
                const stockItem = await db.stock.get(item.id);
                if (stockItem) {
                    await syncService.updateStockItem({
                        ...stockItem,
                        currentQuantity: stockItem.currentQuantity + item.quantity,
                        updatedAt: Date.now(),
                        updatedBy: actorName
                    });
                }
            }
        }
    }

    /**
     * Private helper to restore stock from a quick income (Vente: 2 x Coca)
     */
    private async restoreStockFromQuickIncome(income: QuickIncome, actorName: string) {
        const match = income.description.match(/Vente: (\d+) x (.*)/);
        if (match) {
            const quantity = parseInt(match[1], 10);
            const itemName = match[2];

            // Find stock item by name
            const stockItems = await db.stock.where('name').equals(itemName).toArray();
            if (stockItems.length > 0) {
                const stockItem = stockItems[0];
                await syncService.updateStockItem({
                    ...stockItem,
                    currentQuantity: stockItem.currentQuantity + quantity,
                    updatedAt: Date.now(),
                    updatedBy: actorName
                });
            }
        }
    }

    /**
     * Private helper to deduct stock when restoring a reservation
     */
    private async deductStockFromItems(items: any[], actorName: string) {
        for (const item of items) {
            if (item.type === 'stock') {
                const stockItem = await db.stock.get(item.id);
                if (stockItem) {
                    await syncService.updateStockItem({
                        ...stockItem,
                        currentQuantity: Math.max(0, stockItem.currentQuantity - item.quantity),
                        updatedAt: Date.now(),
                        updatedBy: actorName
                    });
                }
            }
        }
    }

    /**
     * Private helper to deduct stock when restoring a quick income
     */
    private async deductStockFromQuickIncome(income: QuickIncome, actorName: string) {
        const match = income.description.match(/Vente: (\d+) x (.*)/);
        if (match) {
            const quantity = parseInt(match[1], 10);
            const itemName = match[2];

            const stockItems = await db.stock.where('name').equals(itemName).toArray();
            if (stockItems.length > 0) {
                const stockItem = stockItems[0];
                await syncService.updateStockItem({
                    ...stockItem,
                    currentQuantity: Math.max(0, stockItem.currentQuantity - quantity),
                    updatedAt: Date.now(),
                    updatedBy: actorName
                });
            }
        }
    }

    /**
     * Get deletion history for a workspace
     */
    async getDeletionHistory(workspaceId: string): Promise<DeletionHistory[]> {
        return await db.deletionHistory
            .where('workspaceId')
            .equals(workspaceId)
            .reverse()
            .sortBy('deletedAt');
    }

    /**
     * Get deletion preview (what will be affected by deletion)
     */
    async getClientDeletionPreview(clientId: string) {
        const client = await db.clients.get(clientId);
        if (!client) return null;

        const reservations = await db.reservations
            .where('clientId')
            .equals(clientId)
            .and(r => !r.isDeleted)
            .toArray();

        const quickIncomes = await db.quickIncomes
            .where('clientId')
            .equals(clientId)
            .and(q => !q.isDeleted)
            .toArray();

        let totalPayments = 0;
        reservations.forEach(res => {
            if (res.amountPaid) {
                totalPayments += res.amountPaid;
            }
        });
        quickIncomes.forEach(qi => {
            totalPayments += qi.amount;
        });

        return {
            client,
            reservationsCount: reservations.length,
            quickIncomesCount: quickIncomes.length,
            totalPayments
        };
    }
}

export const deletionService = new DeletionService();
