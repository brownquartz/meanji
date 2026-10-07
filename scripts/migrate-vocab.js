// scripts/migrate-vocab.js
// 単語帳（アカウント・カテゴリ・タグ・保存単語）用のテーブルを作成する。
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // タグ機能はユーザーごとにON/OFFできる（カテゴリは常時有効・変更不可の方針のため
    // こちらだけ設定項目にする）。
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tags_enabled BOOLEAN NOT NULL DEFAULT true
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, name)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, name)
      )
    `);

    // word_text: words.kanji_form（またはkanji_formが無い語なら reading）をそのまま保持。
    // /word/:text ページが表す単位（同じ表記の複数エントリ）と一致させるため、
    // words.id への外部キーではなくテキストで持つ。
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_words (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        word_text TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, word_text)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_word_tags (
        saved_word_id INTEGER NOT NULL REFERENCES saved_words(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (saved_word_id, tag_id)
      )
    `);

    await client.query('COMMIT');
    console.log('vocab tables ready: users, categories, tags, saved_words, saved_word_tags');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
