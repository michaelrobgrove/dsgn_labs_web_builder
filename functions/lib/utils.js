// Utility helpers for OAuth and cookies

export function randomString(length = 43) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < array.length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export async function sha256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

export function base64url(arrayBuffer) {
  let binary = '';
  const bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function pkceChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64url(hashed);
}

export function parseCookies(request) {
  const cookie = request.headers.get('Cookie') || '';
  const pairs = cookie.split(';').map(c => c.trim()).filter(Boolean);
  const out = {};
  for (const p of pairs) {
    const idx = p.indexOf('=');
    if (idx > -1) out[p.slice(0, idx)] = decodeURIComponent(p.slice(idx + 1));
  }
  return out;
}

export function setCookie(name, value, { maxAge = 86400, path = '/', secure = true, httpOnly = true, sameSite = 'Lax', domain } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `Max-Age=${maxAge}`, `SameSite=${sameSite}`];
  if (secure) parts.push('Secure');
  if (httpOnly) parts.push('HttpOnly');
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join('; ');
}

