// src/SearchPage.js
// meanji のトップページ。ヒーロー型の検索ボックス＋カード型結果一覧。
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import MeaningsList from './MeaningsList';

const API_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:4001';

export default function SearchPage() {
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (term) => {
    if (!term) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/words/search?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    const term = inputValue.trim();
    setSearchTerm(term);
    doSearch(term);
  };
  const handleKeyDown = e => { if (e.key === 'Enter') handleSearch(); };

  return (
    <div>
      <Helmet>
        <title>meanji｜日本語単語検索</title>
        <meta name="description" content="読みまたは表記（部分一致）から日本語の単語を検索します。" />
      </Helmet>

      <div className="meanji-hero">
        <h1 className="meanji-hero__title">meanji</h1>
        <p className="meanji-hero__subtitle">日本語の単語を、表記でも読みでも。</p>
        <div className="meanji-search-box">
          <input
            placeholder="単語（表記または読み）を入力"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSearch}>検索</button>
        </div>
        {searchTerm && (
          <div className="meanji-search-info">
            {loading ? '検索中…' : `「${searchTerm}」の検索結果`}
          </div>
        )}
      </div>

      <div className="meanji-main">
        {results.length > 0 && (
          <div className="meanji-results">
            {results.map((entry, i) => (
              <Link
                key={i}
                to={`/word/${encodeURIComponent(entry.kanji_form || entry.reading)}`}
                className="meanji-card"
              >
                <h3 className="meanji-card__title">{entry.kanji_form || entry.reading}</h3>
                {entry.kanji_form && <p className="meanji-card__reading">{entry.reading}</p>}
                <MeaningsList meanings={entry.meanings} />
              </Link>
            ))}
          </div>
        )}

        {searchTerm && !loading && results.length === 0 && (
          <div className="meanji-no-data">該当する単語が見つかりませんでした。</div>
        )}
      </div>
    </div>
  );
}
