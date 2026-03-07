// api/admins.js — Gestion des admins (superadmin uniquement)
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';
import { verifySession, setCors, requireRole } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: 'Non authentifié' });

  const sql = neon(process.env.DATABASE_URL);

  // GET — Lister tous les admins (admin+)
  if (req.method === 'GET') {
    if (!requireRole(session, 'admin')) return res.status(403).json({ error: 'Accès refusé' });
    const admins = await sql`
      SELECT id, username, email, role, nom_complet, actif, created_at, last_login
      FROM admins ORDER BY created_at DESC
    `;
    return res.status(200).json(admins);
  }

  // POST — Créer un admin (superadmin uniquement)
  if (req.method === 'POST') {
    if (!requireRole(session, 'superadmin')) return res.status(403).json({ error: 'Réservé au superadmin' });
    const { username, email, password, role, nom_complet } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Champs requis manquants' });
    if (password.length < 12) return res.status(400).json({ error: 'Mot de passe trop court (12+ caractères)' });

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const [newAdmin] = await sql`
      INSERT INTO admins (username, email, password_hash, role, nom_complet)
      VALUES (${username}, ${email}, ${hash}, ${role || 'moderateur'}, ${nom_complet || ''})
      RETURNING id, username, email, role, nom_complet
    `;
    return res.status(201).json(newAdmin);
  }

  // PUT — Modifier un admin (superadmin uniquement)
  if (req.method === 'PUT') {
    if (!requireRole(session, 'superadmin')) return res.status(403).json({ error: 'Réservé au superadmin' });
    const { id, role, actif, nom_complet, password } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requis' });

    if (password) {
      if (password.length < 12) return res.status(400).json({ error: 'Mot de passe trop court' });
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      await sql`UPDATE admins SET password_hash = ${hash} WHERE id = ${id}`;
    }

    const [updated] = await sql`
      UPDATE admins SET
        role = COALESCE(${role}, role),
        actif = COALESCE(${actif}, actif),
        nom_complet = COALESCE(${nom_complet}, nom_complet)
      WHERE id = ${id}
      RETURNING id, username, role, actif, nom_complet
    `;
    return res.status(200).json(updated);
  }

  // DELETE — Supprimer un admin (superadmin uniquement)
  if (req.method === 'DELETE') {
    if (!requireRole(session, 'superadmin')) return res.status(403).json({ error: 'Réservé au superadmin' });
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requis' });
    // Empêcher de supprimer son propre compte
    if (id === session.admin_id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    await sql`DELETE FROM admins WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
