// api/sync.js — Sauvegarde sécurisée par secret fixe
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  // Vérifier le secret
  const auth = req.headers['authorization'] || '';
  const secret = auth.replace('Bearer ', '');
  if (secret !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const sql = neon(process.env.DATABASE_URL);
  const { table, records } = req.body;

  try {
    if (table === 'membres') {
      for (const m of records) {
        if (m.id) {
          await sql`UPDATE membres SET nom=${m.name||m.nom||''}, role=${m.role||''}, niveau=${m.niv||m.niveau||''}, specialite=${m.spec||m.specialite||''}, bio=${m.bio||''}, email=${m.eml||m.email||''}, linkedin=${m.lin||m.linkedin||''}, photo_url=${m.ph||m.photo_url||''} WHERE id=${m.id}`;
        } else {
          await sql`INSERT INTO membres (nom, role, niveau, specialite, bio, email, linkedin, photo_url, ordre, actif) VALUES (${m.name||m.nom||''}, ${m.role||''}, ${m.niv||m.niveau||''}, ${m.spec||m.specialite||''}, ${m.bio||''}, ${m.eml||m.email||''}, ${m.lin||m.linkedin||''}, ${m.ph||m.photo_url||''}, ${m.ordre||0}, true)`;
        }
      }
    } else if (table === 'galerie') {
      for (const g of records) {
        if (g.id) {
          await sql`UPDATE galerie SET titre=${g.tit||g.titre||''}, type=${g.typ||g.type||'photo'}, src=${g.src||''}, featured=${g.feat||g.featured||false}, bg_color=${g.bg||g.bg_color||''} WHERE id=${g.id}`;
        } else {
          await sql`INSERT INTO galerie (titre, type, src, featured, bg_color) VALUES (${g.tit||g.titre||''}, ${g.typ||g.type||'photo'}, ${g.src||''}, ${g.feat||g.featured||false}, ${g.bg||g.bg_color||''})`;
        }
      }
    } else if (table === 'publications') {
      for (const p of records) {
        if (p.id) {
          await sql`UPDATE publications SET titre=${p.tit||p.titre||''}, auteur=${p.aut||p.auteur||''}, categorie=${p.cat||p.categorie||''}, contenu=${p.res||p.contenu||''}, date_pub=${p.dat||p.date_pub||null}, lien=${p.lnk||p.lien||''} WHERE id=${p.id}`;
        } else {
          await sql`INSERT INTO publications (titre, auteur, categorie, contenu, date_pub, lien) VALUES (${p.tit||p.titre||''}, ${p.aut||p.auteur||''}, ${p.cat||p.categorie||''}, ${p.res||p.contenu||''}, ${p.dat||p.date_pub||null}, ${p.lnk||p.lien||''})`;
        }
      }
    } else if (table === 'evenements') {
      for (const e of records) {
        if (e.id) {
          await sql`UPDATE evenements SET titre=${e.titre||''}, type=${e.type||''}, jour=${e.jour||''}, mois_annee=${e.mois_annee||''}, lieu=${e.lieu||''}, heure=${e.heure||''} WHERE id=${e.id}`;
        } else {
          await sql`INSERT INTO evenements (titre, type, jour, mois_annee, lieu, heure) VALUES (${e.titre||''}, ${e.type||''}, ${e.jour||''}, ${e.mois_annee||''}, ${e.lieu||''}, ${e.heure||''})`;
        }
      }
    } else if (table === 'ressources') {
      for (const r of records) {
        if (r.id) {
          await sql`UPDATE ressources SET titre=${r.titre||''}, description=${r.desc||r.description||''}, categorie=${r.cat||r.categorie||''}, type_fichier=${r.ftype||r.type_fichier||'pdf'}, lien=${r.lien||''}, image_url=${r.img||r.image_url||null}, telechargements=${r.views||r.telechargements||0} WHERE id=${r.id}`;
        } else {
          await sql`INSERT INTO ressources (titre, description, categorie, type_fichier, lien, image_url, telechargements, created_at) VALUES (${r.titre||''}, ${r.desc||r.description||''}, ${r.cat||r.categorie||''}, ${r.ftype||r.type_fichier||'pdf'}, ${r.lien||''}, ${r.img||r.image_url||null}, ${r.views||0}, CURRENT_DATE)`;
        }
      }
    } else {
      return res.status(400).json({ error: 'Table non supportée' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
