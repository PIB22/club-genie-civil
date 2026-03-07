// api/login.js — Authentification sécurisée côté serveur
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
    }

    const sql = neon(process.env.DATABASE_URL);

    // Chercher l'admin
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const [admin] = await sql`
      SELECT id, username, role, nom_complet, actif
      FROM admins
      WHERE username = ${username}
      AND password_hash = ${passwordHash}
      AND actif = true
    `;

    if (!admin) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    // Créer une session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 heure

    await sql`
      INSERT INTO sessions (admin_id, token, expires_at)
      VALUES (${admin.id}, ${token}, ${expiresAt})
    `;

    // Mettre à jour last_login
    await sql`UPDATE admins SET last_login = NOW() WHERE id = ${admin.id}`;

    return res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        nom: admin.nom_complet
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
