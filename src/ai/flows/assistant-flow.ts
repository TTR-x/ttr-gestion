// Version PWA (Web) - Redirige vers l'implémentation serveur
// Pour le build APK, ce fichier doit être remplacé par le stub (géré par le script de build)

import { runAssistant as serverRunAssistant, type AssistantInput as ServerAssistantInput, type AssistantMessage as ServerAssistantMessage } from '@/server-only/ai/flows/assistant-flow';

export type AssistantMessage = ServerAssistantMessage;
export type AssistantInput = ServerAssistantInput;

export const runAssistant = serverRunAssistant;

