// src/LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/vocab');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="meanji-main" style={{ marginTop: '2rem' }}>
      <Helmet><title>ログイン｜meanji</title></Helmet>
      <div className="meanji-auth-card">
        <h1>ログイン</h1>
        <form onSubmit={handleSubmit} className="meanji-auth-form">
          <label>
            メールアドレス
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>
            パスワード
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
          {error && <p className="meanji-auth-error">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? '...' : 'ログイン'}</button>
        </form>
        <p className="meanji-auth-switch">
          アカウントをお持ちでない方は <Link to="/register">新規登録</Link>
        </p>
      </div>
    </div>
  );
}
