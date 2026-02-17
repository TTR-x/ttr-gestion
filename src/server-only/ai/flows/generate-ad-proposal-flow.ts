'use server';
/**
 * @fileOverview A flow to generate a targeted advertising proposal.
 *
 * - generateAdProposal: Generates a marketing campaign proposal based on business context.
 * - GenerateAdProposalInput: The input type for the function.
 * - GenerateAdProposalOutput: The return type for the function.
 */

import { z } from 'genkit';
import { ai } from '@/genkit.config';


const GenerateAdProposalInputSchema = z.object({
  businessType: z.string().describe("The user's business type, e.g., Hotel, Restaurant, Shop."),
  businessName: z.string().describe("The user's business name."),
  businessCountry: z.string().describe("The country where the business operates."),
});
export type GenerateAdProposalInput = z.infer<typeof GenerateAdProposalInputSchema>;

const GenerateAdProposalOutputSchema = z.object({
  headline: z.string().describe("A catchy headline for the ad campaign proposal."),
  targetAudience: z.string().describe("A brief description of the ideal target audience for the ads."),
  channels: z.string().describe("Recommended advertising channels, e.g., 'Facebook & Instagram'."),
  keyMessage: z.string().describe("The core, persuasive message to communicate in the ad."),
  callToAction: z.string().describe("The specific action the user should take after seeing the ad, e.g., 'Réserver maintenant', 'Commander via WhatsApp'."),
  budgetRecommendation: z.string().describe("A starting budget recommendation, mentioning the starting price of 5000F CFA."),
});
export type GenerateAdProposalOutput = z.infer<typeof GenerateAdProposalOutputSchema>;

const generateAdProposalFlow = ai.defineFlow(
  {
    name: 'generateAdProposalFlow',
    inputSchema: GenerateAdProposalInputSchema,
    outputSchema: GenerateAdProposalOutputSchema,
  },
  async (input) => {
    const systemPrompt = `
Tu es un expert en marketing digital pour les petites entreprises en Afrique. Ton objectif est de créer une proposition publicitaire simple, puissante et exploitable pour un utilisateur.
La sortie doit être un objet JSON valide conforme au schéma fourni.

L'entreprise de l'utilisateur est :
- Nom : ${input.businessName}
- Type : ${input.businessType}
- Pays : ${input.businessCountry}

Sur la base de ces informations, génère une proposition de campagne publicitaire convaincante. Le ton doit être professionnel, encourageant et clair.
La proposition doit être exclusivement en français.

- **Headline** (Titre) : Crée un titre percutant qui résume l'objectif de la campagne.
- **Target Audience** (Audience Cible) : Sois spécifique. Pour un restaurant à Lomé, suggère de cibler "jeunes adultes actifs à Lomé (20-35 ans) qui aiment sortir". Pour un hôtel, "touristes et voyageurs d'affaires".
- **Channels** (Canaux) : Suggère les plateformes de réseaux sociaux les plus pertinentes. "Facebook & Instagram" est un choix sûr pour la plupart.
- **Key Message** (Message Clé) : Quelle est la proposition de valeur unique ? Pour un hôtel, cela pourrait être "le confort et le calme au cœur de la ville". Pour une boutique, "des produits uniques de qualité".
- **Call To Action** (Appel à l'Action) : Que doit demander la publicité aux gens de faire ? Exemples : "Réservez votre table", "Contactez-nous sur WhatsApp", "Visitez notre boutique".
- **Budget Recommendation** (Recommandation Budgétaire) : C'est crucial. Indique clairement qu'une campagne peut démarrer à partir de 5000 FCFA et ce que cela pourrait permettre d'atteindre (ex : toucher des milliers de clients locaux potentiels). Exemple : "Nous recommandons un budget de départ de 5000 FCFA pour toucher des milliers de clients potentiels dans votre zone pendant plusieurs jours."
`;
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: systemPrompt,
      output: {
        format: 'json',
        schema: GenerateAdProposalOutputSchema,
      },
    });

    return llmResponse.output!;
  }
);


export async function generateAdProposal(input: GenerateAdProposalInput): Promise<GenerateAdProposalOutput> {
  try {
    return await generateAdProposalFlow(input);
  } catch (error) {
    console.error("Error in generateAdProposal flow:", error);
    throw new Error("L'assistant IA n'a pas pu répondre. Veuillez réessayer plus tard.");
  }
}
