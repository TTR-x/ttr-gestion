const fs = require('fs');
const path = require('path');

/**
 * Script pour ajouter generateStaticParams() aux pages dynamiques [id]
 */

const dynamicPages = [
    'src/app/(dashboard)/clients/[id]/edit/page.tsx',
    'src/app/(dashboard)/clients/[id]/receipt/page.tsx',
    'src/app/(dashboard)/expenses/[id]/edit/page.tsx',
    'src/app/(dashboard)/investments/[id]/edit/page.tsx',
    'src/app/(dashboard)/reservations/[id]/edit/page.tsx',
    'src/app/(dashboard)/reservations/[id]/receipt/page.tsx',
    'src/app/(dashboard)/stock/[id]/edit/page.tsx',
    'src/app/(dashboard)/stock/[id]/receipt/page.tsx',
];

const generateStaticParamsCode = `
// Fonction requise pour l'export statique
export async function generateStaticParams() {
  // Retourne un tableau vide car ces pages sont dynamiques
  // et seront générées côté client
  return [];
}
`;

console.log('🔧 Ajout de generateStaticParams() aux pages dynamiques...\n');

dynamicPages.forEach(pagePath => {
    const fullPath = path.join(__dirname, '..', pagePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  Fichier non trouvé : ${pagePath}`);
        return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');

    // Vérifier si generateStaticParams existe déjà
    if (content.includes('generateStaticParams')) {
        console.log(`✓ ${pagePath} - déjà configuré`);
        return;
    }

    // Ajouter generateStaticParams après les imports et avant le composant
    // Trouver la dernière ligne d'import
    const lines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('from ')) {
            lastImportIndex = i;
        }
    }

    // Insérer après les imports
    if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, generateStaticParamsCode);
        content = lines.join('\n');

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ ${pagePath} - generateStaticParams ajouté`);
    } else {
        console.log(`⚠️  ${pagePath} - impossible de trouver les imports`);
    }
});

console.log('\n✅ Terminé !');
