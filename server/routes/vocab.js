// server/routes/vocab.js
// 単語帳：カテゴリ（排他・メールのフォルダ的）＋タグ（多対多）で単語を保存する。
const express = require('express');
const router = express.Router();

const DEFAULT_CATEGORY_NAME = '基本単語帳';

module.exports = function createVocabRouter(pool, requireAuth) {
  router.use(requireAuth);

  async function getDefaultCategoryId(client, userId) {
    const { rows } = await client.query(
      'SELECT id FROM categories WHERE user_id = $1 AND is_default = true LIMIT 1',
      [userId]
    );
    return rows[0]?.id ?? null;
  }

  // ─── カテゴリ ──────────────────────────────────────────────────────────────
  router.get('/categories', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, name, is_default FROM categories WHERE user_id = $1 ORDER BY is_default DESC, name',
        [req.user.uid]
      );
      res.json({ categories: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  router.post('/categories', async (req, res) => {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'カテゴリ名を入力してください' });
    try {
      const { rows } = await pool.query(
        'INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id, name, is_default',
        [req.user.uid, name]
      );
      res.status(201).json({ category: rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: '同じ名前のカテゴリが既にあります' });
      }
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  router.delete('/categories/:id', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'SELECT is_default FROM categories WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.uid]
      );
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'not found' });
      }
      if (rows[0].is_default) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '基本単語帳は削除できません' });
      }
      const defaultId = await getDefaultCategoryId(client, req.user.uid);
      await client.query(
        'UPDATE saved_words SET category_id = $1 WHERE category_id = $2 AND user_id = $3',
        [defaultId, req.params.id, req.user.uid]
      );
      await client.query(
        'DELETE FROM categories WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.uid]
      );
      await client.query('COMMIT');
      res.json({ ok: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    } finally {
      client.release();
    }
  });

  // ─── タグ ────────────────────────────────────────────────────────────────
  router.get('/tags', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, name FROM tags WHERE user_id = $1 ORDER BY name',
        [req.user.uid]
      );
      res.json({ tags: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  router.post('/tags', async (req, res) => {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'タグ名を入力してください' });
    try {
      const { rows } = await pool.query(
        'INSERT INTO tags (user_id, name) VALUES ($1, $2) RETURNING id, name',
        [req.user.uid, name]
      );
      res.status(201).json({ tag: rows[0] });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: '同じ名前のタグが既にあります' });
      }
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  router.delete('/tags/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM tags WHERE id = $1 AND user_id = $2', [req.params.id, req.user.uid]);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ─── 保存した単語 ──────────────────────────────────────────────────────────
  // GET /api/vocab/words?category_id=&tag_id=  パラメータ無し = 全件表示
  router.get('/words', async (req, res) => {
    const { category_id, tag_id } = req.query;
    try {
      const params = [req.user.uid];
      let where = 'sw.user_id = $1';
      if (category_id) {
        params.push(category_id);
        where += ` AND sw.category_id = $${params.length}`;
      }
      let joinTag = '';
      if (tag_id) {
        params.push(tag_id);
        joinTag = `JOIN saved_word_tags swt_filter ON swt_filter.saved_word_id = sw.id AND swt_filter.tag_id = $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT sw.id, sw.word_text, sw.category_id, sw.created_at,
                COALESCE(
                  (SELECT json_agg(json_build_object('id', t.id, 'name', t.name) ORDER BY t.name)
                   FROM saved_word_tags swt JOIN tags t ON t.id = swt.tag_id
                   WHERE swt.saved_word_id = sw.id),
                  '[]'
                ) AS tags
         FROM saved_words sw
         ${joinTag}
         WHERE ${where}
         ORDER BY sw.created_at DESC`,
        params
      );
      res.json({ words: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // GET /api/vocab/words/status/:text 指定した単語が保存済みかどうか
  router.get('/words/status/:text', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, category_id FROM saved_words WHERE user_id = $1 AND word_text = $2',
        [req.user.uid, req.params.text]
      );
      res.json({ saved: rows.length > 0, savedWord: rows[0] || null });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // POST /api/vocab/words { word_text, category_id? }  category_id省略時は基本単語帳
  router.post('/words', async (req, res) => {
    const wordText = (req.body?.word_text || '').trim();
    if (!wordText) return res.status(400).json({ error: 'word_text is required' });
    const client = await pool.connect();
    try {
      const categoryId = req.body?.category_id ?? (await getDefaultCategoryId(client, req.user.uid));
      const { rows } = await client.query(
        `INSERT INTO saved_words (user_id, word_text, category_id) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, word_text) DO UPDATE SET category_id = EXCLUDED.category_id
         RETURNING id, word_text, category_id, created_at`,
        [req.user.uid, wordText, categoryId]
      );
      res.status(201).json({ savedWord: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    } finally {
      client.release();
    }
  });

  // PATCH /api/vocab/words/:id { category_id }
  router.patch('/words/:id', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'UPDATE saved_words SET category_id = $1 WHERE id = $2 AND user_id = $3 RETURNING id, word_text, category_id',
        [req.body?.category_id ?? null, req.params.id, req.user.uid]
      );
      if (!rows.length) return res.status(404).json({ error: 'not found' });
      res.json({ savedWord: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  router.delete('/words/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM saved_words WHERE id = $1 AND user_id = $2', [req.params.id, req.user.uid]);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // タグの付け外し（保存済み単語に対して）
  router.post('/words/:id/tags', async (req, res) => {
    const tagId = req.body?.tag_id;
    if (!tagId) return res.status(400).json({ error: 'tag_id is required' });
    try {
      const owns = await pool.query(
        'SELECT 1 FROM saved_words WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.uid]
      );
      if (!owns.rowCount) return res.status(404).json({ error: 'not found' });
      await pool.query(
        'INSERT INTO saved_word_tags (saved_word_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.params.id, tagId]
      );
      res.status(201).json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  router.delete('/words/:id/tags/:tagId', async (req, res) => {
    try {
      await pool.query(
        `DELETE FROM saved_word_tags WHERE saved_word_id = $1 AND tag_id = $2
         AND saved_word_id IN (SELECT id FROM saved_words WHERE user_id = $3)`,
        [req.params.id, req.params.tagId, req.user.uid]
      );
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
};
