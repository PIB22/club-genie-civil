// api/config.js — Lire et modifier la config du site
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL);

  // GET — lecture publique de toute la config
  if (req.method === 'GET') {
    const rows = await sql`SELECT cle, valeur FROM site_config`;
    const config = {};
    rows.forEach(r => { config[r.cle] = r.valeur; });
    return res.status(200).json(config);
  }

  // POST — modification (protégée par token de session ou secret fixe)
  if (req.method === 'POST') {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace('Bearer ', '').trim();

    // Accepte le secret fixe OU un token de session valide
    const isSecret = token === process.env.API_SECRET;
    let isSession = false;
    if (!isSecret && token) {
      try {
        const rows = await sql`
          SELECT id FROM sessions
          WHERE token = ${token}
            AND expires_at > NOW()
          LIMIT 1
        `;
        isSession = rows.length > 0;
      } catch(e) {}
    }

    if (!isSecret && !isSession) {
      return res.status(401).json({ error: 'Non autorisé — connectez-vous au panel admin' });
    }

    const body = req.body;

    // Mode 1 : {cle, valeur} — une seule clé (rétrocompatible)
    if (body.cle !== undefined) {
      const { cle, valeur } = body;
      await sql`
        INSERT INTO site_config (cle, valeur)
        VALUES (${cle}, ${valeur})
        ON CONFLICT (cle) DO UPDATE SET valeur = ${valeur}, updated_at = NOW()
      `;
      return res.status(200).json({ success: true, updated: [cle] });
    }

    // Mode 2 : objet {key1: val1, key2: val2, ...} — plusieurs clés d'un coup
    const updated = [];
    for (const [cle, valeur] of Object.entries(body)) {
      if (typeof cle === 'string' && cle.length > 0) {
        await sql`
          INSERT INTO site_config (cle, valeur)
          VALUES (${cle}, ${String(valeur ?? '')})
          ON CONFLICT (cle) DO UPDATE SET valeur = ${String(valeur ?? '')}, updated_at = NOW()
        `;
        updated.push(cle);
      }
    }

    return res.status(200).json({ success: true, updated });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
