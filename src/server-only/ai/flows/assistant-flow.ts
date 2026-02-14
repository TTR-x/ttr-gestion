
'use server';
/**
 * @fileOverview Ce fichier définit les types de données pour l'assistant IA
 * et exporte la logique principale qui effectue l'appel à l'API.
 *
 * - AssistantInput - Le type d'entrée pour la fonction.
 * - AssistantMessage - Le type pour un message unique dans l'historique.
 * - AssistantOutput - Le type de retour pour la fonction.
 */

import { z } from 'zod';
import { runAssistant as runAssistantLogic } from '../runAssistant';

export const runAssistant = runAssistantLogic;

// Définition des schémas Zod pour la validation des entrées/sorties.
// Ces types sont partagés avec le composant React qui appelle l'assistant.

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const AssistantInputSchema = z.object({
  history: z.array(MessageSchema).describe("L'historique de la conversation."),
  userDisplayName: z.string().describe("Le nom de l'utilisateur pour la personnalisation."),
  businessContext: z.object({
    name: z.string().describe("Le nom de l'entreprise de l'utilisateur."),
    type: z.string().describe("Le type d'activité de l'entreprise (ex: Hôtel, Restaurant)."),
    country: z.string().describe("Le pays où est située l'entreprise."),
  }).describe("Le contexte de l'entreprise pour personnaliser la réponse."),
  skipIntroduction: z.boolean().optional().describe("Si vrai, TRIX saute ses présentations formelles.")
});

export type AssistantInput = z.infer<typeof AssistantInputSchema>;
export type AssistantMessage = z.infer<typeof MessageSchema>;
export type AssistantOutput = string;
