# 🔧 SCRIPTS DE BUILD - TTR GESTION

Ce dossier contient tous les scripts nécessaires pour builder l'application pour différentes plateformes.

## 📋 **STRUCTURE**

```
scripts/
├── move-server-code.js       # Déplace server-only hors du projet
├── restore-server-code.js    # Restaure server-only dans le projet
├── build-web.js              # Build pour le web (avec server actions)
├── build-apk.js              # Build pour APK (sans server actions)
└── build-exe.js              # Build pour EXE (sans server actions)
```

## 🚀 **UTILISATION**

### **Build Web (PWA)**
```bash
npm run build:web
```

### **Build APK (Android)**
```bash
npm run build:apk
```

### **Build EXE (Windows)**
```bash
npm run build:exe
```

## ⚙️ **FONCTIONNEMENT**

1. **Build Web** : Utilise tout le code (server actions inclus)
2. **Build APK/EXE** : 
   - Déplace `src/server-only/` vers `../server-only-backup/`
   - Build en mode export statique
   - Restaure `src/server-only/`

## 📝 **NOTES**

- Les Server Actions ne fonctionnent pas en mode statique (APK/EXE)
- Le code est temporairement déplacé, jamais supprimé
- Après chaque build, le code est automatiquement restauré
