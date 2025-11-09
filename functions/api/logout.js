// Clears auth cookie and redirects to Auth0 logout (optional)
import { setCookie } from '../lib/utils.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const siteUrl = env.SITE_URL || url.origin;
  const domain = env.AUTH0_DOMAIN;
  const clientId = env.AUTH0_CLIENT_ID;

  const headers = new Headers();
  headers.append('Set-Cookie', setCookie('id_token', '', { maxAge: 0 }));

  if (domain && clientId) {
    const logout = new URL(`https://${domain}/v2/logout`);
    logout.searchParams.set('client_id', clientId);
    logout.searchParams.set('returnTo', siteUrl);
    headers.set('Location', logout.toString());
    return new Response(null, { status: 302, headers });
  }

  headers.set('Location', siteUrl);
  return new Response(null, { status: 302, headers });
}

