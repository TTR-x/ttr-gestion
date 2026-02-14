
// genkit.config.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Note: This configuration is primarily for Genkit's internal tools and other flows.
// The main assistant flow now uses a direct SDK call.
// We keep googleAI here for other potential flows, like image generation.

export const ai = genkit({
  plugins: [
    googleAI(), // Kept for image generation or other Google-specific models
  ],
});
