import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema de validation mis à jour pour correspondre à l'intégration ABT
const verifyPromoSchema = z.object({
    promoCode: z.string().min(3, "Le code promo doit contenir au moins 3 caractères").max(20, "Le code promo ne peut pas dépasser 20 caractères").regex(/^[A-Z0-9-]+$/i, "Le code promo ne peut contenir que des lettres, chiffres et tirets"),
    businessId: z.string().min(10, "ID d'entreprise invalide"),
    status: z.enum(['inscrit', 'actif']).optional().default('inscrit'),
    // Nouveaux champs optionnels pour le payload ABT
    clientName: z.string().optional(),
    clientEmail: z.string().email().optional(),
    amount: z.number().optional().default(0),
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

        const { promoCode, businessId, status, clientName, clientEmail, amount } = validationResult.data;

        // Configuration ABT
        const ABT_BASE_URL = 'https://ambassadeur.ttrgestion.site';
        const ABT_API_KEY = 'TTRABTogbsqknlkszfv5GNGDkvfdcbvnnh4865365893';

        // Choix de l'endpoint en fonction du statut
        const isNotification = status === 'inscrit' || status === 'actif';
        const targetEndpoint = isNotification ? '/api/webhooks/ttr' : '/api/promo/verify';
        const fullUrl = `${ABT_BASE_URL}${targetEndpoint}`;

        // Construction du payload ABT
        const eventType = status === 'actif' ? 'SUBSCRIPTION_PAYMENT' : 'CLIENT_SIGNUP';

        const payload: any = {
            ambassadorId: promoCode,
            promoCode: promoCode, // Double champ pour flexibilité
        };

        if (isNotification) {
            payload.eventType = eventType;
            payload.clientName = clientName || `Business ${businessId.substring(0, 6)}`;
            payload.clientEmail = clientEmail || `no-email-${businessId}@ttr.com`;
            payload.amount = amount || 0;
            payload.businessId = businessId;
        }

        console.log(`[Promo API] Sending to ABT - Endpoint: ${targetEndpoint} - Promo: ${promoCode}`);

        // 3. Appel API ABT
        const abtResponse = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ABT_API_KEY
            },
            body: JSON.stringify(payload),
        });

        // 4. Gestion de la réponse
        const responseData = await abtResponse.json().catch(() => ({}));

        if (!abtResponse.ok) {
            console.error('[Promo API] ABT error:', {
                status: abtResponse.status,
                endpoint: targetEndpoint,
                error: responseData.error || responseData.message || abtResponse.statusText,
                payload
            });

            return NextResponse.json(
                {
                    success: false,
                    error: responseData.error || responseData.message || 'Code promo non trouvé ou invalide sur le service Ambassadeur.',
                    details: responseData.error ? 'ABT_ERROR' : 'API_ERROR'
                },
                { status: abtResponse.status }
            );
        }

        console.log('[Promo API] ABT success:', responseData);

        // 5. Succès
        return NextResponse.json({
            success: true,
            ambassadorId: promoCode,
            message: responseData.message || 'Opération réussie !',
            monoyiEarned: responseData.monoyiEarned
        });

    } catch (error: any) {
        console.error('[Promo API] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: 'Une erreur inattendue s\'est produite.' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json(
        { error: 'Méthode non autorisée. Utilisez POST.' },
        { status: 405 }
    );
}
