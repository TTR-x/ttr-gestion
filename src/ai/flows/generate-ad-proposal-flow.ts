// Version client-only (stub) pour le build APK
// La vraie fonction est dans src/server-only/ai/flows/generate-ad-proposal-flow.ts

export async function generateAdProposalFlow(): Promise<any> {
    console.warn('generateAdProposalFlow: Server Actions non disponibles en mode APK');
    throw new Error('La génération de publicités nécessite une connexion serveur');
}
