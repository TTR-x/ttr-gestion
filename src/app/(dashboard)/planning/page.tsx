
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar, List, CheckCircle, Clock, Truck, DollarSign, GripVertical, AlertTriangle, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { getPlanningItems as fetchPlanningItems, deletePlanningItem } from "@/lib/firebase/database";
import type { PlanningItem } from "@/lib/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useLoading } from "@/providers/loading-provider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";


const statusConfig: Record<PlanningItem['status'], { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "En attente", icon: Clock, color: "text-yellow-500" },
  completed: { label: "Terminé", icon: CheckCircle, color: "text-green-500" },
  cancelled: { label: "Annulé", icon: AlertTriangle, color: "text-red-500" },
};

const typeConfig: Record<PlanningItem['type'], { label: string; icon: React.ElementType }> = {
  task: { label: "Tâche", icon: GripVertical },
  payment: { label: "Paiement", icon: DollarSign },
  delivery: { label: "Livraison", icon: Truck },
  appointment: { label: "Rendez-vous", icon: Calendar },
  other: { label: "Autre", icon: List },
};


export default function PlanningPage() {
  const { isAdmin, currentUser, businessId, loading: authLoading, activeWorkspaceId } = useAuth();
  const { toast } = useToast();
  const { showLoader, isLoading } = useLoading();
  const [planningItems, setPlanningItems] = useState<PlanningItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadItems = useCallback(async () => {
    if (!currentUser || !businessId || !activeWorkspaceId) return;
    setLoadingData(true);
    try {
      const fetchedData = await fetchPlanningItems(businessId, activeWorkspaceId);
      setPlanningItems(fetchedData?.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || []);
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les éléments de planification." });
    } finally {
      setLoadingData(false);
    }
  }, [currentUser, businessId, activeWorkspaceId, toast]);

  useEffect(() => {
    if (!authLoading) loadItems();
  }, [authLoading, loadItems]);

  const handleDelete = async (item: PlanningItem) => {
    if (!isAdmin || !currentUser?.uid || !businessId) return;
    showLoader();
    try {
      await deletePlanningItem(businessId, item.id, currentUser.uid, isAdmin, item.workspaceId);
      toast({ title: "Élément supprimé", description: `L'élément "${item.title}" a été déplacé vers la corbeille.` });
      await loadItems();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Échec", description: error.message });
    }
  };

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const startingDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 0 (Lundi) to 6 (Dimanche)

  const changeMonth = (amount: number) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold tracking-tight">Planification</h1>
        <Button asChild onClick={showLoader}>
          <Link href="/planning/new"><PlusCircle className="mr-2 h-4 w-4" /> Planifier un élément</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="capitalize">{format(currentMonth, 'MMMM yyyy', { locale: fr })}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => changeMonth(-1)}>Préc.</Button>
              <Button variant="outline" onClick={() => changeMonth(1)}>Suiv.</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingData ? <Skeleton className="h-96 w-full" /> : (
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => <div key={day} className="font-bold text-muted-foreground p-2">{day}</div>)}
              {Array.from({ length: startingDayIndex }).map((_, i) => <div key={`empty-${i}`} className="border rounded-md bg-muted/20" />)}
              {daysInMonth.map(day => {
                const itemsForDay = planningItems.filter(item => isSameDay(new Date(item.date), day));
                return (
                  <div key={day.toString()} className={cn("border rounded-md p-2 h-28 flex flex-col relative overflow-hidden", isToday(day) ? "bg-primary/10 border-primary" : "bg-card")}>
                    <span className={cn("font-bold", isToday(day) && "text-primary")}>{format(day, 'd')}</span>
                    <div className="mt-1 space-y-1 overflow-y-auto text-left text-xs">
                      {itemsForDay.map(item => {
                        const TypeIcon = typeConfig[item.type].icon;
                        return (
                          <div key={item.id} className="flex items-center gap-1.5 p-1 rounded bg-secondary/50">
                            <TypeIcon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Éléments Planifiés</CardTitle>
          <CardDescription>Vue détaillée de toutes vos tâches, paiements et livraisons à venir.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Date d'échéance</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingData ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : planningItems.length > 0 ? (
                planningItems.map(item => {
                  const TypeIcon = typeConfig[item.type].icon;
                  const StatusIcon = statusConfig[item.status].icon;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        {item.title}
                        {item.reminderEnabled && <Bell className="h-3 w-3 text-primary" />}
                      </TableCell>
                      <TableCell>{format(new Date(item.date), 'dd MMMM yyyy', { locale: fr })}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1.5 w-fit">
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig[item.type].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'completed' ? 'default' : 'secondary'} className={cn("flex items-center gap-1.5 w-fit", statusConfig[item.status].color)}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[item.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive" disabled={!isAdmin || isLoading}><span className="sr-only">Supprimer</span></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cet élément ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action déplacera "{item.title}" vers la corbeille.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item)}>Confirmer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Aucun élément planifié pour le moment.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
