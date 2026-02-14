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
You are an AI that provides inspiring and practical wisdom for entrepreneurs.
Generate a single, concise, and motivational quote or piece of advice.
The output must be a valid JSON object that conforms to the provided schema.
The advice should be relevant for an entrepreneur running a business of type: ${input.businessType}.

The tone should be encouraging and wise. It can be a known proverb, a quote from a famous person, or a newly generated piece of wisdom.
Keep the text of the advice to one or two powerful sentences.

Examples:
- Text: "The only way to do great work is to love what you do.", Author: "Steve Jobs"
- Text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", Author: "Winston Churchill"
- Text: "A satisfied customer is the best business strategy of all.", Author: "Michael LeBoeuf"
- Text: "For your ${input.businessType}, remember that every detail counts. A small improvement can make a big difference in your customer's experience.", Author: "Sagesse d'Entrepreneur"
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
