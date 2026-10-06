// src/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from './AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
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
      await register(email, password);
      navigate('/vocab');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="meanji-main" style={{ marginTop: '2rem' }}>
      <Helmet><title>新規登録｜meanji</title></Helmet>
      <div className="meanji-auth-card">
        <h1>新規登録</h1>
        <form onSubmit={handleSubmit} className="meanji-auth-form">
          <label>
            メールアドレス
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>
            パスワード（8文字以上）
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </label>
          {error && <p className="meanji-auth-error">{error}</p>}
          <button type="submit" disabled={submitting}>{submitting ? '...' : '登録する'}</button>
        </form>
        <p className="meanji-auth-switch">
          既にアカウントをお持ちの方は <Link to="/login">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
