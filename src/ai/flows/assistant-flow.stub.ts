
// Version client-only (stub) pour le build APK
// La vraie fonction est dans src/server-only/ai/flows/assistant-flow.ts

export interface AssistantMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AssistantInput {
    history: AssistantMessage[];
    userDisplayName?: string;
    businessContext?: {
        name: string;
        type: string;
        country: string;
    };
}

export async function runAssistant(input: AssistantInput): Promise<string> {
    console.warn('runAssistant: Server Actions non disponibles en mode APK');
    // Simulation simple pour l'UI, ou erreur explicite
    throw new Error('L\'assistant IA nécessite une connexion serveur');
}
