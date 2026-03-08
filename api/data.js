// api/data.js — CRUD général : membres, publications, projets, événements, galerie, ressources
import { neon } from '@neondatabase/serverless';
import { verifySession, setCors, requireRole } from './_auth.js';

const TABLES_ALLOWED = ['membres', 'publications', 'projets', 'evenements', 'galerie', 'ressources'];

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
    } else if (table === 'ressources') {
      rows = await sql`SELECT * FROM ressources ORDER BY created_at DESC`;
    }
    return res.status(200).json(rows);
  }

  // Toutes les autres méthodes nécessitent une authentification
  const session = await verifySession(req);
  if (!session) return res.status(401).json({ error: 'Non authentifié' });
  if (!requireRole(session, 'moderateur')) return res.status(403).json({ error: 'Accès refusé' });

  // POST — Créer ou Sync
  if (req.method === 'POST') {
    const data = req.body;

    // Sync en masse depuis le panel admin
    if (data.action === 'sync') {
      const records = data.records || [];
      if (table === 'ressources') {
        for (const r of records) {
          if (r.id) {
            await sql`UPDATE ressources SET titre=${r.titre||r.titre}, description=${r.desc||r.description||''}, categorie=${r.cat||r.categorie||''}, type_fichier=${r.ftype||r.type_fichier||'pdf'}, lien=${r.lien||''}, image_url=${r.img||r.image_url||null}, telechargements=${r.views||r.telechargements||0} WHERE id=${r.id}`;
          } else {
            await sql`INSERT INTO ressources (titre, description, categorie, type_fichier, lien, image_url, telechargements, created_at) VALUES (${r.titre||''}, ${r.desc||r.description||''}, ${r.cat||r.categorie||''}, ${r.ftype||r.type_fichier||'pdf'}, ${r.lien||''}, ${r.img||r.image_url||null}, ${r.views||0}, CURRENT_DATE)`;
          }
        }
        return res.status(200).json({ success: true });
      }
      if (table === 'membres') {
        for (const m of records) {
          if (m.id) {
            await sql`UPDATE membres SET nom=${m.name||m.nom||''}, role=${m.role||''}, niveau=${m.niv||m.niveau||''}, specialite=${m.spec||m.specialite||''}, bio=${m.bio||''}, email=${m.eml||m.email||''}, linkedin=${m.lin||m.linkedin||''}, photo_url=${m.ph||m.photo_url||''} WHERE id=${m.id}`;
          } else {
            await sql`INSERT INTO membres (nom, role, niveau, specialite, bio, email, linkedin, photo_url, ordre, actif) VALUES (${m.name||m.nom||''}, ${m.role||''}, ${m.niv||m.niveau||''}, ${m.spec||m.specialite||''}, ${m.bio||''}, ${m.eml||m.email||''}, ${m.lin||m.linkedin||''}, ${m.ph||m.photo_url||''}, ${m.ordre||0}, true)`;
          }
        }
        return res.status(200).json({ success: true });
      }
      if (table === 'galerie') {
        for (const g of records) {
          if (g.id) {
            await sql`UPDATE galerie SET titre=${g.tit||g.titre||''}, type=${g.typ||g.type||'photo'}, src=${g.src||''}, featured=${g.feat||g.featured||false}, bg_color=${g.bg||g.bg_color||''} WHERE id=${g.id}`;
          } else {
            await sql`INSERT INTO galerie (titre, type, src, featured, bg_color) VALUES (${g.tit||g.titre||''}, ${g.typ||g.type||'photo'}, ${g.src||''}, ${g.feat||g.featured||false}, ${g.bg||g.bg_color||''})`;
          }
        }
        return res.status(200).json({ success: true });
      }
      if (table === 'publications') {
        for (const p of records) {
          if (p.id) {
            await sql`UPDATE publications SET titre=${p.tit||p.titre||''}, auteur=${p.aut||p.auteur||''}, categorie=${p.cat||p.categorie||''}, contenu=${p.res||p.contenu||''}, date_pub=${p.dat||p.date_pub||null}, lien=${p.lnk||p.lien||''} WHERE id=${p.id}`;
          } else {
            await sql`INSERT INTO publications (titre, auteur, categorie, contenu, date_pub, lien) VALUES (${p.tit||p.titre||''}, ${p.aut||p.auteur||''}, ${p.cat||p.categorie||''}, ${p.res||p.contenu||''}, ${p.dat||p.date_pub||null}, ${p.lnk||p.lien||''})`;
          }
        }
        return res.status(200).json({ success: true });
      }
      if (table === 'evenements') {
        for (const e of records) {
          if (e.id) {
            await sql`UPDATE evenements SET titre=${e.titre||''}, type=${e.type||''}, jour=${e.jour||''}, mois_annee=${e.mois_annee||''}, lieu=${e.lieu||''}, heure=${e.heure||''} WHERE id=${e.id}`;
          } else {
            await sql`INSERT INTO evenements (titre, type, jour, mois_annee, lieu, heure) VALUES (${e.titre||''}, ${e.type||''}, ${e.jour||''}, ${e.mois_annee||''}, ${e.lieu||''}, ${e.heure||''})`;
          }
        }
        return res.status(200).json({ success: true });
      }
      return res.status(400).json({ error: 'Table sync non gérée' });
    }

    // Créer un seul enregistrement
    let row;
    if (table === 'membres') {
      row = await sql`INSERT INTO membres (nom, role, niveau, specialite, bio, email, linkedin, photo_url, ordre)
        VALUES (${data.nom}, ${data.role}, ${data.niveau}, ${data.specialite}, ${data.bio}, ${data.email}, ${data.linkedin}, ${data.photo_url}, ${data.ordre || 0})
        RETURNING *`;
    } else if (table === 'publications') {
      row = await sql`INSERT INTO publications (titre, auteur, categorie, contenu, date_pub, lien)
        VALUES (${data.titre}, ${data.auteur}, ${data.categorie}, ${data.contenu}, ${data.date_pub}, ${data.lien})
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
    } else if (table === 'ressources') {
      row = await sql`INSERT INTO ressources (titre, description, categorie, type_fichier, lien, image_url, telechargements, created_at)
        VALUES (${data.titre}, ${data.description||''}, ${data.categorie||''}, ${data.type_fichier||'pdf'}, ${data.lien||''}, ${data.image_url||null}, 0, CURRENT_DATE)
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
      row = await sql`UPDATE publications SET titre=${data.titre}, auteur=${data.auteur}, categorie=${data.categorie}, contenu=${data.contenu}, date_pub=${data.date_pub}, lien=${data.lien} WHERE id=${data.id} RETURNING *`;
    } else if (table === 'projets') {
      row = await sql`UPDATE projets SET titre=${data.titre}, description=${data.description}, statut=${data.statut}, image_url=${data.image_url}, lien=${data.lien}, featured=${data.featured || false}, bg_color1=${data.bg_color1}, bg_color2=${data.bg_color2} WHERE id=${data.id} RETURNING *`;
    } else if (table === 'evenements') {
      row = await sql`UPDATE evenements SET titre=${data.titre}, type=${data.type}, jour=${data.jour}, mois_annee=${data.mois_annee}, lieu=${data.lieu}, heure=${data.heure} WHERE id=${data.id} RETURNING *`;
    } else if (table === 'galerie') {
      row = await sql`UPDATE galerie SET titre=${data.titre}, type=${data.type}, src=${data.src}, featured=${data.featured || false}, bg_color=${data.bg_color} WHERE id=${data.id} RETURNING *`;
    } else if (table === 'ressources') {
      row = await sql`UPDATE ressources SET titre=${data.titre}, description=${data.description||''}, categorie=${data.categorie||''}, type_fichier=${data.type_fichier||'pdf'}, lien=${data.lien||''}, image_url=${data.image_url||null} WHERE id=${data.id} RETURNING *`;
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
