// api/data.js — CRUD général : membres, publications, projets, événements, galerie
import { neon } from '@neondatabase/serverless';
import { verifySession, setCors, requireRole } from './_auth.js';

const TABLES_ALLOWED = ['membres', 'publications', 'projets', 'evenements', 'galerie'];

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);
  const { table } = req.query;

  // Vérifier que la table est autorisée
  if (!TABLES_ALLOWED.includes(table)) {
    return res.status(400).json({ error: 'Table non autorisée' });
  }

  // GET — Lecture publique (pas besoin d'auth)
  if (req.method === 'GET') {
    let rows;
    if (table === 'membres') {
      rows = await sql`SELECT * FROM membres WHERE actif = true ORDER BY ordre, id`;
    } else if (table === 'publications') {
      rows = await sql`SELECT * FROM publications ORDER BY created_at DESC`;
    } else if (table === 'projets') {
      rows = await sql`SELECT * FROM projets ORDER BY featured DESC, created_at DESC`;
    } else if (table === 'evenements') {
      rows = await sql`SELECT * FROM evenements ORDER BY created_at DESC`;
    } else if (table === 'galerie') {
      rows = await sql`SELECT * FROM galerie ORDER BY featured DESC, created_at DESC`;
    }
    return res.status(200).json(rows);
  }

  // Toutes les autres méthodes nécessitent une authentification
  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: 'Non authentifié' });
  if (!requireRole(session, 'moderateur')) return res.status(403).json({ error: 'Accès refusé' });

  // POST — Créer
  if (req.method === 'POST') {
    const data = req.body;
    let row;

    if (table === 'membres') {
      row = await sql`INSERT INTO membres (nom, role, niveau, specialite, bio, email, linkedin, photo_url, ordre)
        VALUES (${data.nom}, ${data.role}, ${data.niveau}, ${data.specialite}, ${data.bio}, ${data.email}, ${data.linkedin}, ${data.photo_url}, ${data.ordre || 0})
        RETURNING *`;
    } else if (table === 'publications') {
      row = await sql`INSERT INTO publications (titre, auteurs, categorie, resume, date_pub, lien)
        VALUES (${data.titre}, ${data.auteurs}, ${data.categorie}, ${data.resume}, ${data.date_pub}, ${data.lien})
        RETURNING *`;
    } else if (table === 'projets') {
      row = await sql`INSERT INTO projets (titre, description, statut, image_url, lien, featured, bg_color1, bg_color2)
        VALUES (${data.titre}, ${data.description}, ${data.statut || 'ec'}, ${data.image_url}, ${data.lien}, ${data.featured || false}, ${data.bg_color1 || '#0d2a40'}, ${data.bg_color2 || '#1a4a6c'})
        RETURNING *`;
    } else if (table === 'evenements') {
      row = await sql`INSERT INTO evenements (titre, type, jour, mois_annee, lieu, heure)
        VALUES (${data.titre}, ${data.type}, ${data.jour}, ${data.mois_annee}, ${data.lieu}, ${data.heure})
        RETURNING *`;
    } else if (table === 'galerie') {
      row = await sql`INSERT INTO galerie (titre, type, src, featured, bg_color)
        VALUES (${data.titre}, ${data.type}, ${data.src}, ${data.featured || false}, ${data.bg_color || ''})
        RETURNING *`;
    }

    return res.status(201).json(row[0]);
  }

  // PUT — Modifier
  if (req.method === 'PUT') {
    if (!requireRole(session, 'admin')) return res.status(403).json({ error: 'Réservé aux admins' });
    const data = req.body;
    if (!data.id) return res.status(400).json({ error: 'ID requis' });

    let row;
    if (table === 'membres') {
      row = await sql`UPDATE membres SET nom=${data.nom}, role=${data.role}, niveau=${data.niveau}, specialite=${data.specialite}, bio=${data.bio}, email=${data.email}, linkedin=${data.linkedin}, photo_url=${data.photo_url}, ordre=${data.ordre || 0}, actif=${data.actif !== false} WHERE id=${data.id} RETURNING *`;
    } else if (table === 'publications') {
      row = await sql`UPDATE publications SET titre=${data.titre}, auteurs=${data.auteurs}, categorie=${data.categorie}, resume=${data.resume}, date_pub=${data.date_pub}, lien=${data.lien} WHERE id=${data.id} RETURNING *`;
    } else if (table === 'projets') {
      row = await sql`UPDATE projets SET titre=${data.titre}, description=${data.description}, statut=${data.statut}, image_url=${data.image_url}, lien=${data.lien}, featured=${data.featured || false}, bg_color1=${data.bg_color1}, bg_color2=${data.bg_color2} WHERE id=${data.id} RETURNING *`;
    } else if (table === 'evenements') {
      row = await sql`UPDATE evenements SET titre=${data.titre}, type=${data.type}, jour=${data.jour}, mois_annee=${data.mois_annee}, lieu=${data.lieu}, heure=${data.heure} WHERE id=${data.id} RETURNING *`;
    } else if (table === 'galerie') {
      row = await sql`UPDATE galerie SET titre=${data.titre}, type=${data.type}, src=${data.src}, featured=${data.featured || false}, bg_color=${data.bg_color} WHERE id=${data.id} RETURNING *`;
    }

    return res.status(200).json(row[0]);
  }

  // DELETE
  if (req.method === 'DELETE') {
    if (!requireRole(session, 'admin')) return res.status(403).json({ error: 'Réservé aux admins' });
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requis' });
    await sql`DELETE FROM ${sql(table)} WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
