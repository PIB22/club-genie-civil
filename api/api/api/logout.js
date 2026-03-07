// api/logout.js — Déconnexion sécurisée
import { neon } from '@neondatabase/serverless';
import { setCors } from './_auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (token) {
    const sql = neon(process.env.DATABASE_URL);
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }

  return res.status(200).json({ success: true });
}
