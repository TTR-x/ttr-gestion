'use server';
/**
 * @fileOverview A flow to generate daily entrepreneurial advice.
 *
 * - generateAdvice: A function that generates a piece of advice for an entrepreneur.
 * - GenerateAdviceInput: The input type for the function.
 * - GenerateAdviceOutput: The return type for the function.
 */

import { z } from 'genkit';
import { ai } from '@/genkit.config';

const GenerateAdviceInputSchema = z.object({
  businessType: z.string().describe("The user's business type, e.g., Hotel, Restaurant, Shop."),
});
export type GenerateAdviceInput = z.infer<typeof GenerateAdviceInputSchema>;

const GenerateAdviceOutputSchema = z.object({
  text: z.string().describe("The generated piece of advice or quote."),
  author: z.string().describe("The author of the quote. Can be a famous person or a general term like 'Proverbe Chinois' or 'Sagesse d'Entrepreneur'."),
});
export type GenerateAdviceOutput = z.infer<typeof GenerateAdviceOutputSchema>;

const generateAdviceFlow = ai.defineFlow(
  {
    name: 'generateAdviceFlow',
    inputSchema: GenerateAdviceInputSchema,
    outputSchema: GenerateAdviceOutputSchema,
  },
  async (input) => {
    const systemPrompt = `
Tu es une IA qui fournit de la sagesse inspirante et pratique pour les entrepreneurs.
Génère une seule citation ou un conseil motivant, concis et puissant.
La sortie doit être un objet JSON valide conforme au schéma fourni.
Le conseil doit être pertinent pour un entrepreneur gérant une entreprise de type : ${input.businessType}.

Le ton doit être encourageant et sage. Il peut s'agir d'un proverbe connu, d'une citation d'une personne célèbre ou d'un conseil original généré par tes soins.
Limite le texte du conseil à une ou deux phrases percutantes.
La réponse doit être exclusivement en français.

Exemples :
- Texte : "La seule façon de faire du bon travail est d'aimer ce que vous faites.", Auteur : "Steve Jobs"
- Texte : "Le succès n'est pas définitif, l'échec n'est pas fatal : c'est le courage de continuer qui compte.", Auteur : "Winston Churchill"
- Texte : "Un client satisfait est la meilleure stratégie commerciale de toutes.", Auteur : "Michael LeBoeuf"
- Texte : "Pour votre ${input.businessType}, n'oubliez pas que chaque détail compte. Une petite amélioration peut faire une grande différence dans l'expérience de vos clients.", Auteur : "Sagesse d'Entrepreneur"
`;
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: systemPrompt,
      output: {
        format: 'json',
        schema: GenerateAdviceOutputSchema,
      },
    });

    return llmResponse.output!;
  }
);

export async function generateAdvice(input: GenerateAdviceInput): Promise<GenerateAdviceOutput> {
  try {
    return await generateAdviceFlow(input);
  } catch (error) {
    console.error("Error in generateAdvice flow:", error);
    throw new Error("L'assistant IA n'a pas pu répondre. Veuillez réessayer plus tard.");
  }
}
