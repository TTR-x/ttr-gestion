# TTR Gestion : Le Manuel Technique Complet

Bienvenue sur **TTR Gestion**, votre solution tout-en-un pour une gestion d'entreprise simplifiée. Ce document sert de guide technique complet pour l'application, destiné aux développeurs et administrateurs système. Il couvre l'architecture, les flux de données, la configuration et les détails de chaque module.

---

## ⚙️ Configuration Initiale du Projet

Pour que l'application fonctionne, que ce soit pour le développement ou la production, vous devez suivre ces étapes cruciales.

### 1. Créer le Fichier d'Environnement `.env.local`

Créez un fichier nommé `.env.local` à la racine de votre projet et remplissez-le avec vos propres clés. Ce fichier est **ignoré par Git** pour des raisons de sécurité.

```
# Clés de connexion à Firebase
# Trouvez-les dans : Console Firebase > Paramètres du projet > Vos applications > SDK Setup > Config
NEXT_PUBLIC_FIREBASE_API_KEY="VOTRE_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="VOTRE_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_DATABASE_URL="VOTRE_DATABASE_URL"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="VOTRE_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="VOTRE_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="VOTRE_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="VOTRE_APP_ID"

# E-mail de l'administrateur principal (pour les droits Super Admin)
NEXT_PUBLIC_ADMIN_EMAIL="votre_email_superadmin@exemple.com"

# Clé pour l'assistant IA TRIX Business (via OpenRouter)
OPENROUTER_API_KEY="VOTRE_CLE_OPENROUTER"

# Clés pour l'hébergement d'images (Cloudinary)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="VOTRE_CLOUD_NAME_CLOUDINARY"
NEXT_PUBLIC_CLOUDINARY_UNSIGNED_PRESET="VOTRE_UPLOAD_PRESET_CLOUDINARY"

# URL du proxy pour la communication avec l'app Ambassadeur (ABT)
# C'est la même URL pour les deux variables
NEXT_PUBLIC_CLOUDFLARE_PROXY_URL="VOTRE_URL_PROXY_CLOUDFLARE"
CLOUDFLARE_PROXY_URL="VOTRE_URL_PROXY_CLOUDFLARE"
```

### 2. Comprendre le Flux de Démarrage Utilisateur

Le parcours d'un nouvel administrateur est crucial et suit plusieurs étapes gérées par le `AuthProvider` pour s'assurer que le profil est complet avant l'accès total.

1.  **Inscription (`/register`)** : L'utilisateur crée un compte avec email/mot de passe.
2.  **Vérification d'Email (`/verify-email`)** : Il doit valider son email via un lien reçu.
3.  **Configuration de l'Entreprise (`/setup`)** : Il fournit les informations de base de son entreprise (nom, type, pays). C'est à cette étape que le `businessId` est créé.
4.  **Choix du Forfait (`/admin/standard-subscription`)** : Il choisit un forfait (Gratuit ou Premium).
5.  **Validation du Numéro WhatsApp (`/admin/number-validation`)** : Il est invité à enregistrer un numéro WhatsApp. Cette étape est obligatoire mais non bloquante. Une demande est envoyée au Super Admin pour validation, et l'utilisateur est redirigé pour continuer.

---

## 🔑 Fonctionnalités Principales : Détails Techniques

#### 1. 📊 Tableau de Bord (`/overview`)
- **Objectif** : Fournir une vue d'ensemble agrégée de l'activité.
- **Implémentation** : Cette page effectue plusieurs appels à la base de données via les fonctions de `src/lib/firebase/database.ts` pour récupérer :
    - Les `reservations` du mois pour les statistiques de vente.
    - Les `expenses` du mois.
    - Les `reservations` du jour pour les arrivées.
    - Le `activityLog` pour l'activité récente.
    - Les `stock` marqués `isForSale=true` pour la "Vente Rapide".

