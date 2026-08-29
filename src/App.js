// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SearchPage from './SearchPage';
import WordPage from './WordPage';
import { LanguageProvider } from './LanguageContext';
import LanguageSettings from './LanguageSettings';
import Footer from './Footer';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <LanguageSettings />
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/word/:text" element={<WordPage />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </LanguageProvider>
  );
}
