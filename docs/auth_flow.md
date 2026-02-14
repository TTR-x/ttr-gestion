```markdown
# Guide du Flux d'Authentification : De l'Inscription à l'Accès

Ce document détaille le processus technique pour l'inscription d'un nouvel utilisateur administrateur, de la création du compte à l'accès complet à l'application.

## 1. Inscription et Vérification de l'E-mail
- **Page** : `/register`
- **Action** : L'utilisateur fournit son nom, son e-mail et un mot de passe.
- **Logique** :
  1. Un compte Firebase Authentication est créé.
  2. Un e-mail de vérification est envoyé à l'adresse fournie.
  3. L'utilisateur est redirigé vers la page `/verify-email` où il doit cliquer sur le lien reçu pour continuer.

## 2. Configuration Initiale de l'Entreprise
- **Page** : `/setup`
- **Action** : Après avoir vérifié son e-mail, l'utilisateur configure son premier "espace de travail" en fournissant le nom, le type et le pays de son entreprise. Il peut également entrer un code promo.
- **Logique avec Code Promo** :
  1. Si un code promo est entré, une requête est envoyée à l'application **TTR Ambassadeur (ABT)** via un proxy externe pour valider le code.
  2. Si le code est valide, le profil de l'entreprise est créé avec une marque de parrainage (`appliedPromoCode`).
  3. Si le code est invalide, une erreur est affichée.
- **Redirection** : Une fois l'entreprise créée, l'utilisateur est redirigé vers la page de saisie du numéro WhatsApp.

## 3. Enregistrement du Numéro WhatsApp (Admin)
- **Page** : `/admin/number-validation`
- **Action** : L'utilisateur est invité à enregistrer son numéro de téléphone professionnel.
- **Logique** :
  1. Le numéro est enregistré dans le profil de l'entreprise (`businessProfile.businessPhoneNumber`).
  2. Le champ `businessPhoneNumberStatus` est mis à `'pending'`.
  3. Une **demande de validation de numéro** (`NumberValidationRequest`) est créée dans le nœud `trialRequests` de la base de données.
  4. L'utilisateur est immédiatement redirigé vers la page des forfaits. Il n'est pas bloqué à cette étape.

## 4. Validation Asynchrone par le Super Admin
- **Interface** : `/admin/approvals/trials` (dans l'application principale, accessible uniquement par le Super Admin).
- **Action** : Le Super Admin voit la liste des demandes de validation de numéro en attente.
- **Logique** :
  - **Approuver** : Met à jour le `businessPhoneNumberStatus` de l'entreprise à `'approved'`. L'utilisateur continue d'utiliser l'application sans interruption.
  - **Rejeter** : Met à jour le `businessPhoneNumberStatus` à `'rejected'`. Lors de sa prochaine connexion ou actualisation, l'utilisateur sera automatiquement redirigé vers la page `/admin/number-validation` pour soumettre un nouveau numéro.

## 5. Sélection du Forfait
- **Page** : `/admin/standard-subscription`
- **Action** : L'utilisateur choisit entre le forfait "Gratuit" ou l'un des forfaits "Premium".
- **Logique** :
  - **Gratuit** : L'utilisateur accède directement à l'application.
  - **Premium** : L'utilisateur est redirigé vers le tunnel de paiement (`/admin/activate-plan` puis `/admin/payment-instructions`). Après soumission du paiement, il est mis en attente (`/pending-verification`) jusqu'à l'approbation du Super Admin.

## Accès à l'Application
Une fois toutes ces étapes (ou les étapes minimales pour le forfait gratuit) complétées, l'utilisateur a un accès complet à son tableau de bord (`/overview`).

---

## Annexe Technique pour le Super Admin : Récupération des Demandes

Pour implémenter la validation des numéros WhatsApp dans l'application Super Admin, voici comment récupérer les données :

*   **Nœud de la base de données** : Les demandes sont stockées dans `/trialRequests`.
*   **Filtrage** : Vous devez requêter ce nœud en filtrant les documents où le champ `status` est égal à `'pending'`.
*   **Structure des données** : Chaque objet correspond à l'interface `NumberValidationRequest` définie dans `src/lib/types.ts`.
*   **Traitement** : Pour approuver ou rejeter, utilisez la fonction `processNumberValidationRequest(requestId, businessId, action)` qui gère toute la logique de mise à jour.
```