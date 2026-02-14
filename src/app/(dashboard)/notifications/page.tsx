
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, Trash2, ArrowLeft } from "lucide-react";
import { useAuth } from '@/providers/auth-provider';
import Link from 'next/link';
import { useLoading } from '@/providers/loading-provider';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function NotificationsPage() {
    const { notifications, markAsRead, clearNotifications } = useAuth();
    const { showLoader } = useLoading();
    
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/overview" onClick={showLoader}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-3xl font-headline font-semibold tracking-tight">Centre de Notifications</h1>
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Vos notifications</CardTitle>
                    <CardDescription>Retrouvez ici tous les messages, alertes et rappels importants.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-end gap-2 mb-4">
                        <Button variant="outline" size="sm" onClick={() => markAsRead('all')} disabled={notifications.every(n => n.read)}>
                            <Check className="mr-2 h-4 w-4" /> Tout marquer comme lu
                        </Button>
                        <Button variant="destructive" size="sm" onClick={clearNotifications} disabled={notifications.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" /> Tout effacer
                        </Button>
                    </div>
                    <Separator />
                    <ul className="space-y-4 mt-4">
                        {notifications.length > 0 ? (
                            notifications.map(notification => (
                                <li key={notification.id} className={cn("p-4 rounded-lg flex items-start gap-4 transition-colors", notification.read ? "bg-secondary/30" : "bg-primary/10")}>
                                     <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1", notification.read ? "bg-muted" : "bg-primary")}>
                                        <Bell className={cn("h-5 w-5", notification.read ? "text-muted-foreground" : "text-primary-foreground")} />
                                    </div>
                                    <div className="flex-grow">
                                        <Link href={notification.href || "#"} className="hover:underline">
                                            <p className={cn("font-semibold", notification.read && "text-muted-foreground")}>{notification.title}</p>
                                            <p className="text-sm text-muted-foreground">{notification.description}</p>
                                        </Link>
                                    </div>
                                     {!notification.read && (
                                        <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                                            Marquer comme lu
                                        </Button>
                                    )}
                                </li>
                            ))
                        ) : (
                             <div className="text-center py-16 text-muted-foreground">
                                <Bell className="mx-auto h-12 w-12 mb-2" />
                                <p>Votre centre de notifications est vide.</p>
                            </div>
                        )}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
