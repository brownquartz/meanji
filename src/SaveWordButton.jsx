// src/SaveWordButton.jsx
// 単語詳細ページに置く保存ボタン。未ログインならログイン導線を出すだけ。
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4001';

async function api(path, options) {
  const res = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
  return data;
}

export default function SaveWordButton({ wordText }) {
  const { user, loading: authLoading } = useAuth();
  const [saved, setSaved] = useState(null); // null=未取得 | savedWordオブジェクト | false
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');

  const refreshStatus = useCallback(() => {
    api(`/api/vocab/words/status/${encodeURIComponent(wordText)}`)
      .then(d => setSaved(d.saved ? d.savedWord : false))
      .catch(() => setSaved(false));
  }, [wordText]);

  useEffect(() => {
    if (!user) return;
    refreshStatus();
    api('/api/vocab/categories').then(d => setCategories(d.categories)).catch(() => {});
    if (user.tags_enabled) {
      api('/api/vocab/tags').then(d => setTags(d.tags)).catch(() => {});
    }
  }, [user, refreshStatus]);

  if (authLoading) return null;

  if (!user) {
    return (
      <p className="meanji-save-word">
        <Link to="/login">ログイン</Link>すると単語帳に保存できます
      </p>
    );
  }

  if (saved === null) return null;

  const save = async () => {
    try {
      await api('/api/vocab/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_text: wordText }),
      });
      refreshStatus();
    } catch (err) { setError(err.message); }
  };

  const unsave = async () => {
    try {
      await api(`/api/vocab/words/${saved.id}`, { method: 'DELETE' });
      setSaved(false);
    } catch (err) { setError(err.message); }
  };

  const changeCategory = async (categoryId) => {
    try {
      await api(`/api/vocab/words/${saved.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId ? Number(categoryId) : null }),
      });
      refreshStatus();
    } catch (err) { setError(err.message); }
  };

  const toggleTag = async (tagId, has) => {
    try {
      if (has) {
        await api(`/api/vocab/words/${saved.id}/tags/${tagId}`, { method: 'DELETE' });
      } else {
        await api(`/api/vocab/words/${saved.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_id: tagId }),
        });
      }
      refreshStatus();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="meanji-save-word">
      {error && <p className="meanji-auth-error">{error}</p>}
      {!saved && <button onClick={save}>単語帳に保存</button>}
      {saved && (
        <div className="meanji-save-word__controls">
          <span>単語帳に保存済み</span>
          <select value={saved.category_id || ''} onChange={e => changeCategory(e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {user.tags_enabled && (
            <div className="meanji-save-word__tags">
              {tags.map(t => {
                const has = (saved.tags || []).some(x => x.id === t.id);
                return (
                  <button
                    key={t.id}
                    className={has ? 'meanji-vocab__tag-chip active' : 'meanji-vocab__tag-chip'}
                    onClick={() => toggleTag(t.id, has)}
                  >{t.name}</button>
                );
              })}
            </div>
          )}
          <button onClick={unsave} className="meanji-vocab__delete">削除</button>
        </div>
      )}
    </div>
  );
}
