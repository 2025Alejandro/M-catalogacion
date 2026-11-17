/**
 * Estado de la conversación en memoria.
 *
 * Qué hace: crea un Chatbot, envía mensajes y reinicia la charla.
 * Recibe: el texto que escribe el usuario o que pulsa en una sugerencia.
 * Devuelve: mensajes, indicador de escritura, diagnóstico y acciones.
 * Se relaciona con chatbot.js y con los componentes del chat.
 * No usa localStorage.
 */

import { useRef, useState } from 'react';
import base from '../data/baseConocimiento.json';
import prediccionesVisual from '../data/prediccionesVisual.json';
import { Chatbot } from '../chatbot/chatbot';

// La bienvenida es la respuesta de cortesía > saludo, no un turno del modelo.
const SALUDO_INICIAL = base.intenciones.cortesia.subintenciones.saludo.respuestas[0];

// El retraso es solo visual: la respuesta simulada ya está lista antes.
const PAUSA_ESCRITURA_MS = 400;

/**
 * Espera el tiempo que falta para que «escribiendo…» se note.
 *
 * @param {number} inicio Marca de performance.now o Date.now.
 * @returns {Promise<void>}
 */
function esperarPausa(inicio) {
  const restante = PAUSA_ESCRITURA_MS - (Date.now() - inicio);
  if (restante <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolver) => {
    setTimeout(resolver, restante);
  });
}

/**
 * Hook del chat.
 *
 * @returns {{
 *   mensajes: { rol: string, texto: string }[],
 *   escribiendo: boolean,
 *   diagnostico: object | null,
 *   enviar: (texto: string) => Promise<void>,
 *   reiniciar: () => void
 * }}
 */
export function useChatbot() {
  const chatbotRef = useRef(null);
  if (chatbotRef.current === null) {
    chatbotRef.current = new Chatbot();
  }

  const [mensajes, setMensajes] = useState([{ rol: 'bot', texto: SALUDO_INICIAL }]);
  const [escribiendo, setEscribiendo] = useState(false);
  const [diagnostico, setDiagnostico] = useState(null);
  const [imagenElegida, setImagenElegida] = useState(null);

  /**
   * Envía texto y, si hay, una imagen de muestra.
   * Sin texto y con imagen, la pregunta es la de escena.
   *
   * @param {string} texto
   * @param {{ id: string, archivo: string } | null} [imagen]
   * @returns {Promise<void>}
   */
  async function enviar(texto, imagen = null) {
    const elegida = imagen || null;
    const limpio = String(texto || '').trim() || (elegida ? '¿Qué escena es esta imagen?' : '');
    if (!limpio || escribiendo) {
      return;
    }

    setMensajes((previos) => [...previos, { rol: 'usuario', texto: limpio, imagen: elegida }]);
    setEscribiendo(true);
    setImagenElegida(null);
    const inicio = Date.now();
    const respuesta = await chatbotRef.current.responder(limpio, elegida);
    await esperarPausa(inicio);
    setMensajes((previos) => [...previos, { rol: 'bot', texto: respuesta }]);
    setDiagnostico(chatbotRef.current.diagnostico);
    setEscribiendo(false);
  }

  /**
   * Vacía la charla y vuelve a mostrar solo el saludo.
   *
   * @returns {void}
   */
  function reiniciar() {
    chatbotRef.current.reiniciar();
    setMensajes([{ rol: 'bot', texto: SALUDO_INICIAL }]);
    setDiagnostico(null);
    setEscribiendo(false);
    setImagenElegida(null);
  }

  return {
    mensajes,
    escribiendo,
    diagnostico,
    enviar,
    reiniciar,
    muestras: prediccionesVisual.muestras,
    imagenElegida,
    elegirImagen: setImagenElegida,
    modoVisual: prediccionesVisual.modo,
  };
}
