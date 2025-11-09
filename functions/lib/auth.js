import { parseCookies } from './utils.js';

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

export function getUserFromRequest(request) {
  const cookies = parseCookies(request);
  const token = cookies['id_token'];
  if (!token) return null;
  const claims = decodeJwt(token);
  if (!claims || !claims.sub) return null;
  return {
    sub: claims.sub,
    email: claims.email,
    name: claims.name || claims.nickname || claims.email || 'User'
  };
}

