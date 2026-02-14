# Guide Technique : Intégration d'Applications Tierces avec TTR Gestion

Ce document détaille l'architecture d'authentification et de communication entre TTR Gestion et des applications externes comme "My PME Zone".

---

## Principe Fondamental : TTR Gestion comme Fournisseur d'Identité (IdP)

Le cœur de notre système est que **TTR Gestion agit comme un Fournisseur d'Identité centralisé**, tout comme Google ou Facebook. Toute application externe qui souhaite authentifier un utilisateur ou accéder à ses données doit passer par TTR Gestion.

Nous utilisons les standards de l'industrie pour cela :
*   **OAuth 2.0** : Pour le flux d'autorisation (demander le consentement de l'utilisateur).
*   **OpenID Connect (OIDC)** : Une surcouche d'OAuth 2.0 qui standardise la manière dont les informations sur l'utilisateur sont partagées.

---

## Les 3 Piliers de l'Architecture

Notre système repose sur trois composants essentiels :

#### 1. Le Registre des Applications Autorisées

Avant toute communication, une application externe comme "My PME Zone" doit être déclarée dans TTR Gestion.

*   **Où ?** Un administrateur (Super Admin) va sur une page sécurisée dans TTR Gestion (`/admin/authorized-apps`) pour enregistrer "My PME Zone".
*   **Quoi ?** Il fournit le nom de l'application et les "URIs de redirection autorisées" (les adresses vers lesquelles TTR Gestion a le droit de renvoyer l'utilisateur après la connexion, par exemple `https://www.my-pme-zone.com/callback`).
*   **Résultat** : TTR Gestion génère un `Client ID` et une `Clé API` (**`apiKey`**). Cette clé est le mot de passe secret que "My PME Zone" utilisera pour s'identifier auprès de TTR Gestion.
*   **État Actuel** : La fonction `addAuthorizedApp` dans `src/lib/firebase/database.ts` et la page de gestion sont prêtes.

#### 2. L'API : Le Serveur de Communication Permanent

C'est le "serveur" qui est lié en permanence à "My PME Zone". Il s'agit d'un point d'accès unique et sécurisé (`/api/userinfo`) qui exécute des actions spécifiques en fonction des requêtes.

*   **Action `getUserInfo`** :
    *   **Objectif** : Fournir les informations de l'utilisateur et de son entreprise à une application externe.
    *   **Fonctionnement** : My PME Zone fait une requête `POST` à l'API en présentant un `userId` et sa `apiKey`. L'API vérifie la clé, récupère les informations de l'utilisateur (nom, email), de son entreprise (nom, type, logo) et la liste de ses produits marqués "à vendre", puis les renvoie.
    *   **État Actuel** : Cette logique est **entièrement implémentée** dans `src/app/api/userinfo/route.ts`.

*   **Action `processSale`** :
    *   **Objectif** : Permettre à "My PME Zone" de déclencher une vente directement dans TTR Gestion.
    *   **Fonctionnement** : Quand un client achète sur My PME Zone, ce dernier envoie une requête `processSale` à notre API avec les détails (`sellerId`, `itemId`, `quantity`, `unitPrice`).
    *   Notre API exécute alors une transaction atomique :
        1.  Elle **vérifie la clé API** pour s'assurer que la requête est légitime.
        2.  Elle **débite la quantité** de l'article du stock du vendeur dans TTR Gestion.
        3.  Elle **enregistre un "revenu rapide"** dans la trésorerie du vendeur.
        4.  Elle **consigne l'événement** dans le journal d'activité du vendeur.
    *   **État Actuel** : Cette logique est **entièrement implémentée** dans `src/app/api/userinfo/route.ts`.

#### 3. Le Flux d'Authentification OAuth / OIDC (à construire)

Ceci est la partie visible par l'utilisateur, le fameux bouton "Se connecter avec TTR Gestion". **Cette partie n'est pas encore construite, mais l'architecture est prête pour l'accueillir.**

Voici le flux théorique que l'autre instance devra aider à construire :

1.  **Clic sur le Bouton** : Sur `my-pme-zone.com`, l'utilisateur clique sur "Se connecter avec TTR Gestion".
2.  **Redirection vers TTR Gestion** : My PME Zone redirige l'utilisateur vers une nouvelle page à créer sur TTR Gestion, par exemple `https://app.ttrgestion.site/oauth/authorize`, en incluant son `Client ID`.
3.  **Connexion & Consentement** :
    *   TTR Gestion vérifie si l'utilisateur est connecté. Si non, il lui affiche la page de connexion normale de TTR Gestion.
    *   Une fois connecté, TTR Gestion affiche une page de consentement : "**My PME Zone souhaite accéder à vos informations de profil et de produits. Autoriser ?**"
4.  **Redirection avec un Code** : Si l'utilisateur accepte, TTR Gestion le redirige vers l'URI de callback de My PME Zone (enregistrée à l'étape 1) avec un **code d'autorisation** temporaire.
5.  **Échange du Code contre un Jeton** : En arrière-plan, le serveur de My PME Zone contacte une autre nouvelle page de TTR Gestion (par exemple `/oauth/token`), en présentant le code d'autorisation et sa `Clé API` secrète.
6.  **Accès Accordé** : TTR Gestion vérifie tout, et si c'est correct, il renvoie un **Access Token** à My PME Zone.
7.  **Utilisation du Jeton** : My PME Zone peut maintenant utiliser cet Access Token pour faire des appels authentifiés à notre API `/api/userinfo` au nom de l'utilisateur, sans jamais avoir besoin de son mot de passe.

---

### **En Résumé pour l'Autre Instance Gemini**

*   **La base est solide** : L'API pour lire les infos (`getUserInfo`) et traiter les ventes (`processSale`) est **déjà fonctionnelle et sécurisée par une clé API**.
*   **Ce qui est prêt** : Vous pouvez déjà demander la création d'une page dans le Super Admin Panel pour gérer les applications autorisées (en utilisant la fonction `addAuthorizedApp` de `database.ts`). Une fois que My PME Zone a une clé, il peut techniquement déjà utiliser l'API de vente et de récupération d'informations.
*   **Ce qu'il faut construire** : Le **flux de connexion OAuth 2.0 / OIDC** (les pages `/oauth/authorize` et `/oauth/token` dans TTR Gestion) est la prochaine grande étape pour permettre une connexion utilisateur fluide et sécurisée, et pour permettre à des applications tierces de se connecter à Firebase en utilisant TTR Gestion comme fournisseur d'identité.