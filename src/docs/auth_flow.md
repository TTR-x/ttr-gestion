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
- **Action** : Après avoir vérifié son e-mail, l'utilisateur est redirigé ici. Il configure son premier "espace de travail" en fournissant le nom, le type et le pays de son entreprise. Il peut également entrer un code promo.
- **Logique avec Code Promo** :
  1. Si un code promo est entré, une requête est envoyée à l'application **TTR Ambassadeur (ABT)** via un proxy externe pour valider le code.
  2. Si le code est valide, le profil de l'entreprise est créé avec une marque de parrainage (`appliedPromoCode`).
  3. Si le code est invalide, une erreur est affichée.
- **Redirection** : Une fois l'entreprise créée, l'utilisateur est redirigé vers la page des forfaits.

## 3. Sélection du Forfait
- **Page** : `/admin/standard-subscription`
- **Action** : L'utilisateur voit les différents forfaits disponibles et en choisit un.
- **Logique** : Le choix d'un forfait le redirige vers la page de paiement correspondante.

## 4. Paiement et Validation
- **Page** : `/admin/payment-instructions`
- **Action** : L'utilisateur suit les instructions pour payer (ex: Mobile Money) et soumet une preuve (ID de transaction).
- **Logique** :
  1. Une `SubscriptionRequest` (demande d'abonnement) est créée dans la base de données avec le statut `pending`.
  2. L'utilisateur est redirigé vers une page d'attente (`/pending-verification`).
  3. Le **Super Admin** voit cette demande dans son interface (`/admin/approvals`) et l'approuve.
  4. L'approbation active l'abonnement, prolonge la durée si un code promo a été utilisé, et notifie ABT pour la commission.

## 5. Enregistrement du Numéro WhatsApp (Admin)
- **Page** : `/admin/number-validation`
- **Action** : Après l'activation de son abonnement, si l'administrateur n'a pas encore enregistré de numéro de téléphone pour son entreprise, il est redirigé vers cette page.
- **Logique** :
  1. L'utilisateur entre son numéro WhatsApp professionnel.
  2. Le numéro est enregistré dans le profil de l'entreprise (`businessProfile.businessPhoneNumber`).
  3. L'utilisateur est redirigé vers les paramètres (`/settings`).
- **Accès Final** : Une fois cette étape terminée, l'utilisateur a un accès complet à toutes les fonctionnalités de l'application.

```
