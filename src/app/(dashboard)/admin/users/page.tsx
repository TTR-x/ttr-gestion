"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListFilter, Search, Trash2, Edit, ShieldCheck, ShieldAlert, PlusCircle, Save, Eye, EyeOff, Loader2, Briefcase, Phone, MessageSquareCode, Copy, Link as LinkIcon, Info, Bell, Star } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback, useRef } from "react";
import type { User } from "@/lib/types";
import { getUsers, softDeleteUser, generateInviteToken, getBusinessProfile, sendTargetedNotificationToUser } from "@/lib/firebase/database";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLoading } from "@/providers/loading-provider";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "@/lib/countries";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";


const roleTranslations: { [key: string]: string } = {
    admin: "Administrateur",
    employee: "Employé",
};

const getRoleIcon = (role: string) => {
    return role === "admin" ? <ShieldCheck className="h-5 w-5 text-green-500" /> : <ShieldAlert className="h-5 w-5 text-yellow-500" />;
};

const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
        const names = name.split(' ');
        if (names.length > 1 && names[0] && names[names.length - 1]) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }
    if (email) {
        return email.substring(0, 2).toUpperCase();
    }
    return "U";
};

const inviteFormSchema = z.object({
    countryCode: z.string().min(1, "Indicatif requis."),
    phoneNumber: z.string().min(8, { message: "Le numéro doit être valide." }),
    workspaceId: z.string().min(1, "Veuillez sélectionner un espace de travail."),
});
type InviteFormValues = z.infer<typeof inviteFormSchema>;

const notificationSchema = z.object({
    title: z.string().min(3, "Le titre est requis."),
    description: z.string().min(5, "Le message est requis."),
});
type NotificationFormValues = z.infer<typeof notificationSchema>;


