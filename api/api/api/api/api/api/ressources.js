// api/ressources.js — Gestion des ressources pédagogiques
import { neon } from '@neondatabase/serverless';
import { verifySession, setCors, requireRole } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  // GET — Lecture publique avec filtre par catégorie
  if (req.method === 'GET') {
    const { categorie } = req.query;
    let rows;
    if (categorie && categorie !== 'all') {
      rows = await sql`SELECT * FROM ressources WHERE categorie = ${categorie} ORDER BY created_at DESC`;
    } else {
      rows = await sql`SELECT * FROM ressources ORDER BY created_at DESC`;
    }
    return res.status(200).json(rows);
  }

  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: 'Non authentifié' });

  // POST — Ajouter une ressource (moderateur+)
  if (req.method === 'POST') {
    if (!requireRole(session, 'moderateur')) return res.status(403).json({ error: 'Accès refusé' });
    const { titre, description, categorie, type_fichier, lien, image_url } = req.body;
    if (!titre || !categorie) return res.status(400).json({ error: 'Titre et catégorie requis' });

    const [row] = await sql`
      INSERT INTO ressources (titre, description, categorie, type_fichier, lien, image_url)
      VALUES (${titre}, ${description}, ${categorie}, ${type_fichier || 'lien'}, ${lien}, ${image_url})
      RETURNING *
    `;
    return res.status(201).json(row);
  }

  // PUT — Modifier (admin+)
  if (req.method === 'PUT') {
    if (!requireRole(session, 'admin')) return res.status(403).json({ error: 'Réservé aux admins' });
    const { id, titre, description, categorie, type_fichier, lien, image_url } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requis' });

    const [row] = await sql`
      UPDATE ressources SET titre=${titre}, description=${description}, categorie=${categorie},
      type_fichier=${type_fichier}, lien=${lien}, image_url=${image_url}
      WHERE id = ${id} RETURNING *
    `;
    return res.status(200).json(row);
  }

  // PATCH — Incrémenter téléchargements (public)
  if (req.method === 'PATCH') {
    const { id } = req.body;
    await sql`UPDATE ressources SET telechargements = telechargements + 1 WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }

  // DELETE (admin+)
  if (req.method === 'DELETE') {
    if (!requireRole(session, 'admin')) return res.status(403).json({ error: 'Réservé aux admins' });
    const { id } = req.body;
    await sql`DELETE FROM ressources WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
