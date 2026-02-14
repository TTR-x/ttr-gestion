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
You are a digital marketing expert for small businesses in Africa. Your goal is to create a simple, powerful, and actionable advertising proposal for a user.
The output must be a valid JSON object that conforms to the provided schema.

The user's business is:
- Name: ${input.businessName}
- Type: ${input.businessType}
- Country: ${input.businessCountry}

Based on this information, generate a compelling ad campaign proposal. The tone should be professional, encouraging, and clear.
The proposal must be in French.

- **Headline**: Create a punchy headline that summarizes the campaign's goal.
- **Target Audience**: Be specific. For a restaurant in Lomé, suggest targeting "jeunes adultes actifs à Lomé (20-35 ans) qui aiment sortir". For a hotel, "touristes et voyageurs d'affaires".
- **Channels**: Suggest the most relevant social media platforms. "Facebook & Instagram" is a safe bet for most.
- **Key Message**: What is the unique selling proposition? For a hotel, it could be "le confort et le calme au cœur de la ville". For a shop, "des produits uniques de qualité".
- **Call To Action**: What should the ad ask people to do? Examples: "Réservez votre table", "Contactez-nous sur WhatsApp", "Visitez notre boutique".
- **Budget Recommendation**: This is crucial. State clearly that a campaign can start from 5000 FCFA and what that could achieve (e.g., reach thousands of potential local customers). Example: "Nous recommandons un budget de départ de 5000 FCFA pour toucher des milliers de clients potentiels dans votre zone pendant plusieurs jours."
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
