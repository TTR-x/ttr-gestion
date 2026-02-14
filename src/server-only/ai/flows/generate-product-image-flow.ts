
'use server';
/**
 * @fileOverview Flow to generate a product image using AI.
 *
 * - generateProductImage: A function that generates an image for a given product name.
 * - GenerateProductImageInput: The input type for the function.
 * - GenerateProductImageOutput: The return type for the function.
 */

import { z } from 'genkit';
import { ai } from '@/genkit.config';
import { uploadDataUriToCloudinary } from '@/lib/cloudinary';


const GenerateProductImageInputSchema = z.object({
  productName: z.string().describe("The name of the product for which to generate an image."),
});
export type GenerateProductImageInput = z.infer<typeof GenerateProductImageInputSchema>;
export type GenerateProductImageOutput = { imageUrl: string };

export async function generateProductImage(input: GenerateProductImageInput): Promise<GenerateProductImageOutput> {
  return generateProductImageFlow(input);
}

const generateProductImageFlow = ai.defineFlow(
  {
    name: 'generateProductImageFlow',
    inputSchema: GenerateProductImageInputSchema,
    outputSchema: z.object({ imageUrl: z.string() }),
  },
  async ({ productName }) => {

    // Using a more advanced model for better image quality and a more descriptive prompt.
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `Crée une image photo-réaliste et de haute qualité de type publicitaire pour le produit suivant : "${productName}". 
      L'image doit être attrayante, avec un éclairage professionnel. 
      Le produit doit être mis en scène dans un contexte approprié. Par exemple: 
      - pour du "pain", on pourrait voir plusieurs pains dans un panier sur une table en bois.
      - pour du "savon", il pourrait être sur le bord d'un lavabo avec quelques bulles.
      - pour des "biscuits", ils pourraient être dans une boîte ouverte sur une nappe.
      Adapte la mise en scène au produit : "${productName}".`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const media = llmResponse.media;
    const aiGeneratedDataUri = media?.url;
    if (!aiGeneratedDataUri) {
      throw new Error('Image generation failed, no media URL returned.');
    }

    // Upload the AI-generated image (as a Data URI) to Cloudinary
    const imageUrl = await uploadDataUriToCloudinary(aiGeneratedDataUri);

    return { imageUrl };
  }
);
