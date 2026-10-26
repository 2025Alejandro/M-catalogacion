/**
 * Lista de mensajes.
 *
 * Qué hace: pinta las burbujas del usuario y del bot, conserva los saltos
 * de línea y anuncia los mensajes nuevos.
 * Recibe: los mensajes y si el bot está «escribiendo».
 * Devuelve: la lista accesible.
 * Se relaciona con ChatWindow.jsx. El texto del bot trae \n y viñetas.
 */

import { useEffect, useRef } from 'react';

/**
 * @param {{ mensajes: { rol: string, texto: string }[], escribiendo: boolean }} props
 * @returns {import('react').JSX.Element}
 */
export default function MessageList({ mensajes, escribiendo }) {
  const finalRef = useRef(null);

  useEffect(() => {
    finalRef.current?.scrollIntoView({ block: 'end' });
  }, [mensajes, escribiendo]);

  return (
    <ol className="mensajes" aria-live="polite" aria-relevant="additions">
      {mensajes.map((mensaje, indice) => (
        <li key={`${mensaje.rol}-${indice}`} className={`burbuja burbuja-${mensaje.rol}`}>
          <span className="burbuja-autor">{mensaje.rol === 'usuario' ? 'Tú' : 'Asistente'}</span>
          <p>{mensaje.texto}</p>
        </li>
      ))}
      {escribiendo && (
        <li className="burbuja burbuja-bot burbuja-espera">
          <span className="burbuja-autor">Asistente</span>
          <p>escribiendo…</p>
        </li>
      )}
      <li className="ancla" ref={finalRef} aria-hidden="true" />
    </ol>
  );
}
