
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Building, Info, Edit, Save, Loader2, Globe, Gamepad2, Briefcase as WorkspaceIcon, Lock, Shield, ListChecks, ArrowRight, Palette, CircleDollarSign, ShieldCheck, BookOpen, Lightbulb, AlertTriangle, Trash2, Images, Upload, User as UserIcon, HelpCircle, MailCheck, MessageSquare, CheckCircle, Crown, Clock } from "lucide-react";
import packageInfo from '../../../../package.json';
import { useAuth } from '@/providers/auth-provider';
import type { BusinessProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog"
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, updateBusinessProfile, deleteWorkspace, deleteEntireBusiness, deleteBusinessLogo } from '@/lib/firebase/database';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { useLoading } from '@/providers/loading-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ResolvedImage } from '@/components/ui/resolved-image';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Textarea } from '@/components/ui/textarea';
import { hashPin } from '@/lib/crypto';

const version = packageInfo.version;

const businessTypes = [
  // Commerce & Vente
  "Alimentation générale",
  "Boutique / Magasin",
  "Supermarché",
  "Revendeur / Revendeuse",
  "Commerce de gros",
  "Ferrailleur",
  "Librairie / Papeterie",
  "Pharmacie / Parapharmacie",
  "Quincaillerie",
  "Vente de cosmétiques",
  "Vente de vêtements / Prêt-à-porter",
  "Vente de pièces automobiles",
  "Vente de produits en ligne (e-commerce)",

  // Services
  "Salon de coiffure / Barbier",
  "Institut de beauté / Esthétique",
  "Couture / Mode",
  "Pressing / Blanchisserie",
  "Réparation (téléphone, électronique...)",
  "Transport / Taxi / Zemidjan",
  "Agence de voyage",
  "Décoration / Événementiel",
  "Consultant / Prestation de services",
  "Développeur / Informatique",
  "Graphisme / Design",
  "Marketing / Communication",

  // Hôtellerie & Restauration
  "Hôtel / Auberge",
  "Maison d'hôtes / Gîte",
  "Restaurant",
  "Bar / Café",
  "Fast-food / Street-food",
  "Traiteur",

  // Artisanat & BTP
  "Artisanat",
  "Construction / BTP",
  "Menuiserie / Ébénisterie",
  "Plomberie",
  "Électricité",
  "Maçonnerie",

  // Agriculture & Élevage
  "Agriculture",
  "Élevage",

  // Santé
  "Cabinet médical / Clinique",
  "Cabinet dentaire",

  // Autre
  "Fonctionnaire",
  "Association / ONG",
  "École / Centre de formation",
  "Autre",
];


const countries = [
  "Bénin", "Burkina Faso", "Cap-Vert", "Côte d'Ivoire", "Gambie", "Ghana", "Guinée",
  "Guinée-Bissau", "Liberia", "Mali", "Mauritanie", "Niger", "Nigeria", "Sénégal", "Sierra Leone", "Togo",
  "Cameroun", "République centrafricaine", "Tchad", "Congo-Brazzaville", "Congo-Kinshasa", "Guinée équatoriale", "Gabon",
  "Afrique du Sud", "Algérie", "Angola", "Botswana", "Égypte", "Éthiopie", "Kenya", "Maroc", "Mozambique", "Ouganda", "Rwanda", "Soudan", "Tanzanie", "Zambie", "Zimbabwe",
  "France", "Belgique", "Suisse", "Canada", "États-Unis", "Chine", "Inde", "Brésil"
].sort((a, b) => a.localeCompare(b));


const businessSchema = z.object({
  name: z.string().min(2, { message: "Le nom de l'entreprise doit contenir au moins 2 caractères." }),
  type: z.string({ required_error: "Veuillez sélectionner un domaine d'activité." }),
  country: z.string({ required_error: "Veuillez sélectionner un pays." }),
  currency: z.string().min(1, { message: "La devise est requise." }).max(5, { message: "La devise est trop longue." }),
  otherType: z.string().optional(),
  website: z.string().url({ message: "Veuillez entrer une URL valide (ex: https://example.com)" }).optional().or(z.literal('')),
  businessPhoneNumber: z.string().optional(),
  businessAddress: z.string().optional(),
  professionalEmail: z.string().email({ message: "Veuillez entrer une adresse email valide." }).optional().or(z.literal('')),
  termsAndConditions: z.string().optional(),
  gamesForEmployeesEnabled: z.boolean().default(true),
  investmentFeatureEnabledForEmployees: z.boolean().default(true),
  receiptWatermarkEnabled: z.boolean().default(true),
});

