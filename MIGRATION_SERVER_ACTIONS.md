# 📦 MIGRATION DES SERVER ACTIONS

## 🎯 **OBJECTIF**

Déplacer tous les fichiers avec Server Actions et API Routes dans `src/server-only/` pour permettre le build APK/EXE.

---

## 📋 **FICHIERS À DÉPLACER**

### **Server Actions (8 fichiers) :**

1. ✅ `src/lib/cloudinary.ts` → `src/server-only/lib/cloudinary.ts`
2. ✅ `src/lib/actions.ts` → `src/server-only/lib/actions.ts`
3. ✅ `src/lib/payment.ts` → `src/server-only/lib/payment.ts`
4. ✅ `src/ai/flows/assistant-flow.ts` → `src/server-only/ai/flows/assistant-flow.ts`
5. ✅ `src/ai/flows/generate-advice-flow.ts` → `src/server-only/ai/flows/generate-advice-flow.ts`
6. ✅ `src/ai/flows/generate-product-image-flow.ts` → `src/server-only/ai/flows/generate-product-image-flow.ts`
7. ✅ `src/ai/flows/generate-ad-proposal-flow.ts` → `src/server-only/ai/flows/generate-ad-proposal-flow.ts`
8. ✅ `src/ai/runAssistant.ts` → `src/server-only/ai/runAssistant.ts`

### **API Routes (2 dossiers) :**

9. ✅ `src/app/api/ambassador/` → `src/server-only/api/ambassador/`
10. ✅ `src/app/api/userinfo/` → `src/server-only/api/userinfo/`

---

## 🚀 **COMMANDES DE MIGRATION**

### **Étape 1 : Créer la structure**

```bash
mkdir src\server-only
mkdir src\server-only\lib
mkdir src\server-only\ai
mkdir src\server-only\ai\flows
mkdir src\server-only\api
```

### **Étape 2 : Déplacer les Server Actions**

```bash
# Lib
move src\lib\cloudinary.ts src\server-only\lib\cloudinary.ts
move src\lib\actions.ts src\server-only\lib\actions.ts
move src\lib\payment.ts src\server-only\lib\payment.ts

# AI
move src\ai\runAssistant.ts src\server-only\ai\runAssistant.ts
move src\ai\flows\assistant-flow.ts src\server-only\ai\flows\assistant-flow.ts
move src\ai\flows\generate-advice-flow.ts src\server-only\ai\flows\generate-advice-flow.ts
move src\ai\flows\generate-product-image-flow.ts src\server-only\ai\flows\generate-product-image-flow.ts
move src\ai\flows\generate-ad-proposal-flow.ts src\server-only\ai\flows\generate-ad-proposal-flow.ts
```

### **Étape 3 : Déplacer les API Routes**

```bash
# API
xcopy src\app\api\ambassador src\server-only\api\ambassador /E /I
xcopy src\app\api\userinfo src\server-only\api\userinfo /E /I

# Supprimer les originaux
rmdir /s /q src\app\api\ambassador
rmdir /s /q src\app\api\userinfo
```

---

## 🔧 **ADAPTER LES IMPORTS**

Après le déplacement, il faut adapter les imports dans les fichiers qui utilisent ces Server Actions.

### **Exemple :**

**Avant :**
```typescript
import { uploadToCloudinary } from '@/lib/cloudinary';
```

**Après :**
```typescript
import { uploadToCloudinary } from '@/server-only/lib/cloudinary';
```

---

## ⚠️ **IMPORTANT**

1. **Ne pas supprimer** les fichiers originaux avant de vérifier que tout fonctionne
2. **Tester la version web** après migration : `npm run dev`
3. **Tester le build APK** : `npm run build:apk`

---

## 📝 **CHECKLIST**

- [ ] Créer la structure `src/server-only/`
- [ ] Déplacer les 8 Server Actions
- [ ] Déplacer les 2 API Routes
- [ ] Adapter les imports
- [ ] Tester `npm run dev`
- [ ] Tester `npm run build:apk`

---

## 🎯 **PROCHAINES ÉTAPES**

Une fois la migration terminée :

1. **Installer Capacitor :**
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```

2. **Initialiser Capacitor :**
   ```bash
   npx cap init "TTR Gestion" "com.ttr.gestion" --web-dir=out
   ```

3. **Ajouter Android :**
   ```bash
   npx cap add android
   ```

4. **Build APK :**
   ```bash
   npm run build:apk
   ```
