# Mode Hors Ligne & Cohérence des Données (Offline Read-Only Mode)

Ce document décrit le système mis en place pour prévenir les incohérences de données lorsqu'une entreprise utilise plusieurs appareils et que l'un d'eux tente d'effectuer des modifications hors ligne.

## Le Problème (Split-Brain)

Dans un environnement multi-appareils (Ex: Patron + Employé), si l'Employé est hors ligne :
1.  Il ne reçoit pas les mises à jour effectuées par le Patron (ex: Vente de 5 articles).
2.  S'il effectue une modification basée sur des données obsolètes (ex: Vendre 2 articles alors qu'il n'en reste que 1 en réalité), cela crée un conflit lors de la reconnexion.
3.  Firebase Realtime Database applique la dernière écriture, écrasant potentiellement les données correctes.

## La Solution : Mode Lecture Seule

Nous appliquons une règle stricte : **Si un appareil est Hors Ligne ET que l'entreprise possède plusieurs appareils enregistrés, l'écriture est interdite.**

### Architecture

1.  **Détection du Nombre d'Appareils (`layout.tsx`)**
    *   L'application écoute en permanence `businesses/{businessId}/devices`.
    *   Le nombre total d'appareils connus est sauvegardé localement dans `localStorage.getItem('ttr_known_device_count')`.
    *   Cela permet de connaître le contexte "Multi-appareils" même si l'on perd la connexion ensuite.

2.  **Hook de Protection (`use-offline-write-guard.tsx`)**
    *   Ce hook vérifie deux conditions :
        *   `!navigator.onLine` (L'appareil est hors ligne)
        *   `ttr_known_device_count > 1` (Plus d'un appareil enregistré)
    *   Si les deux sont vrais, `checkWritePermission()` renvoie `false` et ouvre une modale bloquante.

### Comment l'utiliser (Pour les développeurs)

Pour protéger une page ou une action (ex: Créer une facture, Modifier un client) :

1.  **Importer le hook** :
    ```typescript
    import { useOfflineWriteGuard } from "@/hooks/use-offline-write-guard";
    ```

2.  **Initialiser le hook dans votre composant** :
    ```typescript
    const { checkWritePermission, OfflineGuardModal, isReadOnlyMode } = useOfflineWriteGuard();
    ```

3.  **Protéger les actions d'écriture** :
    ```typescript
    const handleSave = () => {
      if (!checkWritePermission()) return; // Stoppe l'action et affiche la modale si nécessaire
      
      // ... logique de sauvegarde
    };
    ```

4.  **Ajouter la Modale et l'Indicateur Visuel (Optionnel)** :
    ```tsx
    return (
      <div>
        <OfflineGuardModal /> {/* Doit être présent dans le JSX */}
        
        {/* Badge optionnel */}
        {isReadOnlyMode && <Badge>Lecture Seule</Badge>}
        
        <Button onClick={handleSave}>Sauvegarder</Button>
      </div>
    );
    ```

## Fichiers Modifiés
*   `src/app/(dashboard)/layout.tsx` : Logique de comptage des appareils.
*   `src/hooks/use-offline-write-guard.tsx` : Le hook réutilisable.
*   `src/app/(dashboard)/stock/page.tsx` : Exemple d'intégration.
