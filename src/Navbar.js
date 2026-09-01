// src/Navbar.js
// meanji専用の上部ナビバー。kanatomyの「カード1枚」レイアウトと差別化するため、
// 全幅のナビ＋ヒーロー検索、という辞書サイトらしい構成にする。
import React from 'react';
import { Link } from 'react-router-dom';
import LanguageSettings from './LanguageSettings';

export default function Navbar() {
  return (
    <nav className="meanji-nav">
      <Link to="/" className="meanji-nav__brand">meanji</Link>
      <LanguageSettings />
    </nav>
  );
}
