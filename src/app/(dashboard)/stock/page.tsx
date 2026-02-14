
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Edit, Trash2, Package, TrendingDown, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import type { StockItem } from "@/lib/types";
import { deletionService } from "@/lib/deletion-service";
import { AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { useLoading } from "@/providers/loading-provider";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { syncService } from "@/lib/sync-service";

import { v4 as uuidv4 } from 'uuid';
import { useOfflineWriteGuard } from "@/hooks/use-offline-write-guard";
import { CloudOff } from "lucide-react";

const adjustStockSchema = z.object({
  quantity: z.coerce.number().positive({ message: "La quantité doit être un nombre positif." }),
});
type AdjustStockFormValues = z.infer<typeof adjustStockSchema>;

export default function StockPage() {
  const { isAdmin, currentUser, businessId, loading: authLoading, activeWorkspaceId } = useAuth();
  const { toast } = useToast();
  const { showLoader, hideLoader, isLoading } = useLoading();
  // Removed explicit state for stockItems as we use useLiveQuery
  const [filteredItems, setFilteredItems] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const { checkWritePermission, OfflineGuardModal, isReadOnlyMode } = useOfflineWriteGuard();

  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const adjustForm = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: {
      quantity: 0,
    },
  });

  // Automatically fetch items from local DB
  const stockItems = useLiveQuery(
    () => {
      if (!activeWorkspaceId) return [];
      return db.stock.where('workspaceId').equals(activeWorkspaceId).toArray();
    },
    [activeWorkspaceId]
  ) || [];

  // Initial Sync
  useEffect(() => {
    async function init() {
      if (businessId && activeWorkspaceId) {
        try {
          await syncService.initialSync(businessId, activeWorkspaceId);
        } catch (err) {
          console.error("Initial sync failed", err);
        }
      }
    }
    if (!authLoading && activeWorkspaceId) {
      init();
    }
  }, [authLoading, activeWorkspaceId, businessId]);

  useEffect(() => {
    if (!stockItems) return;
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = stockItems.filter(item =>
      item.name.toLowerCase().includes(lowerSearchTerm) ||
      item.unit.toLowerCase().includes(lowerSearchTerm)
    );
    setFilteredItems(filtered);
  }, [searchTerm, stockItems]);

  const handleDelete = async (item: StockItem) => {
    if (!currentUser?.uid || !businessId) return;
    if (!checkWritePermission()) return;

    setItemToDelete(item);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !currentUser?.uid || !businessId || !currentUser.displayName || !activeWorkspaceId) return;

    showLoader();
    try {
      const result = await deletionService.deleteStockItem(
        itemToDelete.id,
        businessId,
        activeWorkspaceId,
        currentUser.displayName,
        currentUser.uid
      );

      if (result.success) {
        toast({ title: "Article supprimé", description: "L'article a été déplacé vers la corbeille." });
        setIsDeleteConfirmOpen(false);
        setItemToDelete(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Impossible de supprimer", description: error.message });
    } finally {
      hideLoader();
    }
  };

  const openAdjustDialog = (item: StockItem) => {
    if (!checkWritePermission()) return;
    setSelectedItem(item);
    adjustForm.reset();
    setIsAdjustDialogOpen(true);
  };

  const handleAdjustStock = async (values: AdjustStockFormValues, adjustmentType: 'use' | 'add') => {
    if (!selectedItem || !currentUser?.uid || !currentUser.displayName || !businessId) return;
    if (!checkWritePermission()) return;

    const quantityChange = adjustmentType === 'use' ? -values.quantity : values.quantity;
    const newQuantity = selectedItem.currentQuantity + quantityChange;

    showLoader();
    try {
      const updatedItem: StockItem = {
        ...selectedItem,
        currentQuantity: newQuantity,
        updatedAt: Date.now(),
        updatedBy: currentUser.displayName
      };

      await syncService.updateStockItem(updatedItem);

      await syncService.createActivityLog({
        id: uuidv4(),
        workspaceId: selectedItem.workspaceId,
        businessId: businessId,
        timestamp: Date.now(),
        actorUid: currentUser.uid,
        actorDisplayName: currentUser.displayName,
        action: adjustmentType === 'use' ? `Utilisation de stock: ${selectedItem.name}` : `Ajout de stock: ${selectedItem.name}`,
        details: {
          quantityChanged: quantityChange,
          newQuantity: newQuantity,
          reason: "Ajustement manuel"
        }
      });

      toast({
        title: "Stock mis à jour !",
        description: `La quantité de ${selectedItem.name} a été ajustée.`,
      });
      setIsAdjustDialogOpen(false);
      // useLiveQuery handles update
    } catch (error: any) {
      toast({ variant: "destructive", title: "Échec de l'ajustement", description: error.message });
    } finally {
      hideLoader();
    }
  };

  return (
    <div className="space-y-8">
      <OfflineGuardModal />
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold tracking-tight">Gestion de Stock</h1>
        <div className="flex gap-2 items-center">
          {isReadOnlyMode && (
            <div className="flex items-center px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800">
              <CloudOff className="w-4 h-4 mr-2" />
              Lecture Seule
            </div>
          )}
          <Button asChild onClick={(e) => { if (!checkWritePermission()) e.preventDefault(); }}>
            <Link href="/stock/new" onClick={(e) => { if (!checkWritePermission()) { e.preventDefault(); return; } showLoader(); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un article
            </Link>
          </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><Package /> Inventaire</CardTitle>
          <CardDescription>Suivez les quantités de vos produits et articles en stock.</CardDescription>
          <div className="relative pt-4">
            <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un article..."
              className="pl-8 w-full sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Quantité Actuelle</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Seuil Bas</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const isLowStock = item.currentQuantity <= item.lowStockThreshold;
                    return (
                      <TableRow key={item.id} className={cn(isLowStock && "bg-destructive/10 hover:bg-destructive/20")}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="font-bold text-lg">{item.currentQuantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.lowStockThreshold}</TableCell>
                        <TableCell>
                          {isLowStock ? (
                            <Badge variant="destructive" className="items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Stock Bas
                            </Badge>
                          ) : (
                            <Badge variant="secondary">En Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => openAdjustDialog(item)} disabled={isLoading}>Ajuster</Button>
                          <Button variant="ghost" size="icon" asChild disabled={isLoading}>
                            <Link href={`/stock/${item.id}/edit`} onClick={showLoader}><Edit className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={!isAdmin || isLoading} onClick={() => handleDelete(item)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Aucun article en stock.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuster le stock de "{selectedItem?.name}"</DialogTitle>
            <DialogDescription>
              Quantité actuelle : {selectedItem?.currentQuantity} {selectedItem?.unit}.
            </DialogDescription>
          </DialogHeader>
          <Form {...adjustForm}>
            <form className="space-y-4 py-4">
              <FormField
                control={adjustForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantité à ajouter ou retirer</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Ex: 5"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="grid grid-cols-2 gap-2 sm:space-x-0">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={adjustForm.handleSubmit(values => handleAdjustStock(values, 'use'))}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <TrendingDown />}
                  <span className="ml-2">Utiliser du stock</span>
                </Button>
                <Button
                  type="button"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={adjustForm.handleSubmit(values => handleAdjustStock(values, 'add'))}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <TrendingUp />}
                  <span className="ml-2">Ajouter au stock</span>
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer cet article ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer <strong>{itemToDelete?.name}</strong>.
              <br /><br />
              <span className="text-destructive font-medium">Attention:</span> Si cet article est utilisé dans des réservations actives, la suppression sera bloquée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