export default function UserManagementPage() {
    const { currentUser, loading: authLoading, isAdmin, isSuperAdmin, businessId, businessProfile, planDetails, activeWorkspaceId: currentWorkspaceId } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const { showLoader, hideLoader, isLoading } = useLoading();
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [generatingLink, setGeneratingLink] = useState(false);

    const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
    const [notifyingUser, setNotifyingUser] = useState<User | null>(null);
    const [isSendingNotif, setIsSendingNotif] = useState(false);

    const notificationForm = useForm<NotificationFormValues>({
        resolver: zodResolver(notificationSchema),
        defaultValues: { title: '', description: '' },
    });


    const inviteForm = useForm<InviteFormValues>({
        resolver: zodResolver(inviteFormSchema),
        defaultValues: {
            countryCode: "+228",
            phoneNumber: "",
            workspaceId: currentWorkspaceId || undefined,
        },
    });

    const activeEmployeeCount = users.filter(user => user.role === 'employee' && !user.isDeleted).length;
    // Handle 'Illimité' explicitly, converting to Infinity for comparison
    const maxEmployees = planDetails?.employees === 'Illimité' ? Infinity : (typeof planDetails?.employees === 'number' ? planDetails.employees : 0);
    const canAddEmployee = activeEmployeeCount < maxEmployees;
    const isFreePlan = businessProfile?.subscriptionType === 'gratuit';

    const availableWorkspaces = businessProfile?.workspaces ? Object.values(businessProfile.workspaces) : [];

    const loadUsers = useCallback(async () => {
        if (!isAdmin || !businessId) return;
        setLoadingData(true);
        try {
            const fetchedUsersData = await getUsers(businessId);
            setUsers(fetchedUsersData);
            setFilteredUsers(fetchedUsersData);

        } catch (error) {
            console.error("Failed to fetch users:", error);
            toast({ variant: "destructive", title: "Erreur de chargement", description: "Impossible de charger la liste des utilisateurs." });
        } finally {
            setLoadingData(false);
        }
    }, [toast, isAdmin, businessId]);

    useEffect(() => {
        if (!authLoading && isAdmin) {
            loadUsers();
        }
    }, [isAdmin, authLoading, loadUsers]);

    useEffect(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = users.filter(user =>
            !user.isDeleted &&
            (user.displayName?.toLowerCase().includes(lowerSearchTerm) ||
                user.username?.toLowerCase().includes(lowerSearchTerm) ||
                user.email?.toLowerCase().includes(lowerSearchTerm) ||
                user.phoneNumber?.toLowerCase().includes(lowerSearchTerm))
        );
        setFilteredUsers(filtered);
    }, [searchTerm, users]);

    const handleGenerateInviteLink = async (values: InviteFormValues) => {
        if (!businessId || !currentUser?.uid) return;
        setGeneratingLink(true);
        try {
            const fullPhoneNumber = `${values.countryCode}${values.phoneNumber}`;
            const token = await generateInviteToken({
                businessId,
                workspaceId: values.workspaceId,
                actorUid: currentUser.uid,
                role: 'employee',
                employeePhoneNumber: fullPhoneNumber
            });
            const baseUrl = window.location.origin;
            const link = `${baseUrl}/invite?token=${token}`;
            setInviteLink(link);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Erreur", description: `Impossible de générer le lien : ${error.message}` });
        } finally {
            setGeneratingLink(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        toast({ title: "Lien copié !", description: "Le lien d'invitation a été copié dans le presse-papiers." });
    };

    const openInviteDialog = () => {
        setInviteLink('');
        inviteForm.reset({
            countryCode: "+228",
            phoneNumber: "",
            workspaceId: currentWorkspaceId || undefined,
        });
        setIsInviteDialogOpen(true);
    };


    const handleDeleteUser = async (userToDelete: User) => {
        if (!currentUser?.uid || !isAdmin || !businessId) {
            toast({ variant: "destructive", title: "Erreur", description: "Action non autorisée." });
            return;
        }
        if (userToDelete.uid === currentUser.uid) {
            toast({ variant: "destructive", title: "Action impossible", description: "Vous ne pouvez pas supprimer votre propre compte." });
            return;
        }

        showLoader();
        try {
            const profile = await getBusinessProfile(businessId);
            if (userToDelete.uid === profile?.ownerUid) {
                throw new Error("Impossible de supprimer le propriétaire de l'entreprise.");
            }

            await softDeleteUser(userToDelete.uid, currentUser.uid, businessId);
            toast({ title: "Utilisateur désactivé", description: `Le compte de ${userToDelete.displayName} a été désactivé.` });
            await loadUsers();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Échec de la désactivation", description: error.message || "Impossible de désactiver l'utilisateur." });
        } finally {
            hideLoader();
        }
    };

    const handleOpenNotifyDialog = (user: User) => {
        setNotifyingUser(user);
        notificationForm.reset();
        setIsNotifyDialogOpen(true);
    };

    const handleSendNotification = async (values: NotificationFormValues) => {
        if (!currentUser || !notifyingUser) return;
        setIsSendingNotif(true);
        try {
            await sendTargetedNotificationToUser(notifyingUser.uid, values, currentUser.uid);
            toast({ title: "Notification Envoyée !", description: `Un message a été envoyé à ${notifyingUser.displayName}.` });
            setIsNotifyDialogOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erreur", description: error.message });
        } finally {
            setIsSendingNotif(false);
        }
    }

    if (authLoading) {
        return (
            <div className="space-y-8">
                <Skeleton className="h-10 w-64" />
                <Card>
                    <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                    <CardContent><Skeleton className="h-48 w-full" /></CardContent>
                </Card>
            </div>
        )
    }

    if (!isAdmin && !authLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>Accès Refusé</CardTitle></CardHeader>
                <CardContent><p>Vous n'avez pas la permission de voir cette page. Redirection...</p></CardContent>
            </Card>
        );
    }

    return (
        <>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h1 className="text-3xl font-headline font-semibold tracking-tight">Gestion des Utilisateurs</h1>
                    {isFreePlan ? (
                        <Button asChild>
                            <Link href="/admin/subscription" onClick={showLoader}>
                                <Star className="mr-2 h-4 w-4" /> Passer à Premium pour ajouter
                            </Link>
                        </Button>
                    ) : (
                        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={openInviteDialog} disabled={!canAddEmployee}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un employé
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Inviter un Nouvel Employé</DialogTitle>
                                    <DialogDescription>
                                        Entrez le numéro de téléphone de l'employé et sélectionnez son espace de travail. Un lien d'invitation unique sera généré.
                                    </DialogDescription>
                                </DialogHeader>
                                {inviteLink ? (
                                    <div className="space-y-4 py-4">
                                        <Label>Lien d'invitation généré</Label>
                                        <div className="flex items-center gap-2">
                                            <Input value={inviteLink} readOnly />
                                            <Button size="icon" onClick={copyToClipboard}><Copy className="h-4 w-4" /></Button>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Envoyez ce lien à votre employé. Il est valable 24 heures.</p>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setInviteLink('')}>Générer un autre lien</Button>
                                            <a href={`https://wa.me/?text=${encodeURIComponent(`Bonjour, voici votre lien pour rejoindre notre équipe sur TTR Gestion : ${inviteLink}`)}`} target="_blank" rel="noopener noreferrer">
                                                <Button><MessageSquareCode className="mr-2 h-4 w-4" /> Partager via WhatsApp</Button>
                                            </a>
                                        </DialogFooter>
                                    </div>
                                ) : (
                                    <Form {...inviteForm}>
                                        <form onSubmit={inviteForm.handleSubmit(handleGenerateInviteLink)} className="space-y-4 py-4">
                                            <div className="flex gap-2">
                                                <FormField
                                                    control={inviteForm.control}
                                                    name="countryCode"
                                                    render={({ field }) => (
                                                        <FormItem className="w-1/3">
                                                            <FormLabel>Pays</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {countries.map(c => (
                                                                        <SelectItem key={c.code} value={c.dial_code}>
                                                                            <div className="flex items-center gap-2">
                                                                                <span>{c.flag}</span>
                                                                                <span>{c.dial_code}</span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={inviteForm.control}
                                                    name="phoneNumber"
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                            <FormLabel>Numéro (sans indicatif)</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="90123456" {...field} type="tel" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <FormField
                                                control={inviteForm.control}
                                                name="workspaceId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Espace de Travail</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Sélectionnez l'espace de travail..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {availableWorkspaces.map(ws => (
                                                                    <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <DialogFooter>
                                                <Button type="submit" disabled={generatingLink}>
                                                    {generatingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                                                    Générer le lien
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                )}
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline">Utilisateurs du Système</CardTitle>
                        <CardDescription>
                            Gérez les comptes utilisateurs, rôles et informations de contact.
                            <span className={cn("font-medium", !canAddEmployee && "text-destructive")}>
                                ({activeEmployeeCount} / {planDetails?.employees ?? '...'} employés)
                            </span>
                        </CardDescription>
                        <div className="flex items-center gap-2 pt-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher par nom, email, téléphone..."
                                    className="pl-8 w-full sm:w-[300px] text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="sm" className="h-9 gap-1" disabled>
                                <ListFilter className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only">Filtrer</span>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom & Contact</TableHead>
                                    <TableHead>Rôle & Espace de travail</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingData ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                                    ))
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.uid}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(user.displayName, user.email)}`} alt={user.displayName ?? ""} data-ai-hint="avatar person" />
                                                        <AvatarFallback>{getInitials(user.displayName, user.email)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{user.displayName}</p>
                                                        <p className="text-xs text-muted-foreground">{user.phoneNumber || user.email || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getRoleIcon(user.role)}
                                                    <span className="capitalize">{roleTranslations[user.role] || user.role}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 pl-1">
                                                    <Briefcase className="h-3 w-3" />
                                                    {availableWorkspaces.find(ws => ws.id === user.assignedWorkspaceId)?.name || 'Non assigné'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-1">
                                                {isSuperAdmin && (
                                                    <Button variant="ghost" size="icon" aria-label="Notifier l'utilisateur" onClick={() => handleOpenNotifyDialog(user)} disabled={isLoading}>
                                                        <Bell className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" aria-label="Modifier l'utilisateur" disabled={true || isLoading}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {currentUser?.uid !== user.uid && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" aria-label="Supprimer l'utilisateur" disabled={isLoading}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Désactiver l'utilisateur ?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Cette action désactivera le compte de {user.displayName}. L'utilisateur ne pourra plus se connecter.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteUser(user)}>Confirmer</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            Aucun utilisateur trouvé.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Notification Dialog */}
            <Dialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Envoyer une notification à {notifyingUser?.displayName}</DialogTitle>
                        <DialogDescription>Ce message sera uniquement visible par cet utilisateur.</DialogDescription>
                    </DialogHeader>
                    <Form {...notificationForm}>
                        <form onSubmit={notificationForm.handleSubmit(handleSendNotification)} className="space-y-4 py-4">
                            <FormField
                                control={notificationForm.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Titre</FormLabel>
                                        <FormControl><Input placeholder="Ex: Information importante" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={notificationForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Message</FormLabel>
                                        <FormControl><Textarea placeholder="Votre message ici..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="submit" disabled={isSendingNotif}>
                                    {isSendingNotif && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Envoyer
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}
