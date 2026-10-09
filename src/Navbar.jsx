// src/Navbar.js
// meanji専用の上部ナビバー。kanatomyの「カード1枚」レイアウトと差別化するため、
// 全幅のナビ＋ヒーロー検索、という辞書サイトらしい構成にする。
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LanguageSettings from './LanguageSettings';
import { useAuth } from './AuthContext';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!langMenuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setLangMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [langMenuOpen]);

  return (
    <nav className="meanji-nav">
      <Link to="/" className="meanji-nav__brand">meanji</Link>
      <div className="meanji-nav__right">
        {!loading && (
          user ? (
            <>
              <Link to="/vocab" className="meanji-nav__link">単語帳</Link>
              <button onClick={handleLogout} className="meanji-nav__link-button">ログアウト</button>
            </>
          ) : (
            <Link to="/login" className="meanji-nav__link">ログイン</Link>
          )
        )}
        <div className="meanji-nav__lang-menu" ref={menuRef}>
          <button
            type="button"
            className="meanji-nav__lang-toggle"
            onClick={() => setLangMenuOpen(o => !o)}
            aria-label="表示言語メニュー"
            aria-expanded={langMenuOpen}
          >
            ☰
          </button>
          {langMenuOpen && (
            <div className="meanji-nav__lang-dropdown">
              <LanguageSettings />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