#### 2. ✨ TRIX Business (Assistant IA) (`/assistant`)
- **Objectif** : Fournir des conseils de gestion via une IA.
- **Implémentation** :
    - Utilise `OpenAI` via un proxy `OpenRouter` pour accéder à des modèles comme `mistralai/mistral-nemo`. La configuration se trouve dans `src/ai/runAssistant.ts`.
    - Le `formatSystemPrompt` construit un contexte détaillé incluant le nom de l'utilisateur, les détails de son entreprise et une description complète de toutes les fonctionnalités de l'application. L'IA est ainsi "au courant" de ce que l'application peut faire.
    - Le feedback (like/dislike) est enregistré dans le nœud `ai-feedback` de la base de données.

#### 3. 📋 Gestion des Prestations (`/reservations`)
- **Objectif** : Module central pour gérer les opérations commerciales.
- **Implémentation** :
    - CRUD complet sur le nœud `businesses/{businessId}/reservations`.
    - La logique de terminologie (Réservation, Vente, Commande) est gérée côté client dans `(dashboard)/reservations/page.tsx` via le hook `useTerminology`, qui se base sur le `businessProfile.type`.
    - L'impression de reçus (`/reservations/[id]/receipt`) génère un aperçu HTML qui est ensuite imprimé via la fonction du navigateur.

#### 4. 📦 Gestion de Stock (`/stock`)
- **Objectif** : Suivi de l'inventaire.
- **Implémentation** :
    - CRUD sur `businesses/{businessId}/stock`.
    - La fonction `adjustStockQuantity` utilise une **Transaction Firebase** pour garantir que les ajustements de quantité sont atomiques (soit ils réussissent complètement, soit ils échouent sans modifier les données), ce qui est crucial pour éviter les incohérences de stock.
    - La génération d'images IA (`generateProductImage`) utilise un flow Genkit qui appelle un modèle de génération d'image, puis upload le résultat (en Data URI) sur Cloudinary via `uploadDataUriToCloudinary`.

#### 5. ⚙️ Paramètres (`/settings`)
- **Objectif** : Permettre à l'utilisateur de configurer son environnement.
- **Implémentation** :
    - **Profil de l'Entreprise** : Met à jour le nœud `businesses/{businessId}/profile`.
    - **Connexion Rapide (PIN)** : Met à jour le champ `pin` sur l'objet de l'utilisateur dans `users/{uid}`.
    - **Espaces de Travail** : Gère les objets `workspaces` dans `businesses/{businessId}/profile` et les permissions dans `users/{uid}/workspaces`.
    - **Personnalisation** : Met à jour la section `personalization` de la base de données.

---

## 🏛️ Architecture de la Base de Données (Firebase Realtime Database)

La structure de la base de données est conçue pour être à la fois multi-tenant (plusieurs entreprises) et sécurisée. Les règles de sécurité (`database.rules.json`) sont le gardien de cette structure.

#### Nœuds Principaux :
- `/users/{uid}` : Contient les informations de chaque utilisateur (nom, email, rôle, etc.), y compris le `businessId` et `assignedWorkspaceId` actifs, ainsi qu'un objet `workspaces` listant tous les espaces auxquels il a accès.
- `/businesses/{businessId}` : Le conteneur principal pour toutes les données d'une entreprise.
    - `/profile` : Contient les métadonnées de l'entreprise (nom, type, abonnement, etc.).
    - `/reservations`, `/expenses`, `/clients`, `/stock`, etc. : Chaque sous-nœud contient les données opérationnelles, partitionnées par `workspaceId` pour la gestion multi-espaces.
- `/invitations/{tokenId}` : Stocke les jetons d'invitation à usage unique pour les employés.
- `/subscriptionRequests/{reqId}` : Stocke les demandes de validation de paiement pour les abonnements.
- `/authorizedApps/{appId}` : Registre des applications tierces autorisées à utiliser l'API OAuth.

