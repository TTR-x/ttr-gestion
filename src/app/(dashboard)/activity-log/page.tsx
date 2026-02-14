
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListFilter, Search, Download, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import type { ActivityLogEntry } from "@/lib/types";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/providers/auth-provider";
import { useLoading } from "@/providers/loading-provider";
import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLogPage() {
  const { currentUser, businessId, loading: authLoading, activeWorkspaceId } = useAuth();
  const { showLoader, hideLoader } = useLoading();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLog, setFilteredLog] = useState<ActivityLogEntry[]>([]);

  const activityLog = useLiveQuery(
    async () => {
      if (!activeWorkspaceId) return [];
      const logs = await db.activityLog.where('workspaceId').equals(activeWorkspaceId).toArray();
      return logs.sort((a, b) => {
        const timeA = a.deviceTimestamp || a.timestamp || 0;
        const timeB = b.deviceTimestamp || b.timestamp || 0;
        return timeB - timeA;
      });
    },
    [activeWorkspaceId]
  );

  const loadingData = activityLog === undefined;

  useEffect(() => {
    const logs = activityLog || [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = logs.filter(log =>
    (log.actorDisplayName?.toLowerCase().includes(lowerSearchTerm) ||
      log.actorUid?.toLowerCase().includes(lowerSearchTerm) ||
      log.action?.toLowerCase().includes(lowerSearchTerm))
    );
    setFilteredLog(filtered);
  }, [searchTerm, activityLog]);

  const renderDetailValue = (value: any): React.ReactNode => {
    if (typeof value === 'boolean') {
      return value ? <span className="text-green-600">Oui</span> : <span className="text-red-600">Non</span>;
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return (
        <ul className="list-disc pl-5 mt-1 space-y-1">
          {Object.entries(value).map(([subKey, subValue]) => (
            <li key={subKey} className="text-xs">
              <span className="font-medium capitalize">{subKey.replace(/([A-Z])/g, ' $1')}:</span> {renderDetailValue(subValue)}
            </li>
          ))}
        </ul>
      );
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-muted-foreground italic">Vide</span>;
      return <span className="text-primary">{value.join(', ')}</span>;
    }
    return <span className="text-primary">{String(value)}</span>;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold tracking-tight">Journal d'Activité</h1>
        <Button variant="outline" onClick={() => alert("Fonctionnalité d'exportation à venir.")}>
          <Download className="mr-2 h-4 w-4" /> Exporter le journal
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">Activité du Système</CardTitle>
          <CardDescription>Un enregistrement chronologique de toutes les actions au sein du système.</CardDescription>
          <div className="flex items-center gap-2 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par utilisateur ou action..."
                className="pl-8 w-full sm:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              <ListFilter className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Filtrer</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Heure Locale (Appareil)</TableHead>
                <TableHead className="w-[180px]">Heure Réseau (Serveur)</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingData ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : filteredLog.length > 0 ? (
                filteredLog.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      <div className="font-medium">
                        {(log.deviceTimestamp || log.timestamp) ? format(new Date(log.deviceTimestamp || log.timestamp!), "dd/MM/yyyy") : 'N/A'}
                      </div>
                      <div className="text-muted-foreground">
                        {(log.deviceTimestamp || log.timestamp) ? format(new Date(log.deviceTimestamp || log.timestamp!), "HH:mm:ss") : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {(log.serverTimestamp || log.timestamp) ? (
                        <>
                          <div className="font-medium text-green-600">
                            {format(new Date(log.serverTimestamp || log.timestamp!), "dd/MM/yyyy")}
                          </div>
                          <div className="text-green-600/70">
                            {format(new Date(log.serverTimestamp || log.timestamp!), "HH:mm:ss")}
                          </div>
                        </>
                      ) : (
                        <span className="text-yellow-600 italic">En attente de synchro...</span>
                      )}
                    </TableCell>
                    <TableCell>{log.actorDisplayName || log.actorUid}</TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4 mr-1" /> Voir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Détails de l'action</AlertDialogTitle>
                              <AlertDialogDescription asChild>
                                <div className="text-sm text-foreground max-h-60 overflow-y-auto pr-4 text-left pt-2">
                                  <dl className="space-y-3">
                                    {Object.entries(log.details).map(([key, value]) => (
                                      <div key={key}>
                                        <dt className="font-semibold capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</dt>
                                        <dd className="pl-2">{renderDetailValue(value)}</dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Fermer</AlertDialogCancel>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        'Aucun détail'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Aucune activité enregistrée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
