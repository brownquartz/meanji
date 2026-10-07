// server/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'meanji_token';

function cookieOptions() {
  const isProd = process.env.NODE_ENV !== 'development';
  return {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'no session' });
  try {
    req.user = jwt.verify(token, JWT_SECRET); // { uid, email }
    next();
  } catch {
    return res.status(401).json({ error: 'invalid session' });
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_CATEGORY_NAME = '基本単語帳';

module.exports = function createAuthRouter(pool) {
  // POST /api/auth/register
  router.post('/register', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !EMAIL_RE.test(email) || !password || password.length < 8) {
      return res.status(400).json({ error: 'メールアドレスと8文字以上のパスワードを入力してください' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await client.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, tags_enabled',
        [email, hash]
      );
      const user = rows[0];
      await client.query(
        'INSERT INTO categories (user_id, name, is_default) VALUES ($1, $2, true)',
        [user.id, DEFAULT_CATEGORY_NAME]
      );
      await client.query('COMMIT');

      const token = jwt.sign({ uid: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
      res.cookie(COOKIE_NAME, token, cookieOptions());
      res.status(201).json({ user });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({ error: 'そのメールアドレスは既に登録されています' });
      }
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    } finally {
      client.release();
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });
    }
    try {
      const { rows } = await pool.query(
        'SELECT id, email, password_hash, tags_enabled FROM users WHERE email = $1',
        [email]
      );
      const row = rows[0];
      if (!row || !(await bcrypt.compare(password, row.password_hash))) {
        return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
      }
      const token = jwt.sign({ uid: row.id, email: row.email }, JWT_SECRET, { expiresIn: '30d' });
      res.cookie(COOKIE_NAME, token, cookieOptions());
      res.json({ user: { id: row.id, email: row.email, tags_enabled: row.tags_enabled } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', (_req, res) => {
    const isProd = process.env.NODE_ENV !== 'development';
    res.clearCookie(COOKIE_NAME, { sameSite: isProd ? 'none' : 'lax', secure: isProd, path: '/' });
    res.json({ ok: true });
  });

  // GET /api/auth/me
  router.get('/me', requireAuth, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT tags_enabled FROM users WHERE id = $1', [req.user.uid]);
      if (!rows.length) return res.status(401).json({ error: 'invalid session' });
      res.json({ user: { id: req.user.uid, email: req.user.email, tags_enabled: rows[0].tags_enabled } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // PATCH /api/auth/settings { tags_enabled }
  router.patch('/settings', requireAuth, async (req, res) => {
    if (typeof req.body?.tags_enabled !== 'boolean') {
      return res.status(400).json({ error: 'tags_enabled (boolean) is required' });
    }
    try {
      const { rows } = await pool.query(
        'UPDATE users SET tags_enabled = $1 WHERE id = $2 RETURNING id, email, tags_enabled',
        [req.body.tags_enabled, req.user.uid]
      );
      res.json({ user: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return { router, requireAuth };
};
