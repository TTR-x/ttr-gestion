const fs = require('fs');
const path = require('path');

/**
 * Script pour restaurer le code server-only dans le projet
 * Utilisé après le build APK/EXE
 */

const SOURCE_DIR = path.join(__dirname, '..', 'src', 'server-only');
const BACKUP_DIR = path.join(__dirname, '..', 'server-only-backup');

console.log('🔄 Restauration du code server-only...');

// Vérifier si le backup existe
if (!fs.existsSync(BACKUP_DIR)) {
    console.log('⚠️  Aucun backup trouvé. Rien à restaurer.');
    process.exit(0);
}

// Supprimer le dossier source s'il existe (ne devrait pas)
if (fs.existsSync(SOURCE_DIR)) {
    console.log('⚠️  Le dossier src/server-only existe déjà. Suppression...');
    fs.rmSync(SOURCE_DIR, { recursive: true, force: true });
}

// Restaurer le dossier
console.log(`📦 Restauration de ${BACKUP_DIR} vers ${SOURCE_DIR}...`);
fs.renameSync(BACKUP_DIR, SOURCE_DIR);

// Fix: Restore assistant-flow.ts from backup
const ASSISTANT_FLOW_PATH = path.join(__dirname, '..', 'src', 'ai', 'flows', 'assistant-flow.ts');
const ASSISTANT_FLOW_BACKUP_PATH = path.join(__dirname, '..', 'src', 'ai', 'flows', 'assistant-flow.backup.ts');

if (fs.existsSync(ASSISTANT_FLOW_BACKUP_PATH)) {
    console.log('🔄 Restoring assistant-flow.ts from backup...');
    fs.copyFileSync(ASSISTANT_FLOW_BACKUP_PATH, ASSISTANT_FLOW_PATH);
    fs.unlinkSync(ASSISTANT_FLOW_BACKUP_PATH);
    console.log('✅ Assistant flow restored.');
} else {
    // If backup missing, maybe it wasn't swapped or failed. Warn but don't fail.
    console.warn('⚠️ No assistant-flow backup found to restore.');
}

console.log('✅ Code server-only restauré avec succès !');
console.log(`   Backup: ${BACKUP_DIR}`);
console.log(`   Source: ${SOURCE_DIR}`);
