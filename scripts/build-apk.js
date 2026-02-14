const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Script de build pour APK Android
 * Stratégie : Déplacer temporairement les dossiers [id] hors de src/ et nettoyer le cache
 */

console.log('🚀 BUILD APK - Démarrage...\n');

const rootDir = path.join(__dirname, '..');
const nextConfigPath = path.join(rootDir, 'next.config.ts');
const nextConfigBackupPath = path.join(rootDir, 'next.config.ts.backup');
const dynamicPagesBackupDir = path.join(rootDir, 'dynamic-pages-backup');
const nextCacheDir = path.join(rootDir, '.next');

// Dossiers dynamiques à déplacer temporairement
const dynamicFolders = [
  { src: 'src/app/(dashboard)/clients/[id]', name: 'clients-id' },
  { src: 'src/app/(dashboard)/expenses/[id]', name: 'expenses-id' },
  { src: 'src/app/(dashboard)/investments/[id]', name: 'investments-id' },
  { src: 'src/app/(dashboard)/reservations/[id]', name: 'reservations-id' },
  { src: 'src/app/(dashboard)/stock/[id]', name: 'stock-id' },
];

// Configuration Next.js sans PWA pour Capacitor
const nextConfigCapacitor = `
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
`;

function moveDynamicFolders(toBackup) {
  if (toBackup) {
    // Créer le dossier de backup
    if (!fs.existsSync(dynamicPagesBackupDir)) {
      fs.mkdirSync(dynamicPagesBackupDir, { recursive: true });
    }

    console.log('📁 Déplacement des pages dynamiques hors de src/...');
    dynamicFolders.forEach(({ src, name }) => {
      const srcPath = path.join(rootDir, src);
      const destPath = path.join(dynamicPagesBackupDir, name);

      if (fs.existsSync(srcPath)) {
        fs.renameSync(srcPath, destPath);
        console.log(`  ✓ ${src} → dynamic-pages-backup/${name}`);
      }
    });
  } else {
    console.log('📁 Restauration des pages dynamiques...');
    dynamicFolders.forEach(({ src, name }) => {
      const srcPath = path.join(rootDir, src);
      const destPath = path.join(dynamicPagesBackupDir, name);

      if (fs.existsSync(destPath)) {
        fs.renameSync(destPath, srcPath);
        console.log(`  ✓ dynamic-pages-backup/${name} → ${src}`);
      }
    });

    // Supprimer le dossier de backup s'il est vide
    if (fs.existsSync(dynamicPagesBackupDir)) {
      fs.rmdirSync(dynamicPagesBackupDir);
    }
  }
  console.log('');
}

function cleanNextCache() {
  console.log('🧹 Nettoyage du cache Next.js...');
  if (fs.existsSync(nextCacheDir)) {
    fs.rmSync(nextCacheDir, { recursive: true, force: true });
    console.log('  ✓ Cache .next supprimé');
  }
  console.log('');
}

try {
  // Étape 1 : Sauvegarder next.config.ts
  console.log('💾 Étape 1/8 : Sauvegarde de next.config.ts...');
  fs.copyFileSync(nextConfigPath, nextConfigBackupPath);
  console.log('');

  // Étape 2 : Créer next.config.ts sans PWA
  console.log('📝 Étape 2/8 : Création de next.config.ts sans PWA...');
  fs.writeFileSync(nextConfigPath, nextConfigCapacitor);
  console.log('');

  // Étape 3 : Déplacer les pages dynamiques
  console.log('📁 Étape 3/8 : Exclusion des pages dynamiques...');
  moveDynamicFolders(true);

  // Étape 4 : Nettoyer le cache Next.js
  console.log('🧹 Étape 4/8 : Nettoyage du cache...');
  cleanNextCache();

  // Étape 5 : Déplacer le code server-only
  console.log('📦 Étape 5/8 : Déplacement du code server-only...');
  execSync('node scripts/move-server-code.js', { stdio: 'inherit' });
  console.log('');

  // Étape 6 : Build Next.js
  console.log('🔨 Étape 6/8 : Build Next.js (export statique)...');
  execSync('next build', { stdio: 'inherit', shell: true });
  console.log('');

  // Étape 7 : Sync Capacitor
  console.log('📱 Étape 7/8 : Sync avec Capacitor Android...');
  execSync('npx cap sync android', { stdio: 'inherit' });
  console.log('');

  // Étape 8 : Restaurer tout
  console.log('🔄 Étape 8/8 : Restauration des fichiers...');

  // Restaurer next.config.ts
  fs.copyFileSync(nextConfigBackupPath, nextConfigPath);
  fs.unlinkSync(nextConfigBackupPath);
  console.log('✅ next.config.ts restauré');

  // Restaurer les pages dynamiques
  moveDynamicFolders(false);

  // Restaurer le code server-only
  execSync('node scripts/restore-server-code.js', { stdio: 'inherit' });
  console.log('');

  console.log('✅ BUILD APK TERMINÉ !');
  console.log('');
  console.log('📝 Prochaines étapes :');
  console.log('   1. Ouvrir Android Studio : npx cap open android');
  console.log('   2. Build → Build Bundle(s) / APK(s) → Build APK(s)');
  console.log('   3. Locate → Trouver l\'APK dans android/app/build/outputs/apk/');

} catch (error) {
  console.error('❌ Erreur lors du build APK :', error.message);

  // Toujours restaurer les fichiers en cas d'erreur
  console.log('\n🔄 Restauration des fichiers...');
  try {
    if (fs.existsSync(nextConfigBackupPath)) {
      fs.copyFileSync(nextConfigBackupPath, nextConfigPath);
      fs.unlinkSync(nextConfigBackupPath);
      console.log('✅ next.config.ts restauré');
    }
    moveDynamicFolders(false);
    execSync('node scripts/restore-server-code.js', { stdio: 'inherit' });
  } catch (restoreError) {
    console.error('❌ Erreur lors de la restauration :', restoreError.message);
  }

  process.exit(1);
}
