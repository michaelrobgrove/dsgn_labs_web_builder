import { parseCookies } from './utils.js';

let jwksCache = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 3600000; // 1 hour

async function fetchJWKS(domain) {
  const now = Date.now();
  if (jwksCache && (now - jwksCacheTime) < JWKS_CACHE_TTL) {
    return jwksCache;
  }

  const response = await fetch(`https://${domain}/.well-known/jwks.json`);
  if (!response.ok) throw new Error('Failed to fetch JWKS');

  jwksCache = await response.json();
  jwksCacheTime = now;
  return jwksCache;
}

async function importJWK(jwk) {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '=='.slice((padded.length + 3) % 4));
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

export async function verifyJwt(token, domain, audience) {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const expectedIssuer = `https://${domain}/`;
    if (payload.iss !== expectedIssuer) {
      return null;
    }

    if (audience && payload.aud !== audience) {
      return null;
    }

    const jwks = await fetchJWKS(domain);
    const jwk = jwks.keys.find(k => k.kid === header.kid);
    if (!jwk) return null;

    const key = await importJWK(jwk);
    const signature = base64UrlDecode(signatureB64);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      signature,
      data
    );

    if (!valid) return null;

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.nickname || payload.email || 'User'
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function decodeJwt(idToken) {
  try {
    const [, payload] = idToken.split('.');
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded + '=='.slice((padded.length + 3) % 4));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function getUserFromRequest(request, env) {
  const cookies = parseCookies(request);
  const token = cookies['id_token'];
  if (!token) return null;

  if (env && env.AUTH0_DOMAIN) {
    return await verifyJwt(token, env.AUTH0_DOMAIN, env.AUTH0_CLIENT_ID);
  }

  const claims = decodeJwt(token);
  if (!claims || !claims.sub) return null;
  return {
    sub: claims.sub,
    email: claims.email,
    name: claims.name || claims.nickname || claims.email || 'User'
  };
}
