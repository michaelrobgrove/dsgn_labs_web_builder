export async function ensureSchema(env) {
  const db = env.DB;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS generated_sites (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      business_name TEXT,
      file_name TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
}

export async function upsertUser(env, { sub, email, name }) {
  await ensureSchema(env);
  await env.DB.exec(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?);`, [sub, email || null, name || null]);
}

export async function listUserSites(env, userId) {
  await ensureSchema(env);
  const { results } = await env.DB.prepare(`SELECT id, business_name, file_name, created_at FROM generated_sites WHERE user_id = ? ORDER BY created_at DESC`).bind(userId).all();
  return results || [];
}

export async function saveChatSession(env, { id, userId, data }) {
  await ensureSchema(env);
  await env.DB.exec(
    `INSERT INTO chat_sessions (id, user_id, data) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id, data=excluded.data;`,
    [id, userId, JSON.stringify(data)]
  );
}

export async function insertGeneratedSite(env, { id, userId, businessName, fileName }) {
  await ensureSchema(env);
  await env.DB.exec(
    `INSERT OR REPLACE INTO generated_sites (id, user_id, business_name, file_name) VALUES (?, ?, ?, ?);`,
    [id, userId || null, businessName || null, fileName || null]
  );
}
