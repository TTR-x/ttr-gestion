"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/auth-provider';
import { ref, onValue, remove, update, query, limitToLast } from 'firebase/database';
import { auth, database } from '@/lib/firebase/config';
import { Laptop, Smartphone, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { syncService } from '@/lib/sync-service';

interface Device {
    id: string;
    name: string;
    status: 'online' | 'offline';
    lastSeen: number;
    userAgent: string;
}

export default function AdminSyncPage() {
    const { businessId, isAdmin } = useAuth();
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        if (!businessId) return;

        // Devices Listener
        const devicesRef = ref(database, `businesses/${businessId}/devices`);
        const unsubscribeDevices = onValue(devicesRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const deviceList = Object.values(data) as Device[];
                deviceList.sort((a, b) => {
                    if (a.status === 'online' && b.status !== 'online') return -1;
                    if (a.status !== 'online' && b.status === 'online') return 1;
                    return b.lastSeen - a.lastSeen;
                });
                setDevices(deviceList);
            } else {
                setDevices([]);
            }
            setLoading(false);
        });



        // History Listener
        // We want the last 50 attempts
        const historyRef = query(ref(database, `businesses/${businessId}/connection_history`), limitToLast(50));
        const unsubscribeHistory = onValue(historyRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
                // Sort by id/key usually gives chronological order for push(), so reverse for newest first
                list.reverse();
                setHistory(list);
            } else {
                setHistory([]);
            }
        });

        return () => {
            unsubscribeDevices();
            unsubscribeHistory();
        };
    }, [businessId]);



    const handleKickClick = (deviceId: string) => {
        setSelectedDevice(deviceId);
        setPassword("");
        setShowPasswordDialog(true);
    };

    const confirmKickDevice = async () => {
        if (!selectedDevice || !password) return;
        setIsVerifying(true);
        try {
            const user = auth.currentUser;
            if (!user || !user.email) throw new Error("Utilisateur non connecté");

            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);

            await remove(ref(database, `businesses/${businessId}/devices/${selectedDevice}`));
            toast({ title: "Appareil supprimé", description: "L'appareil a été déconnecté avec succès." });
            setShowPasswordDialog(false);
        } catch (error: any) {
            console.error("Erreur kick:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast({ variant: "destructive", title: "Mot de passe incorrect", description: "Veuillez réessayer." });
            } else {
                toast({ variant: "destructive", title: "Erreur", description: "Impossible de vérifier le mot de passe." });
            }
        } finally {
            setIsVerifying(false);
        }
    };

    if (!isAdmin) {
        return <div className="p-8 text-center">Accès réservé aux administrateurs.</div>;
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Centre de Synchronisation</h1>
                    <p className="text-muted-foreground">Gérez les appareils connectés et les synchronisations.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Device Monitor */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>Appareils Connectés</span>
                            <Badge variant="outline">{devices.filter(d => d.status === 'online').length} En ligne</Badge>
                        </CardTitle>
                        <CardDescription>
                            Liste des appareils ayant accès à votre base de données.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p>Chargement...</p>
                        ) : devices.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucun appareil détecté.</p>
                        ) : (
                            <div className="space-y-4">
                                {devices.map((device) => (
                                    <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {device.userAgent.toLowerCase().includes('mobile') ? (
                                                <Smartphone className="h-5 w-5 text-muted-foreground" />
                                            ) : (
                                                <Laptop className="h-5 w-5 text-muted-foreground" />
                                            )}
                                            <div>
                                                <p className="font-medium text-sm flex items-center gap-2">
                                                    {device.name || "Appareil Inconnu"}
                                                    {device.status === 'online' && (
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {device.status === 'online' ? 'Actuellement en ligne' : `Vu ${formatDistanceToNow(device.lastSeen, { addSuffix: true, locale: fr })}`}
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleKickClick(device.id)} className="text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending Changes - EN DÉVELOPPEMENT */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>Validations en Attente</span>
                            <Badge variant="secondary">En développement</Badge>
                        </CardTitle>
                        <CardDescription>
                            Fonctionnalité en cours de développement pour valider les modifications offline.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg">
                            <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="font-medium">Bientôt disponible</p>
                            <p className="text-xs text-muted-foreground">Cette fonctionnalité sera activée prochainement.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Connection History */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Historique de Sécurité</CardTitle>
                        <CardDescription>
                            Journal des tentatives de connexion récentes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {history.length === 0 ? <p className="text-sm">Aucun historique.</p> : history.map((entry: any) => (
                                <div key={entry.id} className="flex justify-between items-center p-2 border-b last:border-0">
                                    <div className="flex items-center gap-2">
                                        {entry.status === 'blocked' ? (
                                            <Badge variant="destructive">Bloqué</Badge>
                                        ) : entry.status === 'connected' ? (
                                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">Admin/Auth</Badge>
                                        ) : (
                                            <Badge variant="secondary">Tentative</Badge>
                                        )}
                                        <div className="text-sm">
                                            <p className="font-medium">{entry.deviceName}</p>
                                            <p className="text-xs text-muted-foreground">{entry.deviceId}</p>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                        <p>{entry.timestamp ? formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: fr }) : '...'}</p>
                                        {entry.reason && <p className="text-destructive">{entry.reason}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmation requise</DialogTitle>
                        <DialogDescription>
                            Veuillez entrer votre mot de passe pour confirmer la déconnexion de cet appareil.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Votre mot de passe actuel"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Annuler</Button>
                        <Button variant="destructive" onClick={confirmKickDevice} disabled={isVerifying || !password}>
                            {isVerifying ? "Vérification..." : "Déconnecter l'appareil"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