type BusinessFormValues = z.infer<typeof businessSchema>;


function BusinessProfileCard() {
  const { currentUser, businessId, businessProfile, isAdmin, refreshCurrentUser } = useAuth();
  const { toast } = useToast();
  const { showLoader, hideLoader, isLoading } = useLoading();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isFreePlan = businessProfile?.subscriptionType === 'gratuit';

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      gamesForEmployeesEnabled: true,
      investmentFeatureEnabledForEmployees: true,
      receiptWatermarkEnabled: true,
      currency: "FCFA",
    }
  });

  useEffect(() => {
    if (businessProfile) {
      const isOtherType = !businessTypes.includes(businessProfile.type);
      setShowOtherInput(isOtherType);
      form.reset({
        name: businessProfile.name,
        type: isOtherType ? 'Autre' : businessProfile.type,
        otherType: isOtherType ? businessProfile.type : "",
        country: businessProfile.country || "",
        currency: businessProfile.currency || "FCFA",
        website: businessProfile.website || "",
        businessPhoneNumber: businessProfile.businessPhoneNumber || "",
        businessAddress: businessProfile.businessAddress || "",
        professionalEmail: businessProfile.professionalEmail || "",
        termsAndConditions: isFreePlan ? "Ce reçu est généré par TTR gestion" : businessProfile.termsAndConditions || "",
        gamesForEmployeesEnabled: businessProfile.gamesForEmployeesEnabled !== false,
        investmentFeatureEnabledForEmployees: businessProfile.investmentFeatureEnabledForEmployees !== false,
        receiptWatermarkEnabled: businessProfile.receiptWatermarkEnabled !== false,
      });
    }
  }, [businessProfile, form, isFormOpen, isFreePlan]);

  if (!isAdmin) {
    return null;
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !businessId || !currentUser?.uid) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({ variant: 'destructive', title: 'Image trop lourde', description: 'Veuillez choisir une image de moins de 2 Mo.' });
      return;
    }

    setIsUploading(true);
    toast({ title: 'Téléversement en cours...', description: 'Veuillez patienter.' });

    try {
      const imageUrl = await uploadToCloudinary(file);
      await updateBusinessProfile(businessId, { logoUrl: imageUrl }, currentUser.uid);
      await refreshCurrentUser();
      toast({ title: "Logo mis à jour avec succès !" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur de téléversement", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!businessId || !currentUser?.uid) return;

    showLoader();
    try {
      await deleteBusinessLogo(businessId, currentUser.uid);
      await refreshCurrentUser();
      toast({ title: "Logo supprimé" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
      hideLoader();
    }
  };


  const handleFormSubmit = async (values: BusinessFormValues) => {
    if (!currentUser?.uid || !businessId) return;
    showLoader();
    try {
      const profileData: Partial<BusinessProfile> = {
        name: values.name,
        type: values.type === 'Autre' && values.otherType ? values.otherType : values.type,
        country: values.country,
        currency: values.currency,
        website: values.website,
        businessPhoneNumber: values.businessPhoneNumber,
        businessAddress: values.businessAddress,
        professionalEmail: values.professionalEmail,
        gamesForEmployeesEnabled: values.gamesForEmployeesEnabled,
        investmentFeatureEnabledForEmployees: values.investmentFeatureEnabledForEmployees,
        receiptWatermarkEnabled: values.receiptWatermarkEnabled,
      };

      if (!isFreePlan) {
        profileData.termsAndConditions = values.termsAndConditions;
      }

      await updateBusinessProfile(businessId, profileData, currentUser.uid);
      await refreshCurrentUser();
      toast({ title: "Profil mis à jour", description: "Les informations de votre entreprise ont été enregistrées." });
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible de mettre à jour le profil." });
    } finally {
      hideLoader();
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline flex items-center">
              <Building className="mr-3 h-6 w-6 text-primary" />
              Profil de l'Entreprise
            </CardTitle>
            <CardDescription>Gérez les informations principales de votre entreprise.</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" /> Modifier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Modifier le Profil de l'Entreprise</DialogTitle>
                <DialogDescription>Mettez à jour les informations de votre espace de travail.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de l'entreprise</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domaine d'activité</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value)
                          setShowOtherInput(value === 'Autre');
                        }} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un domaine" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {businessTypes.sort((a, b) => a.localeCompare(b)).map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {showOtherInput && (
                    <FormField
                      control={form.control}
                      name="otherType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Précisez votre domaine</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Agence de voyage" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pays</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un pays" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {countries.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Devise</FormLabel>
                          <FormControl><Input placeholder="Ex: FCFA, €, $" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Separator />
                  <h3 className="text-md font-medium pt-2">Coordonnées de l'entreprise (pour les reçus)</h3>
                  <FormField control={form.control} name="businessPhoneNumber" render={({ field }) => (<FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input placeholder="+228 12 34 56 78" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="professionalEmail" render={({ field }) => (<FormItem><FormLabel>Email professionnel</FormLabel><FormControl><Input placeholder="contact@entreprise.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="businessAddress" render={({ field }) => (<FormItem><FormLabel>Adresse</FormLabel><FormControl><Input placeholder="123 Rue de la Paix, Lomé" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Site Web</FormLabel><FormControl><Input placeholder="https://www.monentreprise.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="termsAndConditions" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Conditions Générales (bas de reçu)
                        {isFreePlan && <Crown className="h-4 w-4 text-yellow-500" />}
                      </FormLabel>
                      <FormControl><Textarea placeholder="Ex: 'Les articles vendus ne sont ni repris ni échangés.'" {...field} disabled={isFreePlan} /></FormControl>
                      {isFreePlan && <FormDescription>Cette fonctionnalité est réservée aux forfaits premium. <Link href="/admin/subscription" className="text-primary underline">Passez à premium</Link>.</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Separator />
                  <h3 className="text-md font-medium pt-2">Permissions & Options</h3>
                  <FormField
                    control={form.control}
                    name="gamesForEmployeesEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2"><Gamepad2 className="h-4 w-4" /> Activer les jeux</FormLabel>
                          <FormDescription>
                            Autoriser les employés à accéder à la section des jeux.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="investmentFeatureEnabledForEmployees"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2"><WorkspaceIcon className="h-4 w-4" /> Activer les investissements</FormLabel>
                          <FormDescription>
                            Autoriser les employés à voir le module d'investissements.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="receiptWatermarkEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2"><Images className="h-4 w-4" /> Filigrane sur les reçus</FormLabel>
                          <FormDescription>
                            Afficher le nom de votre entreprise en filigrane.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" /> Enregistrer
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="relative w-20 h-20">
            {businessProfile?.logoUrl ? (
              <div className="relative w-20 h-20 rounded-md border overflow-hidden">
                <ResolvedImage src={businessProfile.logoUrl} alt="Logo de l'entreprise" fill style={{ objectFit: "cover" }} />
              </div>
            ) : (
              <div className="flex items-center justify-center w-20 h-20 rounded-md border bg-secondary">
                <Building className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <Input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleLogoUpload}
              disabled={isFreePlan}
            />
            {businessProfile?.logoUrl ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg border-2 border-white dark:border-slate-800 z-10 flex items-center justify-center bg-background text-destructive hover:bg-destructive hover:text-white"
                    disabled={isFreePlan}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer le logo ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action retirera le logo de votre profil. Pour le changer, vous devez d'abord le supprimer. L'image sera définitivement effacée de nos serveurs lors du prochain nettoyage pour libérer de l'espace.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteLogo}>Supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : isFreePlan ? (
              <Button asChild size="icon" variant="outline" className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background shadow-lg border-2 border-white dark:border-slate-800 z-10">
                <Link href="/admin/subscription">
                  <Crown className="h-4 w-4 text-yellow-500" />
                </Link>
              </Button>
            ) : (
              <Button
                size="icon"
                variant="outline"
                className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background shadow-lg border-2 border-white dark:border-slate-800 z-10 flex items-center justify-center text-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">Nom : <span className="text-muted-foreground">{businessProfile?.name}</span></p>
            <p className="text-sm font-medium">Domaine : <span className="text-muted-foreground">{businessProfile?.type}</span></p>
            <p className="text-sm font-medium">Code d'équipe : <span className="text-muted-foreground font-mono">{businessProfile?.teamCode}</span></p>
            {isFreePlan && <p className="text-xs text-muted-foreground">Passez à un forfait premium pour ajouter votre logo.</p>}
          </div>
        </div>
        <Separator className="opacity-50" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          <p className="text-sm font-medium flex items-center gap-2 truncate">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{businessProfile?.businessPhoneNumber || 'Non défini'}</span>
          </p>
          <p className="text-sm font-medium flex items-center gap-2 truncate">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{businessProfile?.professionalEmail || 'Non défini'}</span>
          </p>
          <p className="text-sm font-medium flex items-center gap-2 truncate">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{businessProfile?.website || 'Non défini'}</span>
          </p>
          <p className="text-sm font-medium flex items-center gap-2 truncate">
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{businessProfile?.currency}</span>
          </p>
          <p className="text-sm font-medium flex items-center gap-2 col-span-full">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{businessProfile?.businessAddress || 'Adresse non définie'}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

const pinSchema = z.object({
  pin: z.string().refine(val => val === '' || /^\d{4}$/.test(val), {
    message: "Le code PIN doit être composé de 4 chiffres.",
  }),
});
type PinFormValues = z.infer<typeof pinSchema>;

function QuickConnectCard() {
  const { currentUser, refreshCurrentUser } = useAuth();
  const { toast } = useToast();
  const { showLoader, hideLoader, isLoading } = useLoading();

  const form = useForm<PinFormValues>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      pin: '', // Always start empty for security
    }
  });

  // Do not preload the hashed PIN into the form
  useEffect(() => {
    form.reset({ pin: '' });
  }, [currentUser, form]);

  const handlePinSubmit = async (values: PinFormValues) => {
    if (!currentUser) return;
    showLoader();
    try {
      let pinToSave = values.pin;

      if (pinToSave && pinToSave.length === 4) {
        // Encrypt PIN before saving
        pinToSave = await hashPin(pinToSave, currentUser.uid);

        // Also save to local storage for offline access
        if (typeof window !== 'undefined') {
          localStorage.setItem(`secure_pin_hash_${currentUser.uid}`, pinToSave);
        }
      } else {
        // Removing PIN
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`secure_pin_hash_${currentUser.uid}`);
        }
        pinToSave = '';
      }

      await updateUserProfile(currentUser.uid, { pin: pinToSave }, currentUser.uid, currentUser.businessId);
      await refreshCurrentUser();
      toast({ title: "Code PIN mis à jour", description: "Votre code de sécurité a été enregistré (chiffré)." });
      form.reset({ pin: '' });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible de mettre à jour le code PIN." });
    } finally {
      hideLoader();
    }
  };

  const hasPin = !!currentUser?.pin;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center">
          <ShieldCheck className="mr-3 h-6 w-6 text-primary" />
          Connexion Rapide (Code PIN)
        </CardTitle>
        <CardDescription>Sécurisez l'accès à votre espace avec un code PIN à 4 chiffres. Il est maintenant chiffré pour plus de sécurité.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handlePinSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {hasPin ? "Changer votre code PIN" : "Définir un code PIN"}
                  </FormLabel>
                  <FormControl>
                    <Input type="password" inputMode="numeric" maxLength={4} placeholder="Entrez 4 chiffres" {...field} />
                  </FormControl>
                  <FormDescription>Laissez vide et enregistrez pour désactiver le code PIN.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" /> Enregistrer le code PIN
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


function DangerZoneCard() {
  const { isAdmin, businessId, activeWorkspaceId, currentUser, businessProfile, logout } = useAuth();
  const { toast } = useToast();
  const { showLoader, hideLoader, isLoading } = useLoading();
  const [confirmationText, setConfirmationText] = useState('');

  if (!isAdmin) return null;

  const activeWorkspace = businessProfile?.workspaces?.[activeWorkspaceId!];
  const isOwner = currentUser?.uid === businessProfile?.ownerUid;

  const handleDeleteWorkspace = async () => {
    if (!businessId || !activeWorkspaceId || !currentUser?.uid) return;
    if (confirmationText !== activeWorkspace?.name) {
      toast({ variant: 'destructive', title: 'Confirmation incorrecte', description: "Le nom de l'espace de travail ne correspond pas." });
      return;
    }
    showLoader();
    try {
      await deleteWorkspace(businessId, activeWorkspaceId, currentUser.uid);
      toast({ title: "Espace de travail supprimé", description: `L'espace ${activeWorkspace.name} a été supprimé.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: e.message });
      hideLoader();
    }
  };

  const handleDeleteBusiness = async () => {
    if (!businessId || !currentUser?.uid || !isOwner) return;
    if (confirmationText !== businessProfile?.name) {
      toast({ variant: 'destructive', title: 'Confirmation incorrecte', description: "Le nom de l'entreprise ne correspond pas." });
      return;
    }
    showLoader();
    try {
      await deleteEntireBusiness(businessId, currentUser.uid);
      toast({ title: "Entreprise supprimée", description: "Toutes vos données ont été effacées. Vous allez être déconnecté." });
      // The logout is handled inside the delete function after user auth is deleted
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: e.message });
      hideLoader();
    }
  };

  return (
    <Card className="shadow-lg border-destructive/50">
      <CardHeader>
        <CardTitle className="font-headline flex items-center text-destructive">
          <AlertTriangle className="mr-3 h-6 w-6" /> Zone Dangereuse
        </CardTitle>
        <CardDescription>Actions irréversibles. Soyez absolument certain avant de continuer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Delete Workspace */}
        <div className="p-4 border rounded-md">
          <h3 className="font-semibold">Supprimer cet espace de travail</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Toutes les données de l'espace "{activeWorkspace?.name}" seront définitivement supprimées. Cette action est irréversible.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={activeWorkspace?.isPrimary}>
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer cet espace de travail
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Toutes les données de l'espace <strong>{activeWorkspace?.name}</strong> seront effacées. Pour confirmer, veuillez taper son nom ci-dessous.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                placeholder={`Tapez "${activeWorkspace?.name}"`}
                value={confirmationText}
                onChange={e => setConfirmationText(e.target.value)}
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmationText('')}>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteWorkspace} disabled={isLoading || confirmationText !== activeWorkspace?.name}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Je comprends, supprimer cet espace
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {activeWorkspace?.isPrimary && <p className="text-xs text-destructive mt-2">Vous ne pouvez pas supprimer votre espace de travail principal.</p>}
        </div>

        {/* Delete Business */}
        {isOwner && (
          <div className="p-4 border rounded-md">
            <h3 className="font-semibold">Supprimer l'entreprise entière</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Toutes les données de l'entreprise "{businessProfile?.name}", y compris tous les espaces de travail et les comptes utilisateurs, seront définitivement supprimées.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="bg-red-800 hover:bg-red-900" disabled>
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer l'entreprise
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>C'est une action TRÈS DANGEREUSE</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action supprimera l'entreprise <strong>{businessProfile?.name}</strong>, tous ses espaces, données et comptes. Pour confirmer, tapez le nom de l'entreprise ci-dessous.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  placeholder={`Tapez "${businessProfile?.name}"`}
                  value={confirmationText}
                  onChange={e => setConfirmationText(e.target.value)}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmationText('')}>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteBusiness} className="bg-red-800 hover:bg-red-900" disabled={isLoading || confirmationText !== businessProfile?.name}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Je comprends les conséquences, tout supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function SettingsPage() {
  const { isAdmin, currentUser, businessProfile, sendVerificationEmail, showLoader } = useAuth();
  const { toast } = useToast();
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const isOwner = currentUser?.uid === businessProfile?.ownerUid;

  const createWhatsAppLink = () => {
    const phoneNumber = "+22899974389";
    const message = `Bonjour, j'ai besoin d'une assistance pour TTR Gestion. Mon entreprise est "${businessProfile?.name || 'inconnue'}".`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  const handleSendVerification = async () => {
    setIsSendingVerification(true);
    try {
      await sendVerificationEmail();
      toast({
        title: "E-mail de vérification envoyé",
        description: "Veuillez consulter votre boîte de réception et vos spams pour confirmer votre adresse.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-headline font-semibold tracking-tight">Paramètres</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <UserIcon className="mr-3 h-6 w-6 text-primary" />
              Mon Profil
            </CardTitle>
            <CardDescription>Gérez vos informations personnelles et votre mot de passe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild>
              <Link href="/settings/profile" onClick={showLoader}>
                Modifier mon profil <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <div className="p-3 border rounded-md bg-secondary/30">
              {currentUser?.emailVerified ? (
                <div className="flex items-center gap-3 text-green-600">
                  <MailCheck className="h-5 w-5" />
                  <p className="font-semibold text-sm">Votre e-mail est vérifié.</p>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-semibold text-sm">Votre e-mail n'est pas vérifié.</p>
                    <Button variant="link" size="sm" className="p-0 h-auto" onClick={handleSendVerification} disabled={isSendingVerification}>
                      {isSendingVerification ? 'Envoi en cours...' : 'Envoyer un lien de confirmation'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border rounded-md bg-secondary/30">
              {businessProfile?.businessPhoneNumber ? (
                businessProfile.businessPhoneNumberStatus === 'pending' ? (
                  <div className="flex items-center gap-3 text-yellow-600">
                    <Clock className="h-5 w-5" />
                    <p className="font-semibold text-sm">WhatsApp : En cours d'approbation (24h max)</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <p className="font-semibold text-sm">Votre compte WhatsApp est lié.</p>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-semibold text-sm">Votre compte n'est pas lié à WhatsApp.</p>
                    <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                      <Link href="/admin/number-validation" onClick={showLoader}>
                        Lier mon numéro WhatsApp
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <Palette className="mr-3 h-6 w-6 text-primary" />
              Interface & Personnalisation
            </CardTitle>
            <CardDescription>Personnalisez l'apparence et le comportement de votre application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Gérez les thèmes, la langue, et les interactions comme les menus flottants.
            </p>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/settings/interface" onClick={showLoader}>
                <span className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> Préférences d'interface</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {isAdmin && <BusinessProfileCard />}

        <QuickConnectCard />

        {isOwner && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center">
                <WorkspaceIcon className="mr-3 h-6 w-6 text-primary" />
                Gestion des Espaces de Travail
              </CardTitle>
              <CardDescription>
                Créez ou basculez entre plusieurs entreprises avec un seul compte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Idéal si vous gérez plusieurs établissements ou des activités distinctes. Chaque espace de travail est totalement indépendant.
              </p>
              <Button asChild>
                <Link href="/workspaces" onClick={showLoader}>
                  Gérer mes espaces de travail <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <Palette className="mr-3 h-6 w-6 text-primary" />
              Personnalisation
            </CardTitle>
            <CardDescription>
              Adaptez l'application à votre activité spécifique.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Définissez vos propres types de chambres, de services, de produits et bien plus pour que les formulaires correspondent parfaitement à votre métier.
            </p>
            <Button asChild>
              <Link href="/settings/personalization" onClick={showLoader}>
                Personnaliser mon activité <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <BookOpen className="mr-3 h-6 w-6 text-primary" />
              Manuel d'Utilisation
            </CardTitle>
            <CardDescription>
              Découvrez en détail tout ce que TTR Gestion peut faire pour vous.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Du tableau de bord à la gestion des investissements, explorez le guide complet des fonctionnalités pour tirer le meilleur parti de votre outil de gestion.
            </p>
            <Button asChild>
              <Link href="/settings/features" onClick={showLoader}>
                Consulter le manuel <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <Info className="mr-3 h-6 w-6 text-primary" />
              À Propos de TTR Gestion
            </CardTitle>
            <CardDescription>Informations sur l'application, sa version et son développeur.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>Amélioration Continue</AlertTitle>
              <AlertDescription>
                Cette application est en développement actif pour vous apporter de nouvelles fonctionnalités. Vos données sont sécurisées et ne seront jamais affectées. De nouvelles mises à jour arrivent bientôt !
              </AlertDescription>
            </Alert>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Développé par :</h3>
              <p className="text-md text-primary font-medium">TTR Studio</p>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Informations sur l'application :</h3>
              <div className="flex items-center gap-3">
                <p className="text-foreground">Version de l'application : <span className="font-semibold text-primary">{version}</span></p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Contactez-nous :</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <a href={createWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
                    Demander une assistance
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <a href="mailto:support@ttrgestion.site" className="text-foreground hover:text-primary transition-colors">
                    support@ttrgestion.site
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <a href="tel:+22899974389" className="text-foreground hover:text-primary transition-colors">
                    +228 99 97 43 89
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg hidden md:block">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <Shield className="mr-3 h-6 w-6 text-primary" />
              Sécurité & Confidentialité
            </CardTitle>
            <CardDescription>Votre tranquillité d'esprit est notre priorité.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 mt-1 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold">Stockage Sécurisé</h4>
                <p className="text-sm text-muted-foreground">
                  Toutes vos données sont stockées sur votre instance privée de la base de données Firebase de Google, reconnue mondialement pour sa sécurité.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 mt-1 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold">Confidentialité Absolue</h4>
                <p className="text-sm text-muted-foreground">
                  Personne, pas même notre équipe, ne peut accéder aux données de votre entreprise. Vos informations restent les vôtres, sans compromis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {isAdmin && <DangerZoneCard />}

    </div>
  );
}
