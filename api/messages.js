// api/messages.js — Formulaire de contact et gestion des messages
import { neon } from '@neondatabase/serverless';
import { verifySession, setCors, requireRole } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  // POST — Envoyer un message (public, pas d'auth)
  if (req.method === 'POST') {
    const { nom, email, sujet, message } = req.body;
    if (!nom || !message) return res.status(400).json({ error: 'Nom et message requis' });

    const [row] = await sql`
      INSERT INTO messages (nom, email, sujet, message)
      VALUES (${nom}, ${email}, ${sujet}, ${message})
      RETURNING id, created_at
    `;
    return res.status(201).json({ success: true, id: row.id });
  }

  // Toutes les lectures nécessitent auth
  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: 'Non authentifié' });

  // GET — Lire les messages (moderateur+)
  if (req.method === 'GET') {
    if (!requireRole(session, 'moderateur')) return res.status(403).json({ error: 'Accès refusé' });
    const { filtre } = req.query;
    let messages;
    if (filtre === 'nonlus') {
      messages = await sql`SELECT * FROM messages WHERE lu = false ORDER BY created_at DESC`;
    } else {
      messages = await sql`SELECT * FROM messages ORDER BY created_at DESC`;
    }
    // Compter les non lus
    const [{ count }] = await sql`SELECT COUNT(*) as count FROM messages WHERE lu = false`;
    return res.status(200).json({ messages, nonLus: parseInt(count) });
  }

  // PATCH — Marquer comme lu (moderateur+)
  if (req.method === 'PATCH') {
    if (!requireRole(session, 'moderateur')) return res.status(403).json({ error: 'Accès refusé' });
    const { id, lu } = req.body;
    await sql`UPDATE messages SET lu = ${lu !== false} WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }

  // DELETE — Supprimer un message (admin+)
  if (req.method === 'DELETE') {
    if (!requireRole(session, 'admin')) return res.status(403).json({ error: 'Réservé aux admins' });
    const { id } = req.body;
    await sql`DELETE FROM messages WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
