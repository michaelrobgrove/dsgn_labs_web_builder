import { getUserFromRequest } from '../lib/auth.js';
import { upsertUser } from '../lib/db.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  await upsertUser(env, user);
  return new Response(JSON.stringify({ user }), { headers: { 'Content-Type': 'application/json' } });
}
