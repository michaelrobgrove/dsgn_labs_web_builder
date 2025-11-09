// Redirects to Auth0 /authorize using PKCE; stores verifier in KV by state
import { randomString, pkceChallenge } from '../lib/utils.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const domain = env.AUTH0_DOMAIN;
  const clientId = env.AUTH0_CLIENT_ID;
  const redirectUri = env.AUTH0_REDIRECT_URI || `${new URL(request.url).origin}/api/callback`;

  const state = randomString(16);
  const verifier = randomString(64);
  const challenge = await pkceChallenge(verifier);

  await env.SITE_STORAGE.put(`oauth/state/${state}`, JSON.stringify({ verifier }), { expirationTtl: 600 });

  const authorize = new URL(`https://${domain}/authorize`);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('scope', 'openid profile email');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 'S256');

  return Response.redirect(authorize.toString(), 302);
}