#### Logique des Règles de Sécurité :
- **Isolation** : La règle la plus fondamentale est que la plupart des lectures et écritures dans `businesses/{businessId}` ne sont autorisées que si le `businessId` de l'utilisateur authentifié correspond au `$businessId` du chemin. (`root.child('users').child(auth.uid).child('businessId').val() === $businessId`).
- **Permissions Basées sur le Rôle** : Des actions plus sensibles (comme la suppression) sont souvent limitées aux utilisateurs ayant le rôle `admin` dans un espace de travail spécifique (`root.child('users').child(auth.uid).child('workspaces').child(newData.child('workspaceId').val()).val() === 'admin'`).
- **Super Admin** : Un utilisateur avec l'email `ttrbuzi@gmail.com` a des droits de lecture/écriture étendus sur de nombreux nœuds, ce qui est essentiel pour la maintenance et la validation.
- **Validation des Données (`.validate`)** : Chaque écriture est validée pour s'assurer qu'elle contient les champs obligatoires, que les types de données sont corrects et que les timestamps (`updatedAt`, `createdAt`) sont gérés correctement pour la traçabilité.

---

## 🔌 Architecture de Communication Externe

TTR Gestion est conçu pour interagir avec d'autres systèmes de manière sécurisée.

### 1. Communication avec TTR Ambassadeur (ABT)

- **Problème** : Valider un code promo côté client sans exposer de clés secrètes et en contournant les restrictions CORS du navigateur.
- **Solution : Proxy Externe**
    1. Le client TTR Gestion appelle une URL de proxy (Cloudflare Worker) définie dans `NEXT_PUBLIC_CLOUDFLARE_PROXY_URL`.
    2. Le proxy reçoit la requête, y ajoute la **clé API secrète** (stockée dans les secrets du Worker), et la transfère au serveur de l'application ABT.
    3. Le serveur ABT, qui ne dialogue qu'avec le proxy, valide la requête et renvoie la réponse.
    4. Le proxy ajoute les en-têtes CORS (`Access-Control-Allow-Origin: *`) à la réponse d'ABT avant de la renvoyer au client.
- **Variables d'environnement** : `NEXT_PUBLIC_CLOUDFLARE_PROXY_URL` est utilisée par le client, tandis que `CLOUDFLARE_PROXY_URL` (sans le préfixe `NEXT_PUBLIC_`) est utilisée par le code serveur pour des actions comme la notification de paiement. Les deux pointent vers la même URL de proxy.

### 2. Intégration d'Applications Tierces (OAuth/OIDC)

TTR Gestion est conçu pour agir comme un **Fournisseur d'Identité (IdP)**, permettant à des applications comme "My PME Zone" d'utiliser la fonctionnalité "Se connecter avec TTR Gestion".

#### Composants Clés :
1.  **Registre des Applications (`/admin/authorized-apps`)** : Le Super Admin enregistre une application externe, qui reçoit alors une `apiKey` (agissant comme `Client ID` et `Client Secret`).
2.  **API d'Information (`/api/userinfo`)** :
    - Endpoint sécurisé par la `apiKey`.
    - **Action `getUserInfo`** : Permet à une application externe d'obtenir les informations publiques de l'utilisateur et de son entreprise (y compris les produits à vendre).
    - **Action `processSale`** : Permet à une application externe de déclencher une vente dans TTR Gestion (décrémentation du stock, ajout d'un revenu rapide).
3.  **Flux OAuth 2.0 (à venir)** : Le flux complet impliquera :
    - `/oauth/authorize` : Où l'utilisateur consent à partager ses informations.
    - `/oauth/token` : Où l'application externe échange un code d'autorisation contre un jeton d'accès.
    - `/.well-known/openid-configuration` : Endpoint de découverte standard pour que les clients (comme Firebase Auth) puissent trouver automatiquement les URL d'autorisation et de jeton.

---
Merci d'utiliser TTR Gestion. Nous nous engageons à améliorer continuellement l'application pour soutenir votre succès.
