
'use server';

import { revalidatePath } from "next/cache";

export async function triggerAbtNotification(payload: { promoCode: string; businessId: string; commissionAmount: number; }) {
  const { promoCode, businessId, commissionAmount } = payload;
  
  // Utilise la variable d'environnement côté serveur
  const cloudflareProxyUrl = process.env.CLOUDFLARE_PROXY_URL;
  
  if (!cloudflareProxyUrl) {
    console.error("CLOUDFLARE_PROXY_URL is not set on the server.");
    return { success: false, error: "La configuration du serveur est incomplète (URL du proxy manquante)." };
  }

  try {
    const response = await fetch(cloudflareProxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        promoCode,
        businessId,
        status: 'actif',
        commissionAmount,
      }),
      // Important for server-to-server calls, especially with self-signed certs in dev
      // In production, you might not need this if your proxy has a valid cert.
      // agent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`ABT Notification Error: ${response.status} ${response.statusText}`, errorBody);
      return { success: false, error: `L'API partenaire a répondu avec une erreur : ${errorBody || response.statusText}` };
    }

    // Optionally revalidate a path if this action should trigger a data refresh on a page
    // revalidatePath('/admin/approvals');

    return { success: true };

  } catch (error: any) {
    console.error("Failed to trigger ABT notification:", error);
    return { success: false, error: error.message || "Une erreur de réseau ou de serveur est survenue." };
  }
}
