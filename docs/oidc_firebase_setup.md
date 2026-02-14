# Guide : Configuration du Fournisseur OIDC dans Firebase pour "My PME Zone"

Ce guide explique comment configurer TTR Gestion comme un fournisseur d'authentification OpenID Connect (OIDC) personnalisé dans la console Firebase du projet "My PME Zone".

#### Prérequis

Avant de commencer, assurez-vous d'avoir fait ceci dans le panel Super Admin de **TTR Gestion** :
1.  Allez dans `Outils Super Admin` > `Applications Autorisées`.
2.  Créez une nouvelle autorisation pour "My PME Zone".
3.  Copiez la **Clé d'API (`apiKey`)** qui est générée. Vous en aurez besoin.

---

#### Étapes de Configuration dans la Console Firebase de "My PME Zone"

1.  **Accéder à la Console Firebase**
    *   Ouvrez la [console Firebase](https://console.firebase.google.com/) et sélectionnez le projet de "My PME Zone".

2.  **Aller à l'Authentification**
    *   Dans le menu de gauche, cliquez sur `Authentication`.
    *   Allez à l'onglet `Sign-in method`.

3.  **Ajouter un Nouveau Fournisseur**
    *   Cliquez sur le bouton "Ajouter un nouveau fournisseur".
    *   Dans la liste, trouvez et sélectionnez **"OpenID Connect"**.

4.  **Remplir le Formulaire de Configuration**

    C'est l'étape la plus importante. Remplissez les champs comme suit :

    *   **Nom** : `TTR Gestion`
    *   **Client ID** : Collez la **Clé d'API** que vous avez générée dans TTR Gestion.
    *   **Client Secret** : Collez à nouveau la **même Clé d'API**. (Pour notre architecture, la clé API sert à la fois d'identifiant et de secret).
    *   **URL de l'émetteur (Issuer URL)** : `https://app.ttrgestion.site`
        *   *Note technique* : Firebase utilisera cette URL pour trouver automatiquement le point de configuration standard à l'adresse `https://app.ttrgestion.site/.well-known/openid-configuration`. Cet endpoint devra être créé côté TTR Gestion.
    *   **Type de réponse** : Assurez-vous que `Code` est bien coché (pour utiliser le flux d'autorisation sécurisé "Authorization Code Flow").

5.  **Enregistrer et Obtenir l'URL de Callback**

    *   Cliquez sur "Enregistrer".
    *   Une fois enregistré, Firebase vous fournira une **URL de redirection OAuth**. Elle ressemblera à ceci :
        `https://my-pme-zone.firebaseapp.com/__/auth/handler`

6.  **Finaliser la Configuration dans TTR Gestion**

    *   Retournez dans le panel Super Admin de **TTR Gestion**.
    *   Modifiez l'application "My PME Zone" que vous aviez créée.
    *   Dans le champ "URIs de redirection autorisées", collez l'**URL de redirection OAuth** que Firebase vient de vous donner.
    *   Enregistrez les modifications.

---

### Résumé Technique pour l'Implémentation Côté TTR Gestion

Pour que ce flux fonctionne, l'instance de Gemini travaillant sur TTR Gestion devra construire les endpoints suivants (ils ne sont pas encore prêts) :

1.  **Endpoint de Configuration** : `https://app.ttrgestion.site/.well-known/openid-configuration`
    *   Ce fichier JSON public décrira où trouver les autres endpoints (authorize, token, userinfo).
2.  **Endpoint d'Autorisation** : `https://app.ttrgestion.site/oauth/authorize`
    *   La page où l'utilisateur se connecte à TTR Gestion et donne son consentement.
3.  **Endpoint de Jeton (Token)** : `https://app.ttrgestion.site/oauth/token`
    *   L'endpoint de serveur à serveur où My PME Zone échangera le code d'autorisation contre un jeton d'accès.

Cette configuration est standard, sécurisée, et permettra à Firebase de traiter TTR Gestion comme un fournisseur d'authentification de premier ordre.
