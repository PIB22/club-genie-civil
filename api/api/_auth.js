// api/_auth.js — Middleware de vérification de session (utilisé par toutes les routes protégées)
import { neon } from '@neondatabase/serverless';

export async function verifySession(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return null;

  const sql = neon(process.env.DATABASE_URL);
  const [session] = await sql`
    SELECT s.admin_id, a.role, a.username, a.nom_complet
    FROM sessions s
    JOIN admins a ON a.id = s.admin_id
    WHERE s.token = ${token}
    AND s.expires_at > NOW()
    AND a.actif = true
  `;

  if (!session) return null;

  // Renouveler la session
  await sql`
    UPDATE sessions SET expires_at = NOW() + INTERVAL '1 hour'
    WHERE token = ${token}
  `;

  return session;
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function requireRole(session, minRole) {
  const roles = { 'moderateur': 1, 'admin': 2, 'superadmin': 3 };
  return roles[session?.role] >= roles[minRole];
}
