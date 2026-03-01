"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Gift, Star, Trophy, Sparkles,
    ShoppingBag, Zap, Target,
    Award, Shield, Timer, Users, HardDrive, Plus, Loader2, Upload, Trash2
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { database } from '@/lib/firebase/config';
import { ref, onValue } from 'firebase/database';
import { addGiftToUser, updateGiftStatus, getUsers } from '@/lib/firebase/database';
import { UserGift, User as AppUser } from '@/lib/types';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue
} from "@/components/ui/select";
import { localImageService } from '@/lib/local-image-service';
import { ResolvedImage } from '@/components/ui/resolved-image';

interface Mission {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    requirement: number;
    current: number;
    reward: string;
    type: 'usage' | 'loyalty' | 'growth';
}

export default function GiftsPage() {
    const { businessProfile, currentUser, usageStats, loading, isAdmin, businessId, planDetails } = useAuth();
    const { toast } = useToast();

    const [realtimeGifts, setRealtimeGifts] = useState<UserGift[]>([]);
    const [isAnimating, setIsAnimating] = useState<string | null>(null);
    const [isLoadingGifts, setIsLoadingGifts] = useState(true);

    // Admin state
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [isAddingGift, setIsAddingGift] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [giftImagePreview, setGiftImagePreview] = useState<string | null>(null);
    const [newGift, setNewGift] = useState<Partial<UserGift>>({
        type: 'loyalty',
        title: '',
        description: '',
        rewardText: ''
    });
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    // 1. Listen to user gifts in real-time
    useEffect(() => {
        if (!currentUser?.uid) return;

        const giftsRef = ref(database, `users/${currentUser.uid}/gifts`);
        setIsLoadingGifts(true);

        const unsubscribe = onValue(giftsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const giftsList = Object.keys(data).map(key => ({
                    ...data[key],
                    id: key
                })) as UserGift[];
                setRealtimeGifts(giftsList.sort((a, b) => b.unlockedAt - a.unlockedAt));
            } else {
                setRealtimeGifts([]);
            }
            setIsLoadingGifts(false);
        });

        return () => unsubscribe();
    }, [currentUser?.uid]);

    // 2. Fetch users for admin management
    useEffect(() => {
        if (isAdmin && businessId) {
            getUsers(businessId).then(setAllUsers).catch(console.error);
        }
    }, [isAdmin, businessId]);

    // Calculate account age
    const accountAgeDays = useMemo(() => {
        if (!currentUser?.createdAt) return 0;
        const diff = Date.now() - currentUser.createdAt;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }, [currentUser]);

    const missions: Mission[] = [
        {
            id: 'm1',
            title: "Pionnier du Stock",
            description: "Ajoutez vos premiers articles dans le stock.",
            icon: ShoppingBag,
            requirement: 5,
            current: Math.min(usageStats?.storageUsed ? 10 : 0, 5),
            reward: "10 jetons TRIX",
            type: 'usage'
        },
        {
            id: 'm2',
            title: "Fidélité Mensuelle",
            description: "Utilisez TTR Gestion pendant 30 jours.",
            icon: Timer,
            requirement: 30,
            current: Math.min(accountAgeDays, 30),
            reward: "Badge 'Fidèle'",
            type: 'loyalty'
        },
        {
            id: 'm3',
            title: "Capitaine d'Équipe",
            description: "Ajoutez au moins 2 collaborateurs.",
            icon: Users,
            requirement: 2,
            current: usageStats?.employeeCount || 0,
            reward: "Extension Essai 7j",
            type: 'growth'
        }
    ];

    const handleImageSelectAndUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast({ variant: 'destructive', title: 'Image trop lourde', description: 'Veuillez choisir une image de moins de 5 Mo.' });
            return;
        }

        setIsUploading(true);
        try {
            const localUrl = await localImageService.saveImageLocally(file);
            setGiftImagePreview(localUrl);
            toast({ title: "Image préparée", description: "L'image sera sauvegardée avec le cadeau." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Échec", description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleClaim = async (gift: UserGift) => {
        if (!currentUser?.uid || !businessId) return;

        setIsAnimating(gift.id);
        try {
            await updateGiftStatus(currentUser.uid, gift.id, 'claimed', businessId);

            const phoneNumber = "+22899974389";
            const message = `Bonjour, je veux réclamer mon cadeau : "${gift.title}" (${gift.rewardText}). Mon entreprise est "${businessProfile?.name || 'Inconnue'}".`;
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

            toast({
                title: "Réclamation enregistrée",
                description: "Redirection vers WhatsApp pour finaliser...",
            });

            setTimeout(() => {
                window.open(whatsappUrl, '_blank');
            }, 500);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de réclamer le cadeau."
            });
        } finally {
            setIsAnimating(null);
        }
    };

    const handleAdminAddGift = async () => {
        if (!businessId || !currentUser?.uid || !selectedUserId || !newGift.title) return;

        setIsAddingGift(true);
        try {
            // Resolve to public URL
            const finalImageUrl = giftImagePreview ? await localImageService.getPublicUrl(giftImagePreview) : undefined;

            await addGiftToUser(
                businessId,
                selectedUserId,
                {
                    title: newGift.title!,
                    description: newGift.description || '',
                    rewardText: newGift.rewardText || '',
                    type: newGift.type as any || 'loyalty',
                    imageUrl: finalImageUrl
                },
                currentUser.uid
            );
            toast({ title: "Cadeau envoyé !", description: "L'utilisateur recevra son cadeau en temps réel." });
            setNewGift({ type: 'loyalty', title: '', description: '', rewardText: '' });
            setGiftImagePreview(null);
        } catch (error) {
            toast({ variant: "destructive", title: "Erreur", description: "Échec de l'attribution du cadeau." });
        } finally {
            setIsAddingGift(false);
        }
    };

    const totalXp = useMemo(() => {
        const missionXp = missions.reduce((acc, m) => acc + (Math.min(m.current / m.requirement, 1) * 100), 0);
        return Math.floor(missionXp / missions.length);
    }, [missions]);

    if (loading) return (
        <div className="space-y-6 p-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-40 bg-muted animate-pulse rounded-xl" />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Header Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-black p-8 rounded-3xl border border-white/10 shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-20 transform rotate-12">
                    <Trophy className="h-32 w-32 text-yellow-500" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="h-24 w-24 rounded-2xl bg-gradient-to-tr from-primary to-indigo-400 p-0.5 shadow-lg shadow-primary/20">
                        <div className="h-full w-full rounded-2xl bg-slate-900 flex items-center justify-center">
                            <Gift className="h-10 w-10 text-white animate-bounce-slow" />
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex items-center justify-center md:justify-start gap-4">
                            <h1 className="text-3xl md:text-4xl font-headline font-bold text-white tracking-tight">
                                Mes Cadeaux & Succès
                            </h1>
                            {isAdmin && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                                            <Plus className="h-4 w-4 mr-2" /> Gérer
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>Attribuer un cadeau</DialogTitle>
                                            <DialogDescription>
                                                Envoyez un cadeau personnalisé avec une image.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Utilisateur Cible</Label>
                                                <Select onValueChange={setSelectedUserId}>
                                                    <SelectTrigger><SelectValue placeholder="Choisir un membre" /></SelectTrigger>
                                                    <SelectContent>
                                                        {allUsers.map(u => (
                                                            <SelectItem key={u.uid} value={u.uid}>{u.displayName} ({u.role})</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Image du Cadeau</Label>
                                                <div className="flex items-center gap-4">
                                                    <Input
                                                        id="giftImage"
                                                        type="file"
                                                        className="hidden"
                                                        onChange={handleImageSelectAndUpload}
                                                        accept="image/*"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => document.getElementById('giftImage')?.click()}
                                                        disabled={isUploading}
                                                    >
                                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                                        {giftImagePreview ? "Changer l'image" : "Ajouter une image"}
                                                    </Button>
                                                    {giftImagePreview && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive h-8 w-8"
                                                            onClick={() => setGiftImagePreview(null)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                {giftImagePreview && (
                                                    <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border">
                                                        <ResolvedImage src={giftImagePreview} alt="Preview" fill style={{ objectFit: 'cover' }} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Titre</Label>
                                                <Input value={newGift.title} onChange={e => setNewGift({ ...newGift, title: e.target.value })} placeholder="Ex: Pack de Bienvenue" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Description</Label>
                                                <Input value={newGift.description} onChange={e => setNewGift({ ...newGift, description: e.target.value })} placeholder="Ex: Pour vous remercier..." />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Récompense (Texte)</Label>
                                                <Input value={newGift.rewardText} onChange={e => setNewGift({ ...newGift, rewardText: e.target.value })} placeholder="Ex: +10 questions TRIX" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Type</Label>
                                                <Select value={newGift.type} onValueChange={(v: any) => setNewGift({ ...newGift, type: v })}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="loyalty">Fidélité</SelectItem>
                                                        <SelectItem value="promo">Promotion</SelectItem>
                                                        <SelectItem value="achievement">Succès</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleAdminAddGift} disabled={isAddingGift || !selectedUserId || !newGift.title}>
                                                {isAddingGift ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer le cadeau"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                        <p className="text-indigo-200 text-lg opacity-80">
                            Progressez dans l'utilisation de TTR et débloquez des avantages premium synchronisés en temps réel.
                        </p>

                        <div className="pt-4 max-w-md mx-auto md:mx-0">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Niveau de Fidélité</span>
                                <span className="text-xl font-bold text-white">{totalXp}%</span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full bg-gradient-to-r from-primary via-indigo-400 to-cyan-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                                    style={{ width: `${totalXp}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Missions Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Target className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-headline font-semibold">Missions de base</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {missions.map((mission) => (
                        <Card key={mission.id} className="bg-card/50 backdrop-blur-sm border-white/5 hover:border-primary/30 transition-all group">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                                        <mission.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] uppercase">{mission.type}</Badge>
                                </div>
                                <CardTitle className="text-lg">{mission.title}</CardTitle>
                                <CardDescription className="text-xs line-clamp-2">{mission.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                                        <span>Progression</span>
                                        <span>{mission.current} / {mission.requirement}</span>
                                    </div>
                                    <Progress value={(mission.current / mission.requirement) * 100} className="h-1.5" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Real-time Gifts Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Award className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-headline font-semibold">Ma Collection de Cadeaux</h2>
                    </div>
                    {isLoadingGifts && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                {!isLoadingGifts && realtimeGifts.length === 0 ? (
                    <Card className="border-dashed border-2 py-12 text-center">
                        <CardContent className="space-y-4">
                            <Gift className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                            <div className="space-y-1">
                                <p className="text-muted-foreground font-medium">Aucun cadeau débloqué pour le moment.</p>
                                <p className="text-xs text-muted-foreground/60">Continuez à utiliser l'application pour en recevoir de nouveaux.</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {realtimeGifts.map((gift) => {
                            const isClaimed = gift.status === 'claimed';
                            const isAnimatingCurrent = isAnimating === gift.id;
                            const FallbackIcon = gift.type === 'promo' ? Star : (gift.type === 'achievement' ? Trophy : Sparkles);

                            return (
                                <Card key={gift.id} className={cn(
                                    "group relative overflow-hidden transition-all duration-500 border-white/10 flex flex-col h-full",
                                    isClaimed ? "bg-emerald-500/5 border-emerald-500/20" : "bg-gradient-to-b from-card to-secondary/20 shadow-xl",
                                    isAnimatingCurrent && "animate-pulse"
                                )}>
                                    {/* Gift Image Header */}
                                    <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                                        {gift.imageUrl ? (
                                            <ResolvedImage
                                                src={gift.imageUrl}
                                                alt={gift.title}
                                                fill
                                                style={{ objectFit: 'cover' }}
                                                className="group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-white/10">
                                                <FallbackIcon className="h-20 w-20" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        <div className="absolute top-4 left-4">
                                            <Badge variant={isClaimed ? "outline" : "default"} className={cn(
                                                isClaimed && "text-emerald-500 border-emerald-500/50 bg-emerald-500/5",
                                                !isClaimed && "animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                            )}>
                                                {isClaimed ? "Obtenu" : "Nouveau !"}
                                            </Badge>
                                        </div>
                                    </div>

                                    <CardHeader className="flex-1">
                                        <CardTitle className="text-xl font-bold tracking-tight">{gift.title}</CardTitle>
                                        <CardDescription className="text-sm mt-2 line-clamp-2">{gift.description}</CardDescription>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        <div className={cn(
                                            "p-3 rounded-xl border border-dashed flex items-center gap-3",
                                            isClaimed ? "border-emerald-500/30 bg-emerald-500/5" : "border-primary/20 bg-primary/5"
                                        )}>
                                            <Shield className={cn("h-4 w-4 shrink-0", isClaimed ? "text-emerald-500" : "text-primary")} />
                                            <p className="text-sm font-semibold">{gift.rewardText}</p>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="pt-0">
                                        <Button
                                            className={cn("w-full transition-all duration-300 rounded-xl", isClaimed && "opacity-60")}
                                            variant={isClaimed ? "secondary" : "default"}
                                            disabled={isClaimed || !!isAnimating}
                                            onClick={() => handleClaim(gift)}
                                        >
                                            {isAnimatingCurrent ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                isClaimed ? "Cadeau récupéré" : "Réclamer mon cadeau"
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-white/5 relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 space-y-6">
                    <h2 className="text-3xl font-headline font-bold text-white">
                        Synchronisation <span className="text-primary italic">Cloud</span> Instantanée
                    </h2>
                    <p className="text-indigo-100/60 text-lg">
                        Dès qu'un administrateur débloque un privilège pour vous, il apparaît ici instantanément sur tous vos appareils.
                    </p>
                </div>
                <div className="relative">
                    <Zap className="h-32 w-32 text-primary animate-pulse" />
                </div>
            </div>

            <style jsx global>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 6s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
