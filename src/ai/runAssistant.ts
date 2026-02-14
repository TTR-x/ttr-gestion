// Version client-only (stub) pour le build APK
// La vraie fonction est dans src/server-only/ai/runAssistant.ts

export async function runAssistant(): Promise<any> {
    console.warn('runAssistant: Server Actions non disponibles en mode APK');
    throw new Error('L\'assistant nécessite une connexion serveur');
}
