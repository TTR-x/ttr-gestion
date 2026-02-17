/**
 * Service de Gestion des Codes Promo
 * 
 * Ce service unifie la logique de validation des codes promo pour toutes les plateformes :
 * - Web/PWA : Utilise des URLs relatives
 * - APK Android : Utilise l'URL complète de la PWA
 * - EXE Windows : Utilise l'URL complète de la PWA
 */

export interface PromoVerificationResult {
    success: boolean;
    ambassadorId?: string;
    message?: string;
    error?: string;
}

export interface PromoVerificationPayload {
    promoCode: string;
    businessId: string;
    status?: 'inscrit' | 'actif';
}

/**
 * Détermine l'URL de base pour les appels API
 * @returns L'URL de base (vide pour Web/PWA, URL complète pour APK/EXE)
 */
function getApiBaseUrl(): string {
    // Pour Web/PWA en production, utiliser URL relative
    if (typeof window !== 'undefined' && window.location.hostname.includes('ttrgestion.site')) {
        return '';
    }

    // Pour APK et EXE, utiliser l'URL de la PWA configurée
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!baseUrl) {
        console.warn('[PromoService] NEXT_PUBLIC_API_BASE_URL not set. Using relative URL.');
        return '';
    }

    return baseUrl;
}

/**
 * Vérifie un code promo via l'API TTR Gestion
 * 
 * @param promoCode - Le code promo à vérifier
 * @param businessId - L'ID de l'entreprise qui utilise le code
 * @param status - Le statut de l'utilisation ('inscrit' ou 'actif')
 * @returns Résultat de la vérification avec ambassadorId si succès
 * 
 * @example
 * ```typescript
 * const result = await verifyPromoCode('ABC123', 'biz_123', 'inscrit');
 * if (result.success) {
 *   console.log('Ambassadeur ID:', result.ambassadorId);
 * } else {
 *   console.error('Erreur:', result.error);
 * }
 * ```
 */
export async function verifyPromoCode(
    promoCode: string,
    businessId: string,
    status: 'inscrit' | 'actif' = 'inscrit'
): Promise<PromoVerificationResult> {
    try {
        const baseUrl = getApiBaseUrl();
        const apiUrl = `${baseUrl}/api/promo/verify`;

        console.log('[PromoService] Verifying promo code:', {
            promoCode,
            businessId,
            status,
            apiUrl
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                promoCode,
                businessId,
                status,
            }),
        });

        // Parse la réponse JSON
        const data = await response.json();

        // Si la requête n'a pas réussi
        if (!response.ok) {
            console.error('[PromoService] Verification failed:', {
                status: response.status,
                data,
            });

            return {
                success: false,
                error: data.error || `Erreur ${response.status}: ${response.statusText}`,
            };
        }

        // Succès
        console.log('[PromoService] Verification successful:', data);
        return {
            success: true,
            ambassadorId: data.ambassadorId,
            message: data.message || 'Code promo validé avec succès',
        };

    } catch (error: any) {
        console.error('[PromoService] Unexpected error:', error);

        // Erreur réseau
        if (error.name === 'TypeError' && error.message?.includes('fetch')) {
            return {
                success: false,
                error: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
            };
        }

        // Autre erreur
        return {
            success: false,
            error: error.message || 'Une erreur inattendue s\'est produite.',
        };
    }
}

/**
 * Notifie l'application ABT d'une activation d'abonnement
 * 
 * Cette fonction est appelée côté serveur après l'approbation d'un paiement
 * 
 * @param promoCode - Le code promo utilisé
 * @param businessId - L'ID de l'entreprise
 * @param commissionAmount - Le montant de la commission
 * @returns Résultat de la notification
 */
export async function notifyAbtActivation(
    promoCode: string,
    businessId: string,
    commissionAmount: number
): Promise<PromoVerificationResult> {
    try {
        const baseUrl = getApiBaseUrl();
        const apiUrl = `${baseUrl}/api/promo/verify`;

        console.log('[PromoService] Notifying ABT activation:', {
            promoCode,
            businessId,
            commissionAmount
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                promoCode,
                businessId,
                status: 'actif',
                commissionAmount, // Optionnel, pour info
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[PromoService] ABT notification failed:', data);
            // Non-critique : on ne bloque pas le flux principal
            return {
                success: false,
                error: data.error || 'Échec de la notification ABT',
            };
        }

        console.log('[PromoService] ABT notified successfully');
        return {
            success: true,
            message: 'ABT notifié avec succès',
        };

    } catch (error: any) {
        console.error('[PromoService] ABT notification error:', error);
        // Non-critique : on retourne false mais on ne throw pas
        return {
            success: false,
            error: error.message || 'Erreur lors de la notification ABT',
        };
    }
}

/**
 * Valide le format d'un code promo (avant envoi au serveur)
 * 
 * @param promoCode - Le code à valider
 * @returns true si le format est valide
 */
export function isValidPromoCodeFormat(promoCode: string): boolean {
    if (!promoCode || promoCode.length < 3 || promoCode.length > 20) {
        return false;
    }

    // Accepte seulement lettres, chiffres et tirets
    const validFormat = /^[A-Z0-9-]+$/i;
    return validFormat.test(promoCode);
}

/**
 * Nettoie un code promo (enlève espaces, met en majuscules)
 * 
 * @param promoCode - Le code à nettoyer
 * @returns Le code nettoyé
 */
export function sanitizePromoCode(promoCode: string): string {
    return promoCode.trim().toUpperCase();
}
