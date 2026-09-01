// src/WordPage.js
// 単語の詳細ページ。kanatomy の「この漢字を使った熟語」リンクの遷移先にもなる。
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import MeaningsList from './MeaningsList';

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
    <div>
      <Helmet>
        <title>{text}｜meanji</title>
        <meta name="description" content={`「${text}」の読み方・意味を調べる`} />
      </Helmet>

      <div className="meanji-hero">
        <div className="meanji-word-header">
          <h1>{text}</h1>
        </div>
      </div>

      <div className="meanji-main">
        {!data && <div className="meanji-no-data">Loading...</div>}

        {data && data !== 'not-found' && (
          <div className="meanji-results">
            {data.entries.map((entry, i) => (
              <div key={i} className="meanji-card">
                <p className="meanji-card__reading">{entry.reading}</p>
                <MeaningsList meanings={entry.meanings} />
              </div>
            ))}
          </div>
        )}

        {data === 'not-found' && (
          <div className="meanji-no-data">「{text}」は辞書に登録がありませんでした。</div>
        )}

        <div style={{ textAlign: 'center' }}>
          <Link to="/" className="meanji-back-link">← 単語検索へ戻る</Link>
        </div>
      </div>
    </div>
  );
}
