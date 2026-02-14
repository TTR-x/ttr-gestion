// Version client-only (stub) pour le build APK
// Les vraies fonctions sont dans src/server-only/lib/payment.ts

export async function processPayment(): Promise<void> {
    console.warn('Server Actions non disponibles en mode APK');
    throw new Error('Cette fonctionnalité nécessite une connexion serveur');
}
