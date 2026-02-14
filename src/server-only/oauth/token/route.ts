
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/oauth/token:
 *   post:
 *     summary: OAuth Token Endpoint
 *     description: Exchanges an authorization code for an access token.
 *     tags: [OAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               grant_type:
 *                 type: string
 *                 description: Must be 'authorization_code'.
 *               code:
 *                 type: string
 *                 description: The authorization code received from the /authorize endpoint.
 *               redirect_uri:
 *                 type: string
 *                 description: The redirect URI of the client application.
 *               client_id:
 *                 type: string
 *                 description: The client's ID.
 *               client_secret:
 *                 type: string
 *                 description: The client's secret (apiKey).
 *     responses:
 *       200:
 *         description: Access token response.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 token_type:
 *                   type: string
 *                   example: Bearer
 *                 expires_in:
 *                   type: integer
 *                   example: 3600
 *                 id_token:
 *                   type: string
 *       400:
 *         description: Invalid request.
 *       401:
 *         description: Invalid client credentials.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const grantType = formData.get('grant_type');
    const code = formData.get('code');
    const clientId = formData.get('client_id');
    const clientSecret = formData.get('client_secret');

    // In a real implementation:
    // 1. Validate that grant_type is "authorization_code".
    // 2. Validate client_id and client_secret (apiKey) against the `authorizedApps` database.
    // 3. Validate the authorization code `code`. Check if it's valid, not expired, and belongs to the client.
    // 4. If all is valid, invalidate the auth code and generate an access token and an ID token (JWT).
    // 5. Return the tokens.
    
    console.log("OAuth Token Request Received:", { grantType, code, clientId });

    if (grantType !== 'authorization_code') {
        return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });
    }

    // This is a mock response. A real implementation would generate a signed JWT.
    const mockAccessToken = `mock_access_token_${Date.now()}`;
    const mockIdToken = `mock_id_token_for_${clientId}`; // This should be a JWT

    const response = {
      access_token: mockAccessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour
      id_token: mockIdToken,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    return NextResponse.json({ error: 'server_error', error_description: error.message }, { status: 500 });
  }
}
