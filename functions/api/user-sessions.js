import { getUserFromRequest } from '../lib/auth.js';
import { listUserSites, upsertUser } from '../lib/db.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const user = getUserFromRequest(request);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  await upsertUser(env, user);
  const sites = await listUserSites(env, user.sub);
  return new Response(JSON.stringify({ sites }), { headers: { 'Content-Type': 'application/json' } });
}

