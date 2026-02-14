
# Plan de Développement : Application TTR Super Admin

**Objectif :**
Créer une application web sécurisée et autonome, nommée "TTR Super Admin", destinée exclusivement à l'administrateur principal (Super Admin) pour la supervision, la maintenance et la gestion avancée de l'écosystème TTR Gestion.

---

#### **1. Technologies et Stack Technique**
*   **Framework :** Next.js avec React et TypeScript (identique à l'application principale pour la cohérence).
*   **Base de données :** Connexion directe à la même base de données Firebase que l'application TTR Gestion.
*   **Style :** Tailwind CSS et ShadCN UI pour une interface sobre, fonctionnelle et rapide à développer.
*   **Authentification :** Mécanisme de connexion simple (email/mot de passe) strictement limité à l'adresse e-mail du Super Admin.

---

#### **2. Pages et Fonctionnalités Clés**

**A. Page de Connexion (`/login`)**
*   Un formulaire de connexion simple, mais avec un accès restreint. Seul l'email du Super Admin (`ttrbuzi@gmail.com`) est autorisé à se connecter.

**B. Tableau de Bord Global (`/`)**
*   **Vue d'ensemble de la plateforme :**
    *   Nombre total d'entreprises inscrites.
    *   Nombre total d'utilisateurs.
    *   Nombre de demandes d'abonnement et d'essai en attente.
    *   Graphique simple montrant les nouvelles inscriptions d'entreprises sur les 30 derniers jours.
*   **Raccourcis vers les outils principaux.**

**C. Outil de Réparation des Comptes Utilisateurs (`/users/repair`)**
*   **Objectif :** L'outil le plus critique. Permet de résoudre les problèmes d'accès et d'assignation des utilisateurs.
*   **Fonctionnalités :**
    1.  Champ de recherche pour trouver un utilisateur par son **e-mail**.
    2.  Affichage des détails de l'utilisateur trouvé : `uid`, `displayName`, `businessId` actuel, `assignedWorkspaceId` actuel, et la liste de ses `workspaces`.
    3.  Formulaire permettant de **modifier manuellement** :
        *   L'**espace de travail actif** (`assignedWorkspaceId`).
        *   Le **rôle** de l'utilisateur (`admin` ou `employee`) au sein de cet espace.
    4.  Bouton "Appliquer les Modifications" pour enregistrer les changements directement dans la base de données.

**D. Outil d'Octroi d'Abonnement Manuel (`/subscriptions/grant`)**
*   **Objectif :** Permettre d'activer ou de prolonger un abonnement pour n'importe quelle entreprise, sans passer par une demande de paiement.
*   **Fonctionnalités :**
    1.  Champ de recherche pour trouver une entreprise par **nom** ou par **ID**.
    2.  Affichage du statut de l'abonnement actuel de l'entreprise (plan, date d'expiration).
    3.  Formulaire pour :
        *   Choisir un **type de forfait** (Essentiel, Croissance, Pro, etc.).
        *   Entrer une **durée à ajouter** (en jours ou en mois).
    4.  Bouton "Accorder l'Abonnement" qui met à jour le profil de l'entreprise avec la nouvelle date d'expiration et le nouveau forfait.

**E. Gestion des Demandes (`/approvals`)**
*   Un tableau de bord unifié listant **toutes** les demandes d'abonnement et d'essai en attente, issues de toutes les entreprises.
*   Boutons "Approuver" et "Rejeter" pour chaque demande, avec une interface plus rapide et plus directe que dans l'application principale.

---
