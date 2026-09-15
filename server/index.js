// server/index.js — meanji API サーバー
// words テーブル（JMdict/日本語WordNet/韓国語Wiktionary由来、すべてクリーンなライセンス）
// のみを扱う。kanatomy（CJKVI-IDS由来の分解データ）には一切依存しない。
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Pool } = require('pg');
const { escapeLike } = require('./lib/escapeLike');

const app = express();

// Railwayはプロキシ経由なので、express-rate-limit等がクライアントの実IPを
// 正しく見られるように（無いと全リクエストがプロキシのIP扱いになり、
// レート制限が実質1人分になってしまう）
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false, // SPAの構成上、まずは無効化（必要なら後で個別に設定する）
}));
app.use(express.json());

// TODO: wordiveをデプロイしたら実URLに差し替える。
const allowedOrigins = [
  'https://meanji.brwqz.net',
  'https://meanji-production.up.railway.app',
  'https://kanatomy.brwqz.net',
  'https://kanatomy-production.up.railway.app',
  'https://TODO-wordive-domain',
  'http://localhost:3000',
  'http://localhost:4000',
];
app.use(cors({
  origin: (origin, callback) => {
    // origin が undefined = サーバー間リクエスト（curl等）は許可
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
}));

// ─── レート制限 ────────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many requests, please try again later' },
});
app.use('/api/', apiLimiter);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─── ヘルスチェック ────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true }));

// ─── GET /api/words/search ────────────────────────────────────────────────────
// ?q=<text> — kanji_form / reading を検索する。完全一致 > 前方一致 > 部分一致 の
// 優先順で表示する。
app.get('/api/words/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ results: [] });
  const escaped = escapeLike(q);

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT kanji_form, reading, meanings
       FROM words
       WHERE kanji_form = $1 OR reading = $1
          OR kanji_form LIKE '%' || $2 || '%' ESCAPE '\\'
          OR reading LIKE '%' || $2 || '%' ESCAPE '\\'
       ORDER BY
         CASE
           WHEN kanji_form = $1 OR reading = $1 THEN 0
           WHEN kanji_form LIKE $2 || '%' ESCAPE '\\' OR reading LIKE $2 || '%' ESCAPE '\\' THEN 1
           ELSE 2
         END,
         LENGTH(COALESCE(kanji_form, reading)) ASC
       LIMIT 50`,
      [q, escaped]
    );
    res.json({ results: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  } finally {
    client.release();
  }
});

// ─── GET /api/word/:text ──────────────────────────────────────────────────────
// 表記(kanji_form)の完全一致で words を検索する（単語詳細ページ用）。
app.get('/api/word/:text', async (req, res) => {
  const text = req.params.text;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT reading, meanings FROM words WHERE kanji_form = $1`,
      [text]
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json({ text, entries: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  } finally {
    client.release();
  }
});

// ─── GET /api/kanji-words/:char ───────────────────────────────────────────────
// 指定した1文字を含む単語一覧（表記のみ）を返す。kanatomy の「この漢字を使った
// 熟語」セクションから呼ばれる想定（kanatomy → meanji の一方向依存）。
app.get('/api/kanji-words/:char', async (req, res) => {
  const char = req.params.char;
  const escaped = escapeLike(char);
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT kanji_form FROM (
         SELECT DISTINCT kanji_form FROM words
         WHERE kanji_form LIKE '%' || $1 || '%' ESCAPE '\\'
       ) t
       ORDER BY LENGTH(kanji_form) ASC, kanji_form ASC
       LIMIT 30`,
      [escaped]
    );
    res.json({ results: rows.map(r => r.kanji_form) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  } finally {
    client.release();
  }
});

// ─── sitemap（express.static の前に配置）────────────────────────────────────
// 単語数が20万件超あり、sitemapの仕様上の上限（1ファイルあたり50,000 URL）を
// 大きく超えるため、サイトマップインデックス + 複数の子sitemapに分割する。
// 以前は LIMIT 50000 で先頭50,000件だけを1ファイルに詰めていたため、
// 残り8割近くの単語ページがsitemapに一切載っておらず検索エンジンから
// 発見されない状態になっていた。
const SITEMAP_CHUNK_SIZE = 45000;
const ROOT_URL = 'https://meanji.brwqz.net';

app.get('/sitemap.xml', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT count(DISTINCT kanji_form) FROM words WHERE kanji_form IS NOT NULL'
    );
    const total = Number(rows[0].count);
    const chunkCount = Math.max(1, Math.ceil(total / SITEMAP_CHUNK_SIZE));

    const sitemaps = Array.from({ length: chunkCount }, (_, i) =>
      `  <sitemap><loc>${ROOT_URL}/sitemap-${i}.xml</loc></sitemap>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('sitemap index error:', err.message);
    res.status(500).send('<?xml version="1.0"?><error/>');
  } finally {
    client.release();
  }
});

// /sitemap-0.xml, /sitemap-1.xml, ... : 実際のURL一覧（chunk 0 だけ先頭にホームページを含む）
app.get('/sitemap-:n.xml', async (req, res) => {
  const n = Number(req.params.n);
  if (!Number.isInteger(n) || n < 0) {
    return res.status(404).send('<?xml version="1.0"?><error/>');
  }
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT DISTINCT kanji_form FROM words WHERE kanji_form IS NOT NULL
       ORDER BY kanji_form LIMIT $1 OFFSET $2`,
      [SITEMAP_CHUNK_SIZE, n * SITEMAP_CHUNK_SIZE]
    );

    const urls = [
      ...(n === 0 ? [`  <url><loc>${ROOT_URL}/</loc></url>`] : []),
      ...rows.map(r => `  <url><loc>${ROOT_URL}/word/${encodeURIComponent(r.kanji_form)}</loc></url>`),
    ].join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('sitemap chunk error:', err.message);
    res.status(500).send('<?xml version="1.0"?><error/>');
  } finally {
    client.release();
  }
});

// ─── React 静的ファイル配信 ───────────────────────────────────────────────────
const buildPath = path.join(__dirname, '../build');
app.use(express.static(buildPath));
app.use((req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`🚀 meanji API server running on port ${PORT}`));
