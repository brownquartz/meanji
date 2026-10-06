// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SearchPage from './SearchPage';
import WordPage from './WordPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import VocabPage from './VocabPage';
import Navbar from './Navbar';
import { LanguageProvider } from './LanguageContext';
import { AuthProvider } from './AuthContext';
import Footer from './Footer';
import './meanji.css';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/word/:text" element={<WordPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/vocab" element={<VocabPage />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}
