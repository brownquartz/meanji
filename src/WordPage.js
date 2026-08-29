// src/WordPage.js
// 単語の詳細ページ。kanatomy の「この漢字を使った熟語」リンクの遷移先にもなる。
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import MeaningsList from './MeaningsList';
import './App.css';
import './MainApp.css';

const API_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:4001';

export default function WordPage() {
  const { text } = useParams();
  const [data, setData] = useState(null); // { entries } | 'not-found' | null

  useEffect(() => {
    setData(null);
    fetch(`${API_URL}/api/word/${encodeURIComponent(text)}`)
      .then(r => {
        if (r.status === 404) return 'not-found';
        return r.json();
      })
      .then(setData)
      .catch(() => setData('not-found'));
  }, [text]);

  return (
    <div className="app-container">
      <Helmet>
        <title>{text}｜meanji</title>
        <meta name="description" content={`「${text}」の読み方・意味を調べる`} />
      </Helmet>

      <h1 className="header">{text}</h1>

      {!data && <div>Loading...</div>}

      {data && data !== 'not-found' && (
        <div className="word-result">
          {data.entries.map((entry, i) => (
            <div key={i} className="word-entry">
              <p className="word-reading">{entry.reading}</p>
              <MeaningsList meanings={entry.meanings} />
            </div>
          ))}
        </div>
      )}

      {data === 'not-found' && (
        <div className="no-data" style={{ marginTop: '1rem' }}>「{text}」は辞書に登録がありませんでした。</div>
      )}

      <p style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link to="/">← 単語検索へ戻る</Link>
      </p>
    </div>
  );
}
