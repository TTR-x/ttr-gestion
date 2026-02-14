
import { NextResponse } from 'next/server';
import { fetchUserByUid, getBusinessProfile, getStockItems, getAuthorizedAppByApiKey, adjustStockQuantity, addQuickIncome } from '@/lib/firebase/database';

export const dynamic = 'force-dynamic';

// Helper to create a response with CORS headers
function createCorsResponse(body: any, status: number) {
    return NextResponse.json(body, {
        status,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function OPTIONS() {
    // Handle preflight requests for CORS
    return createCorsResponse({}, 200);
}

export async function POST(request: Request) {
  try {
    const { action, payload, apiKey } = await request.json();

    if (!apiKey) {
      return createCorsResponse({ error: 'Clé API manquante.' }, 401);
    }

    const authorizedApp = await getAuthorizedAppByApiKey(apiKey);
    if (!authorizedApp) {
        return createCorsResponse({ error: 'Accès non autorisé : Clé API invalide.' }, 403);
    }

    // --- Action to get user info ---
    if (action === 'getUserInfo') {
        const { userId } = payload;
        if (!userId) return createCorsResponse({ error: 'userId est requis.' }, 400);

        const user = await fetchUserByUid(userId);
        if (!user || !user.businessId) {
            return createCorsResponse({ error: 'Utilisateur ou entreprise associée non trouvé.' }, 404);
        }
        
        const businessProfile = await getBusinessProfile(user.businessId);
        if (!businessProfile) {
            return createCorsResponse({ error: 'Profil d\'entreprise non trouvé.' }, 404);
        }

        const stockItemsForSale = (await getStockItems(user.businessId, user.assignedWorkspaceId))?.filter(item => item.isForSale);

        const publicData = {
            user: { uid: user.uid, displayName: user.displayName, email: user.email, phoneNumber: user.phoneNumber || null },
            business: { id: user.businessId, name: businessProfile.name, type: businessProfile.type, country: businessProfile.country, currency: businessProfile.currency, logoUrl: businessProfile.logoUrl || null },
            products: stockItemsForSale?.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.currentQuantity, imageUrl: item.imageUrl || null })) || [],
        };
        return createCorsResponse(publicData, 200);
    }
    
    // --- Action to process a sale ---
    if (action === 'processSale') {
        const { sellerId, itemId, quantity, unitPrice } = payload;
        if (!sellerId || !itemId || !quantity || !unitPrice) {
            return createCorsResponse({ error: 'Les données de vente sont incomplètes (sellerId, itemId, quantity, unitPrice requis).' }, 400);
        }

        const seller = await fetchUserByUid(sellerId);
        if (!seller || !seller.businessId) {
            return createCorsResponse({ error: 'Vendeur introuvable.' }, 404);
        }
        
        const actorDisplayName = `API: ${authorizedApp.name}`;
        const actorUid = `api_${authorizedApp.id}`;

        // 1. Adjust stock
        await adjustStockQuantity(seller.businessId, itemId, -quantity, actorDisplayName, actorUid);

        // 2. Add income
        const totalAmount = quantity * unitPrice;
        await addQuickIncome(seller.businessId, {
            workspaceId: seller.assignedWorkspaceId,
            description: `Vente via ${authorizedApp.name}: ${quantity}x (ID: ${itemId})`,
            amount: totalAmount,
            date: new Date().toISOString(),
        }, actorDisplayName, actorUid);

        return createCorsResponse({ success: true, message: 'Vente enregistrée avec succès dans TTR Gestion.' }, 200);
    }

    return createCorsResponse({ error: 'Action non valide.' }, 400);

  } catch (error: any) {
    console.error('[API /userinfo] Error:', error);
    return createCorsResponse({ error: error.message || 'Erreur interne du serveur.' }, 500);
  }
}
