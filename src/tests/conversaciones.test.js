/**
 * Pruebas de las conversaciones del anexo.
 *
 * Qué hace: recorre cada conversación con un Chatbot nuevo y comprueba
 * la intención y los fragmentos de la respuesta.
 * Recibe: los casos de casosPrueba.json.
 * Devuelve: el resultado de Jest. No llama a la red ni al adaptador.
 * Se relaciona con chatbot.js y textoUtils.js. La comparación ignora
 * mayúsculas y acentos.
 */

import { Chatbot } from '../chatbot/chatbot';
import { normalizar } from '../chatbot/textoUtils';
import casos from './casosPrueba.json';

describe('conversaciones del acervo de demostración', () => {
  test.each(casos)('caso $id: $nombre', async (caso) => {
    const chatbot = new Chatbot();

    for (let indice = 0; indice < caso.turnos.length; indice += 1) {
      const turno = caso.turnos[indice];
      const respuesta = await chatbot.responder(turno.usuario);
      const recibida = normalizar(respuesta);

      expect(chatbot.diagnostico.intencion).toBe(turno.intencionEsperada);

      turno.respuestaDebeContener.forEach((fragmento) => {
        expect(recibida).toContain(normalizar(fragmento));
      });

      (turno.respuestaNoDebeContener || []).forEach((fragmento) => {
        expect(recibida).not.toContain(normalizar(fragmento));
      });
    }
  });
});
