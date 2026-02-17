import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema de validation
const verifyPromoSchema = z.object({
    promoCode: z.string().min(3, "Le code promo doit contenir au moins 3 caractères").max(20, "Le code promo ne peut pas dépasser 20 caractères").regex(/^[A-Z0-9-]+$/i, "Le code promo ne peut contenir que des lettres, chiffres et tirets"),
    businessId: z.string().min(10, "ID d'entreprise invalide"),
    status: z.enum(['inscrit', 'actif']).optional().default('inscrit'),
});

// Rate limiting simple (en mémoire - pour production, utiliser Redis)
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 10; // Maximum 10 requêtes par minute

    if (!rateLimitMap.has(identifier)) {
        rateLimitMap.set(identifier, [now]);
        return { allowed: true };
    }

    const requestTimes = rateLimitMap.get(identifier)!;
    const recentRequests = requestTimes.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
        const oldestRequest = Math.min(...recentRequests);
        const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
        return { allowed: false, retryAfter };
    }

    recentRequests.push(now);
    rateLimitMap.set(identifier, recentRequests);

    // Nettoyer les anciennes entrées (évite la fuite mémoire)
    if (recentRequests.length > maxRequests * 2) {
        rateLimitMap.set(identifier, recentRequests.slice(-maxRequests));
    }

    return { allowed: true };
}

export async function POST(request: NextRequest) {
    try {
        // 1. Rate limiting basé sur l'IP
        const forwardedFor = request.headers.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0] : request.ip || 'unknown';

        const rateLimitResult = checkRateLimit(ip);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Trop de tentatives. Veuillez réessayer dans ${rateLimitResult.retryAfter} secondes.`
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
                    }
                }
            );
        }

        // 2. Validation du corps de la requête
        const body = await request.json();
        const validationResult = verifyPromoSchema.safeParse(body);

        if (!validationResult.success) {
            const errors = validationResult.error.errors.map(e => e.message).join(', ');
            console.warn('[Promo API] Validation failed:', errors, { ip, body });
            return NextResponse.json(
                { success: false, error: `Données invalides: ${errors}` },
                { status: 400 }
            );
        }

        const { promoCode, businessId, status } = validationResult.data;

        // 3. Vérifier que l'URL du proxy est configurée
        const cloudflareProxyUrl = process.env.CLOUDFLARE_PROXY_URL;
        if (!cloudflareProxyUrl) {
            console.error('[Promo API] CLOUDFLARE_PROXY_URL is not configured');
            return NextResponse.json(
                {
                    success: false, error: "Configuration serveur incomplète. Contactez l'administrateur."
                },
                { status: 500 }
            );
        }

        console.log('[Promo API] Verifying promo code:', { promoCode, businessId, status, ip });

        // 4. Appeler le proxy Cloudflare
        const proxyResponse = await fetch(cloudflareProxyUrl, {
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

        if (!proxyResponse.ok) {
            const errorText = await proxyResponse.text();
            console.error('[Promo API] Proxy error:', {
                status: proxyResponse.status,
                statusText: proxyResponse.statusText,
                error: errorText,
                promoCode,
            });

            // Retourner des messages d'erreur utilisateur-friendly
            if (proxyResponse.status === 404) {
                return NextResponse.json(
                    { success: false, error: 'Code promo invalide ou expiré.' },
                    { status: 404 }
                );
            }

            if (proxyResponse.status === 400) {
                return NextResponse.json(
                    { success: false, error: 'Code promo invalide.' },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { success: false, error: 'Erreur lors de la validation du code promo. Veuillez réessayer.' },
                { status: proxyResponse.status }
            );
        }

        // 5. Parser et valider la réponse
        const responseData = await proxyResponse.json();

        if (!responseData || !responseData.ambassadorId) {
            console.error('[Promo API] Invalid response from proxy:', responseData);
            return NextResponse.json(
                { success: false, error: 'Réponse invalide du service de validation.' },
                { status: 500 }
            );
        }

        console.log('[Promo API] Promo code verified successfully:', {
            promoCode,
            ambassadorId: responseData.ambassadorId,
            businessId,
        });

        // 6. Retourner le succès
        return NextResponse.json({
            success: true,
            ambassadorId: responseData.ambassadorId,
            message: 'Code promo validé avec succès !',
        });

    } catch (error: any) {
        console.error('[Promo API] Unexpected error:', error);

        // Différencier les erreurs réseau des autres erreurs
        if (error.name === 'FetchError' || error.message?.includes('fetch')) {
            return NextResponse.json(
                { success: false, error: 'Impossible de contacter le service de validation. Vérifiez votre connexion internet.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Une erreur inattendue s\'est produite. Veuillez réessayer.' },
            { status: 500 }
        );
    }
}

// Méthodes non autorisées
export async function GET() {
    return NextResponse.json(
        { error: 'Méthode non autorisée. Utilisez POST.' },
        { status: 405 }
    );
}
