
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/.well-known/openid-configuration:
 *   get:
 *     summary: OIDC Discovery Endpoint
 *     description: Provides the OpenID Connect configuration for this server, allowing clients to discover OAuth endpoints.
 *     tags: [OAuth]
 *     responses:
 *       200:
 *         description: OIDC provider configuration.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 issuer:
 *                   type: string
 *                   example: https://app.ttrgestion.site
 *                 authorization_endpoint:
 *                   type: string
 *                   example: https://app.ttrgestion.site/oauth/authorize
 *                 token_endpoint:
 *                   type: string
 *                   example: https://app.ttrgestion.site/oauth/token
 *                 userinfo_endpoint:
 *                   type: string
 *                   example: https://app.ttrgestion.site/api/userinfo
 *                 jwks_uri:
 *                   type: string
 *                   example: https://app.ttrgestion.site/oauth/jwks
 *                 response_types_supported:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["code"]
 *                 subject_types_supported:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["public"]
 *                 id_token_signing_alg_values_supported:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["RS256"]
 */
export async function GET(request: Request) {
  const baseUrl = `https://${request.headers.get('host')}`;

  const configuration = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    userinfo_endpoint: `${baseUrl}/api/userinfo`,
    jwks_uri: `${baseUrl}/oauth/jwks`, // JSON Web Key Set endpoint
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    claims_supported: ['sub', 'name', 'email', 'picture'],
  };

  return NextResponse.json(configuration);
}
