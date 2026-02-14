const fs = require('fs');
const path = require('path');

/**
 * Script pour restructurer les dossiers dynamiques [id] ou [id].backup
 * Déplace edit/ et receipt/ directement sous leur entité parente
 */

console.log('🔧 RESTRUCTURATION DES DOSSIERS DYNAMIQUES\n');

const rootDir = path.join(__dirname, '..');

// Entités à restructurer
const entities = [
    'src/app/(dashboard)/clients',
    'src/app/(dashboard)/expenses',
    'src/app/(dashboard)/investments',
    'src/app/(dashboard)/reservations',
    'src/app/(dashboard)/stock',
];

entities.forEach(entityPath => {
    const fullPath = path.join(rootDir, entityPath);

    // Chercher [id] ou [id].backup
    let idFolder = path.join(fullPath, '[id]');
    if (!fs.existsSync(idFolder)) {
        idFolder = path.join(fullPath, '[id].backup');
    }

    if (!fs.existsSync(idFolder)) {
        console.log(`⚠️  ${entityPath}/[id] n'existe pas`);
        return;
    }

    const folderName = path.basename(idFolder);
    console.log(`📁 Restructuration de ${entityPath}/${folderName}...`);

    // Lister les sous-dossiers de [id] ou [id].backup
    const subFolders = fs.readdirSync(idFolder);

    subFolders.forEach(subFolder => {
        const srcPath = path.join(idFolder, subFolder);
        const destPath = path.join(fullPath, subFolder);

        if (fs.statSync(srcPath).isDirectory()) {
            // Déplacer le sous-dossier
            if (fs.existsSync(destPath)) {
                console.log(`  ⚠️  ${subFolder}/ existe déjà, suppression de l'ancien...`);
                fs.rmSync(destPath, { recursive: true, force: true });
            }

            fs.renameSync(srcPath, destPath);
            console.log(`  ✓ ${subFolder}/ déplacé`);
        }
    });

    // Supprimer le dossier [id] ou [id].backup vide
    fs.rmSync(idFolder, { recursive: true, force: true });
    console.log(`  ✓ ${folderName}/ supprimé\n`);
});

console.log('✅ Restructuration terminée !');
console.log('\n⚠️  IMPORTANT : Vous devez maintenant mettre à jour les liens dans votre code :');
console.log('   Avant : /clients/[id]/edit');
console.log('   Après  : /clients/edit?id=xxx\n');
