// api/config.js — Lire et modifier la config du site
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  // GET — lecture publique
  if (req.method === 'GET') {
    const rows = await sql`SELECT cle, valeur FROM site_config`;
    const config = {};
    rows.forEach(r => { config[r.cle] = r.valeur; });
    return res.status(200).json(config);
  }

  // POST — modification (protégée par secret)
  if (req.method === 'POST') {
    const auth = req.headers['authorization'] || '';
    const secret = auth.replace('Bearer ', '');
    if (secret !== process.env.API_SECRET) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    const { cle, valeur } = req.body;
    if (!cle) return res.status(400).json({ error: 'Clé requise' });
    await sql`INSERT INTO site_config (cle, valeur) VALUES (${cle}, ${valeur})
      ON CONFLICT (cle) DO UPDATE SET valeur = ${valeur}, updated_at = NOW()`;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
