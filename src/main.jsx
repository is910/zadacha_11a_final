import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Входна точка на приложението. StrictMode включва допълнителни проверки
// в development режим (double render) — то не влияе на production build.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
