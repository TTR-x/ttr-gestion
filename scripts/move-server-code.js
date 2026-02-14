const fs = require('fs');
const path = require('path');

/**
 * Script pour déplacer le code server-only hors du projet
 * Utilisé avant le build APK/EXE
 */

const SOURCE_DIR = path.join(__dirname, '..', 'src', 'server-only');
const BACKUP_DIR = path.join(__dirname, '..', 'server-only-backup');

console.log('🚀 Déplacement du code server-only...');

// Vérifier si le dossier source existe
if (!fs.existsSync(SOURCE_DIR)) {
    console.log('⚠️  Le dossier src/server-only n\'existe pas. Rien à déplacer.');
    process.exit(0);
}

// Supprimer le backup s'il existe déjà
if (fs.existsSync(BACKUP_DIR)) {
    console.log('🗑️  Suppression de l\'ancien backup...');
    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
}

// Déplacer le dossier
console.log(`📦 Déplacement de ${SOURCE_DIR} vers ${BACKUP_DIR}...`);
fs.renameSync(SOURCE_DIR, BACKUP_DIR);

// Fix: Also swap the assistant-flow.ts with the stub to avoid build errors
const ASSISTANT_FLOW_PATH = path.join(__dirname, '..', 'src', 'ai', 'flows', 'assistant-flow.ts');
const ASSISTANT_FLOW_STUB_PATH = path.join(__dirname, '..', 'src', 'ai', 'flows', 'assistant-flow.stub.ts');
const ASSISTANT_FLOW_BACKUP_PATH = path.join(__dirname, '..', 'src', 'ai', 'flows', 'assistant-flow.backup.ts');

if (fs.existsSync(ASSISTANT_FLOW_PATH) && fs.existsSync(ASSISTANT_FLOW_STUB_PATH)) {
    console.log('🔄 Swapping assistant-flow.ts with stub for APK build...');
    fs.copyFileSync(ASSISTANT_FLOW_PATH, ASSISTANT_FLOW_BACKUP_PATH);
    fs.copyFileSync(ASSISTANT_FLOW_STUB_PATH, ASSISTANT_FLOW_PATH);
    console.log('✅ Assistant flow swapped with stub.');
} else {
    console.warn('⚠️ Assistant flow stub or source not found. Skipping swap.');
}

console.log('✅ Code server-only déplacé avec succès !');
console.log(`   Source: ${SOURCE_DIR}`);
console.log(`   Backup: ${BACKUP_DIR}`);
