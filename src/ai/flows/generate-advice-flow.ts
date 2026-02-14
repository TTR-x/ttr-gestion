// Version client-only (stub) pour le build APK
// La vraie fonction est dans src/server-only/ai/flows/generate-advice-flow.ts

export async function generateAdviceFlow(): Promise<any> {
    console.warn('generateAdviceFlow: Server Actions non disponibles en mode APK');
    throw new Error('La génération de conseils nécessite une connexion serveur');
}
