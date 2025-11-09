// Handles Auth0 callback, exchanges code for tokens, sets id_token cookie
import { setCookie } from '../lib/utils.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) return new Response('Missing code/state', { status: 400 });

  const stored = await env.SITE_STORAGE.get(`oauth/state/${state}`);
  if (!stored) return new Response('Invalid state', { status: 400 });
  const { verifier } = JSON.parse(await stored.text());
  await env.SITE_STORAGE.delete(`oauth/state/${state}`);

  const domain = env.AUTH0_DOMAIN;
  const clientId = env.AUTH0_CLIENT_ID;
  const clientSecret = env.AUTH0_CLIENT_SECRET;
  const redirectUri = env.AUTH0_REDIRECT_URI || `${url.origin}/api/callback`;

  const tokenUrl = `https://${domain}/oauth/token`;
  const payload = {
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: verifier
  };
  if (clientSecret) payload.client_secret = clientSecret;

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.text();
    return new Response(`Token exchange failed: ${err}`, { status: 400 });
  }
  const tokens = await res.json();
  const idToken = tokens.id_token;
  if (!idToken) return new Response('No id_token', { status: 400 });

  const headers = new Headers({ Location: '/dashboard.html' });
  headers.append('Set-Cookie', setCookie('id_token', idToken));
  return new Response(null, { status: 302, headers });
}

