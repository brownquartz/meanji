// src/VocabPage.jsx
// 単語帳：カテゴリ（メールのフォルダ的・排他）とタグ（複数選択可）で保存した単語を絞り込む。
// 条件なしで開いた時は全件表示。タグ機能自体は設定でON/OFFできる（カテゴリは常時有効）。
import React, { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from './AuthContext';
import MeaningsList from './MeaningsList';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

async function api(path, options) {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
  return data;
}

export default function VocabPage() {
  const { user, loading: authLoading, updateSettings } = useAuth();
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [words, setWords] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [tagIds, setTagIds] = useState([]); // 複数選択（OR条件）
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [error, setError] = useState('');
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expanded, setExpanded] = useState({}); // { [word_text]: true }
  const [entries, setEntries] = useState({}); // { [word_text]: entries配列 }

  const tagsEnabled = !!user?.tags_enabled;

  const loadCategories = useCallback(() => {
    api('/api/vocab/categories').then(d => setCategories(d.categories)).catch(e => setError(e.message));
  }, []);
  const loadTags = useCallback(() => {
    api('/api/vocab/tags').then(d => setTags(d.tags)).catch(e => setError(e.message));
  }, []);
  const loadWords = useCallback(() => {
    const params = new URLSearchParams();
    if (categoryId) params.set('category_id', categoryId);
    if (tagsEnabled) tagIds.forEach(id => params.append('tag_id', id));
    const qs = params.toString();
    api(`/api/vocab/words${qs ? `?${qs}` : ''}`).then(d => setWords(d.words)).catch(e => setError(e.message));
  }, [categoryId, tagIds, tagsEnabled]);

  useEffect(() => { if (user) { loadCategories(); if (tagsEnabled) loadTags(); } }, [user, tagsEnabled, loadCategories, loadTags]);
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
      setTagIds(prev => prev.filter(x => x !== id));
      loadTags();
      loadWords();
    } catch (err) { setError(err.message); }
  };

  const toggleFilterTag = (id) => {
    setTagIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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

  const toggleWordTag = async (wordId, tagId, has) => {
    try {
      if (has) {
        await api(`/api/vocab/words/${wordId}/tags/${tagId}`, { method: 'DELETE' });
      } else {
        await api(`/api/vocab/words/${wordId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_id: tagId }),
        });
      }
      loadWords();
    } catch (err) { setError(err.message); }
  };

  const toggleExpand = (wordText) => {
    setExpanded(prev => ({ ...prev, [wordText]: !prev[wordText] }));
    if (!entries[wordText]) {
      fetch(`${API_URL}/api/word/${encodeURIComponent(wordText)}`)
        .then(r => r.ok ? r.json() : { entries: [] })
        .then(d => setEntries(prev => ({ ...prev, [wordText]: d.entries || [] })))
        .catch(() => setEntries(prev => ({ ...prev, [wordText]: [] })));
    }
  };

  const toggleTagsEnabled = async () => {
    try {
      await updateSettings({ tags_enabled: !tagsEnabled });
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="meanji-main meanji-vocab" style={{ marginTop: '2rem' }}>
      <Helmet><title>単語帳｜meanji</title></Helmet>
      <div className="meanji-vocab__header">
        <h1>単語帳</h1>
        <button type="button" className="meanji-vocab__settings-btn" onClick={() => setSettingsOpen(o => !o)}>
          設定
        </button>
      </div>
      {error && <p className="meanji-auth-error">{error}</p>}

      {settingsOpen && (
        <div className="meanji-vocab__panel meanji-vocab__settings-panel">
          <div className="meanji-vocab__panel-body" style={{ paddingTop: '1rem' }}>
            <label className="meanji-vocab__settings-row">
              <input type="checkbox" checked={tagsEnabled} onChange={toggleTagsEnabled} />
              タグ機能を使う
            </label>
            <p className="meanji-vocab__settings-note">カテゴリは常に使用します（変更できません）。</p>
          </div>
        </div>
      )}

      <div className="meanji-vocab__filters">
        <section className="meanji-vocab__panel">
          <button
            type="button"
            className="meanji-vocab__panel-toggle"
            onClick={() => setCategoriesOpen(o => !o)}
            aria-expanded={categoriesOpen}
          >
            <span>カテゴリ</span>
            <span className="meanji-vocab__chevron">{categoriesOpen ? '▾' : '▸'}</span>
          </button>
          {categoriesOpen && (
            <div className="meanji-vocab__panel-body">
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
            </div>
          )}
        </section>

        {tagsEnabled && (
          <section className="meanji-vocab__panel">
            <button
              type="button"
              className="meanji-vocab__panel-toggle"
              onClick={() => setTagsOpen(o => !o)}
              aria-expanded={tagsOpen}
            >
              <span>タグ（複数選択可）</span>
              <span className="meanji-vocab__chevron">{tagsOpen ? '▾' : '▸'}</span>
            </button>
            {tagsOpen && (
              <div className="meanji-vocab__panel-body">
                <ul className="meanji-vocab__filter-list">
                  <li>
                    <button
                      className={tagIds.length === 0 ? 'active' : ''}
                      onClick={() => setTagIds([])}
                    >すべて</button>
                  </li>
                  {tags.map(t => (
                    <li key={t.id}>
                      <button
                        className={tagIds.includes(t.id) ? 'active' : ''}
                        onClick={() => toggleFilterTag(t.id)}
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
              </div>
            )}
          </section>
        )}
      </div>

      <main className="meanji-vocab__words">
        {words.length === 0 && <div className="meanji-no-data">保存された単語がありません。</div>}
        {words.map(w => (
          <div key={w.id} className="meanji-card meanji-vocab__word">
            <div className="meanji-vocab__word-row">
              <div>
                <Link
                  to={`/word/${encodeURIComponent(w.word_text)}`}
                  state={{ from: 'vocab' }}
                  className="meanji-card__title"
                >
                  {w.word_text}
                </Link>
                <button
                  type="button"
                  className="meanji-vocab__expand-toggle"
                  onClick={() => toggleExpand(w.word_text)}
                >
                  {expanded[w.word_text] ? '意味を隠す ▴' : '意味を見る ▾'}
                </button>
              </div>

              <div className="meanji-vocab__word-controls">
                <select
                  value={w.category_id || ''}
                  onChange={e => moveCategory(w.id, e.target.value ? Number(e.target.value) : null)}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {tagsEnabled && (
                  <div className="meanji-vocab__word-tags">
                    {tags.map(t => {
                      const has = (w.tags || []).some(x => x.id === t.id);
                      return (
                        <button
                          key={t.id}
                          className={has ? 'meanji-vocab__tag-chip active' : 'meanji-vocab__tag-chip'}
                          onClick={() => toggleWordTag(w.id, t.id, has)}
                        >{t.name}</button>
                      );
                    })}
                  </div>
                )}
                <button className="meanji-vocab__delete" onClick={() => removeSavedWord(w.id)}>削除</button>
              </div>
            </div>

            {expanded[w.word_text] && (
              <div className="meanji-vocab__word-meanings">
                {!entries[w.word_text] && <p className="meanji-no-data">読み込み中…</p>}
                {entries[w.word_text] && entries[w.word_text].length === 0 && (
                  <p className="meanji-no-data">辞書に登録がありませんでした。</p>
                )}
                {entries[w.word_text] && entries[w.word_text].map((entry, i) => (
                  <div key={i}>
                    <p className="meanji-card__reading">{entry.reading}</p>
                    <MeaningsList meanings={entry.meanings} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
