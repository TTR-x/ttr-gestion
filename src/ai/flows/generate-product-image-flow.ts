// Version client-only (stub) pour le build APK
// La vraie fonction est dans src/server-only/ai/flows/generate-product-image-flow.ts

export async function generateProductImageFlow(): Promise<any> {
    console.warn('generateProductImageFlow: Server Actions non disponibles en mode APK');
    throw new Error('La génération d\'images nécessite une connexion serveur');
}
