// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SearchPage from './SearchPage';
import WordPage from './WordPage';
import Navbar from './Navbar';
import { LanguageProvider } from './LanguageContext';
import Footer from './Footer';
import './meanji.css';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/word/:text" element={<WordPage />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </LanguageProvider>
  );
}
