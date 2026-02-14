# 📱 RECRÉATION UI ANCIENNE VERSION

## ✅ COMPOSANTS CRÉÉS

### **1. Boutons Flottants (FAB)** 🎯
**Fichier :** `src/components/floating-action-buttons.tsx`

**Boutons (de haut en bas) :**
- 🔵 **Calculatrice** (bleu)
- ⚡ **Vente Rapide** (jaune)
- 📦 **Stock** (vert)
- 📢 **Publicité** (violet)

**Fonctionnalités :**
- Menu déroulant (clic sur icône grid)
- Animations stagger
- Backdrop sombre
- Position fixe à droite

---

### **2. Menu du Bas (Bottom Nav)** 📱
**Fichier :** `src/components/bottom-navigation.tsx`

**Items (de gauche à droite) :**
- 💰 **Trésorerie** → `/dashboard`
- 👥 **Clients** → `/clients`
- ⚡ **Vente Rapide** (bouton central) → `/reservations/new`
- 💼 **Prestations** → `/reservations`
- 🤖 **IA** → `/assistant`

**Fonctionnalités :**
- Bouton central plus grand (comme l'original)
- Indicateur actif
- Animations au clic
- Responsive (masqué sur desktop)

---

## 🔧 INTÉGRATION

### **Étape 1 : Ajouter au layout principal**

**Fichier à modifier :** `src/app/(dashboard)/layout.tsx`

```tsx
import { FloatingActionButtons } from '@/components/floating-action-buttons';
import { BottomNavigation } from '@/components/bottom-navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Contenu existant */}
      {children}
      
      {/* Nouveaux composants */}
      <FloatingActionButtons
        onCalculatorClick={() => {/* Ouvrir calculatrice */}}
        onQuickSaleClick={() => {/* Aller à vente rapide */}}
        onStockClick={() => {/* Aller au stock */}}
        onMarketingClick={() => {/* Aller à publicité */}}
      />
      
      <BottomNavigation />
      
      {/* Padding pour le menu du bas */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
```

---

### **Étape 2 : Connecter les actions**

#### **A. Calculatrice**
Utiliser le composant existant `CalculatorWidget` :

```tsx
'use client';

import { useState } from 'react';
import { CalculatorWidget } from '@/components/calculator-widget';

const [showCalculator, setShowCalculator] = useState(false);

<FloatingActionButtons
  onCalculatorClick={() => setShowCalculator(true)}
  // ...
/>

{showCalculator && (
  <CalculatorWidget onClose={() => setShowCalculator(false)} />
)}
```

#### **B. Vente Rapide**
```tsx
import { useRouter } from 'next/navigation';

const router = useRouter();

<FloatingActionButtons
  onQuickSaleClick={() => router.push('/reservations/new')}
  // ...
/>
```

#### **C. Stock**
```tsx
<FloatingActionButtons
  onStockClick={() => router.push('/stock')}
  // ...
/>
```

#### **D. Publicité**
```tsx
<FloatingActionButtons
  onMarketingClick={() => router.push('/publicity')}
  // ...
/>
```

---

## 🎨 PERSONNALISATION

### **Modifier les couleurs**
```tsx
// Dans floating-action-buttons.tsx
const actions = [
  {
    color: 'bg-blue-600 hover:bg-blue-700', // Bleu plus foncé
    // ...
  },
];
```

### **Modifier les liens du menu**
```tsx
// Dans bottom-navigation.tsx
const navItems = [
  {
    label: 'Dashboard',
    href: '/mon-lien',
    // ...
  },
];
```

### **Masquer sur certaines pages**
```tsx
const pathname = usePathname();
const hideNav = pathname.includes('/auth');

{!hideNav && <BottomNavigation />}
```

---

## 📱 COMPORTEMENT MOBILE

### **Bottom Navigation**
- ✅ Visible uniquement sur mobile (< 768px)
- ✅ Masqué sur desktop (sidebar visible)
- ✅ Bouton central surélevé (-mt-6)
- ✅ Safe area pour encoches

### **Floating Buttons**
- ✅ Toujours visibles
- ✅ Position fixe à droite
- ✅ Menu déroulant au clic
- ✅ Backdrop pour fermer

---

## 🎯 DIFFÉRENCES AVEC L'ORIGINAL

### **Améliorations :**
1. ✅ Animations plus fluides (stagger, scale)
2. ✅ Backdrop sombre au clic
3. ✅ Transitions natives
4. ✅ TypeScript pour la sécurité
5. ✅ Accessibilité (aria-labels, keyboard nav)

### **Identique :**
1. ✅ Position des boutons
2. ✅ Couleurs des icônes
3. ✅ Taille du bouton central
4. ✅ Ordre des éléments

---

## 🚀 PROCHAINES ÉTAPES

1. **Intégrer dans le layout** ✅
2. **Connecter les actions** ⏳
3. **Tester sur mobile** ⏳
4. **Ajuster les couleurs** ⏳
5. **Ajouter les liens manquants** ⏳

---

## 📝 NOTES

- Le composant `CalculatorWidget` existe déjà sur le dashboard
- Les liens sont configurables
- Le menu s'adapte automatiquement au thème (dark/light)
- Compatible avec les animations Phase 1

---

## 🎨 EXEMPLE COMPLET

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FloatingActionButtons } from '@/components/floating-action-buttons';
import { BottomNavigation } from '@/components/bottom-navigation';
import { CalculatorWidget } from '@/components/calculator-widget';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [showCalculator, setShowCalculator] = useState(false);

  return (
    <div className="relative min-h-screen pb-20 md:pb-0">
      {children}
      
      <FloatingActionButtons
        onCalculatorClick={() => setShowCalculator(true)}
        onQuickSaleClick={() => router.push('/reservations/new')}
        onStockClick={() => router.push('/stock')}
        onMarketingClick={() => router.push('/publicity')}
      />
      
      <BottomNavigation />
      
      {showCalculator && (
        <CalculatorWidget onClose={() => setShowCalculator(false)} />
      )}
    </div>
  );
}
```

---

**Voulez-vous que j'intègre ces composants maintenant ?** 🚀
