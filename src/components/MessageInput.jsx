/**
 * Campo de la consulta.
 *
 * Qué hace: recoge el texto y lo envía con el botón o con Enter.
 * Recibe: onEnviar y si hay que bloquear el campo mientras se responde.
 * Devuelve: el formulario.
 * Se relaciona con ChatWindow.jsx.
 */

import { useState } from 'react';

/**
 * @param {{ onEnviar: (texto: string) => void, deshabilitado: boolean }} props
 * @returns {import('react').JSX.Element}
 */
export default function MessageInput({ onEnviar, deshabilitado }) {
  const [texto, setTexto] = useState('');

  /**
   * Envía el texto recortado y vacía el campo.
   *
   * @returns {void}
   */
  function enviar() {
    const limpio = texto.trim();
    if (!limpio || deshabilitado) {
      return;
    }
    onEnviar(limpio);
    setTexto('');
  }

  return (
    <form
      className="entrada"
      onSubmit={(evento) => {
        evento.preventDefault();
        enviar();
      }}
    >
      <label htmlFor="mensaje">Escribe tu consulta</label>
      <div className="entrada-fila">
        <input
          id="mensaje"
          type="text"
          value={texto}
          disabled={deshabilitado}
          placeholder="ID, tema, persona, frase o fecha"
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault();
              enviar();
            }
          }}
        />
        <button type="submit" disabled={deshabilitado || texto.trim() === ''}>
          Enviar
        </button>
      </div>
    </form>
  );
}
