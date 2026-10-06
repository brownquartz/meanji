// src/Navbar.js
// meanji専用の上部ナビバー。kanatomyの「カード1枚」レイアウトと差別化するため、
// 全幅のナビ＋ヒーロー検索、という辞書サイトらしい構成にする。
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LanguageSettings from './LanguageSettings';
import { useAuth } from './AuthContext';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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
        <LanguageSettings />
      </div>
    </nav>
  );
}
