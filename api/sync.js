// api/sync.js — Sauvegarde sécurisée par secret fixe (DELETE + INSERT)
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const auth = req.headers['authorization'] || '';
  const secret = auth.replace('Bearer ', '');
  if (secret !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  const sql = neon(process.env.DATABASE_URL);
  const { table, records } = req.body;

  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Records invalides' });
  }

  try {
    if (table === 'membres') {
      await sql`DELETE FROM membres`;
      for (const m of records) {
        await sql`INSERT INTO membres (nom, role, niveau, specialite, bio, email, linkedin, photo_url, ordre, actif)
          VALUES (${m.name||m.nom||''}, ${m.role||''}, ${m.niv||m.niveau||''}, ${m.spec||m.specialite||''}, ${m.bio||''}, ${m.eml||m.email||''}, ${m.lin||m.linkedin||''}, ${m.ph||m.photo_url||''}, ${m.ordre||0}, true)`;
      }
    } else if (table === 'galerie') {
      await sql`DELETE FROM galerie`;
      for (const g of records) {
        await sql`INSERT INTO galerie (titre, type, src, featured, bg_color)
          VALUES (${g.tit||g.titre||''}, ${g.typ||g.type||'photo'}, ${g.src||''}, ${g.feat||g.featured||false}, ${g.bg||g.bg_color||''})`;
      }
    } else if (table === 'publications') {
      await sql`DELETE FROM publications`;
      for (const p of records) {
        await sql`INSERT INTO publications (titre, auteurs, categorie, resume, date_pub, lien)
          VALUES (${p.tit||p.titre||''}, ${p.aut||p.auteurs||''}, ${p.cat||p.categorie||''}, ${p.res||p.resume||''}, ${p.dat||p.date_pub||null}, ${p.lnk||p.lien||''})`;
      }
    } else if (table === 'evenements') {
      await sql`DELETE FROM evenements`;
      for (const e of records) {
        await sql`INSERT INTO evenements (titre, type, jour, mois_annee, lieu, heure)
          VALUES (${e.tit||e.titre||''}, ${e.typ||e.type||''}, ${e.jour||''}, ${e.mois||e.mois_annee||''}, ${e.lieu||''}, ${e.hr||e.heure||''})`;
      }
    } else if (table === 'projets') {
      await sql`DELETE FROM projets`;
      for (const p of records) {
        await sql`INSERT INTO projets (titre, description, statut, image_url, lien, bg_color1, bg_color2, featured)
          VALUES (${p.nom||p.titre||''}, ${p.desc||p.description||''}, ${p.stat||p.statut||''}, ${p.img||p.image_url||''}, ${p.lien||''}, ${p.bg1||p.bg_color1||''}, ${p.bg2||p.bg_color2||''}, ${p.feat||p.featured||false})`;
      }
    } else if (table === 'ressources') {
      await sql`DELETE FROM ressources`;
      for (const r of records) {
        await sql`INSERT INTO ressources (titre, description, categorie, type_fichier, lien, image_url, telechargements, created_at)
          VALUES (${r.titre||''}, ${r.desc||r.description||''}, ${r.cat||r.categorie||''}, ${r.ftype||r.type_fichier||'pdf'}, ${r.lien||''}, ${r.img||r.image_url||null}, ${r.views||0}, CURRENT_DATE)`;
      }
    } else {
      return res.status(400).json({ error: 'Table non supportée: ' + table });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
