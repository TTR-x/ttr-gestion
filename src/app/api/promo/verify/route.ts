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
        const ABT_WEBHOOK_URL = 'https://ton-domaine-abt.vercel.app/api/webhooks/ttr'; // À remplacer par URL prod si différente, ou env var
        const ABT_API_KEY = 'TTRABTogbsqknlkszfv5GNGDkvfdcbvnnh4865365893';

        // Construction du payload ABT
        const eventType = status === 'actif' ? 'SUBSCRIPTION_PAYMENT' : 'CLIENT_SIGNUP';

        const payload = {
            eventType,
            ambassadorId: promoCode, // Le code promo EST l'ambassadorId
            clientName: clientName || `Business ${businessId.substring(0, 6)}`, // Fallback si non fourni
            clientEmail: clientEmail || `no-email-${businessId}@ttr.com`, // Fallback
            amount: amount || 0
        };

        console.log(`[Promo API] Sending webhook to ABT (${eventType}):`, { payload, ip });

        // 3. Appel Webhook ABT
        const abtResponse = await fetch(ABT_WEBHOOK_URL, {
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
            console.error('[Promo API] ABT Webhook error:', {
                status: abtResponse.status,
                error: responseData.error || abtResponse.statusText,
                payload
            });

            if (abtResponse.status === 404) {
                return NextResponse.json(
                    { success: false, error: 'Code promo invalide.' },
                    { status: 404 }
                );
            }

            // En cas d'erreur 500 ou autre du côté ABT, on renvoie une erreur générique mais on log tout
            return NextResponse.json(
                { success: false, error: responseData.error || 'Erreur lors de la communication avec le programme ambassadeur.' },
                { status: abtResponse.status }
            );
        }

        console.log('[Promo API] ABT Webhook success:', responseData);

        // 5. Succès
        // On renvoie ambassadorId comme étant le code promo validé, car c'est ce que le frontend attend
        return NextResponse.json({
            success: true,
            ambassadorId: promoCode,
            message: responseData.message || 'Code promo validé avec succès !',
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
