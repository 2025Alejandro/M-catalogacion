/**
 * Arranque de React.
 *
 * Qué hace: monta la aplicación en el nodo root.
 * Recibe: el árbol de App.
 * Devuelve: nada; deja la interfaz en el documento.
 * Se relaciona con App.js, index.css y public/index.html.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
