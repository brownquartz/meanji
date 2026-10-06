// src/VocabPage.jsx
// 単語帳：カテゴリ（メールのフォルダ的・排他）とタグ（複数可）で保存した単語を絞り込む。
// 条件なしで開いた時は全件表示。
import React, { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from './AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

async function api(path, options) {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
  return data;
}

export default function VocabPage() {
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [words, setWords] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [tagId, setTagId] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [error, setError] = useState('');

  const loadCategories = useCallback(() => {
    api('/api/vocab/categories').then(d => setCategories(d.categories)).catch(e => setError(e.message));
  }, []);
  const loadTags = useCallback(() => {
    api('/api/vocab/tags').then(d => setTags(d.tags)).catch(e => setError(e.message));
  }, []);
  const loadWords = useCallback(() => {
    const params = new URLSearchParams();
    if (categoryId) params.set('category_id', categoryId);
    if (tagId) params.set('tag_id', tagId);
    const qs = params.toString();
    api(`/api/vocab/words${qs ? `?${qs}` : ''}`).then(d => setWords(d.words)).catch(e => setError(e.message));
  }, [categoryId, tagId]);

  useEffect(() => { if (user) { loadCategories(); loadTags(); } }, [user, loadCategories, loadTags]);
  useEffect(() => { if (user) loadWords(); }, [user, loadWords]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const addCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      await api('/api/vocab/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setNewCategoryName('');
      loadCategories();
    } catch (err) { setError(err.message); }
  };

  const deleteCategory = async (id) => {
    try {
      await api(`/api/vocab/categories/${id}`, { method: 'DELETE' });
      if (categoryId === id) setCategoryId(null);
      loadCategories();
      loadWords();
    } catch (err) { setError(err.message); }
  };

  const addTag = async (e) => {
    e.preventDefault();
    const name = newTagName.trim();
    if (!name) return;
    try {
      await api('/api/vocab/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setNewTagName('');
      loadTags();
    } catch (err) { setError(err.message); }
  };

  const deleteTag = async (id) => {
    try {
      await api(`/api/vocab/tags/${id}`, { method: 'DELETE' });
      if (tagId === id) setTagId(null);
      loadTags();
      loadWords();
    } catch (err) { setError(err.message); }
  };

  const removeSavedWord = async (id) => {
    try {
      await api(`/api/vocab/words/${id}`, { method: 'DELETE' });
      loadWords();
    } catch (err) { setError(err.message); }
  };

  const moveCategory = async (wordId, newCategoryId) => {
    try {
      await api(`/api/vocab/words/${wordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: newCategoryId || null }),
      });
      loadWords();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="meanji-main meanji-vocab" style={{ marginTop: '2rem' }}>
      <Helmet><title>単語帳｜meanji</title></Helmet>
      <h1>単語帳</h1>
      {error && <p className="meanji-auth-error">{error}</p>}

      <div className="meanji-vocab__layout">
        <aside className="meanji-vocab__sidebar">
          <section>
            <h2>カテゴリ</h2>
            <ul className="meanji-vocab__filter-list">
              <li>
                <button
                  className={categoryId === null ? 'active' : ''}
                  onClick={() => setCategoryId(null)}
                >すべて</button>
              </li>
              {categories.map(c => (
                <li key={c.id}>
                  <button
                    className={categoryId === c.id ? 'active' : ''}
                    onClick={() => setCategoryId(c.id)}
                  >{c.name}</button>
                  {!c.is_default && (
                    <button className="meanji-vocab__delete" onClick={() => deleteCategory(c.id)} title="削除">×</button>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={addCategory} className="meanji-vocab__add-form">
              <input
                placeholder="新しいカテゴリ名"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
              />
              <button type="submit">追加</button>
            </form>
          </section>

          <section>
            <h2>タグ</h2>
            <ul className="meanji-vocab__filter-list">
              <li>
                <button
                  className={tagId === null ? 'active' : ''}
                  onClick={() => setTagId(null)}
                >すべて</button>
              </li>
              {tags.map(t => (
                <li key={t.id}>
                  <button
                    className={tagId === t.id ? 'active' : ''}
                    onClick={() => setTagId(t.id)}
                  >{t.name}</button>
                  <button className="meanji-vocab__delete" onClick={() => deleteTag(t.id)} title="削除">×</button>
                </li>
              ))}
            </ul>
            <form onSubmit={addTag} className="meanji-vocab__add-form">
              <input
                placeholder="新しいタグ名"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
              />
              <button type="submit">追加</button>
            </form>
          </section>
        </aside>

        <main className="meanji-vocab__words">
          {words.length === 0 && <div className="meanji-no-data">保存された単語がありません。</div>}
          {words.map(w => (
            <div key={w.id} className="meanji-card meanji-vocab__word">
              <Link to={`/word/${encodeURIComponent(w.word_text)}`} className="meanji-card__title">
                {w.word_text}
              </Link>
              <div className="meanji-vocab__word-meta">
                <select
                  value={w.category_id || ''}
                  onChange={e => moveCategory(w.id, e.target.value ? Number(e.target.value) : null)}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {w.tags.map(t => <span key={t.id} className="meanji-vocab__tag-chip">{t.name}</span>)}
                <button className="meanji-vocab__delete" onClick={() => removeSavedWord(w.id)}>削除</button>
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
