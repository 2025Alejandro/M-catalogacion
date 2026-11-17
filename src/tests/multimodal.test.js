/**
 * Pruebas multimodales del Avance 2.
 *
 * Qué hace: comprueba el clasificador de texto y las respuestas de imagen.
 * Recibe: predicciones simuladas o reales de prediccionesVisual.json.
 * Devuelve: el resultado de Jest.
 * Se relaciona con chatbot.js. No identifica personas por el rostro.
 */

import { CONFIG } from '../config';
import { Chatbot } from '../chatbot/chatbot';
import { normalizar } from '../chatbot/textoUtils';

const DETECTOR_PREVIO = CONFIG.DETECTOR_INTENCION;

function contieneAlguno(texto, fragmentos) {
  const norm = normalizar(texto);
  return fragmentos.some((fragmento) => norm.includes(normalizar(fragmento)));
}

describe('integración multimodal', () => {
  beforeAll(() => {
    CONFIG.DETECTOR_INTENCION = 'clasificador';
  });

  afterAll(() => {
    CONFIG.DETECTOR_INTENCION = DETECTOR_PREVIO;
  });

  test('resumen de NT20045', async () => {
    const chatbot = new Chatbot();
    await chatbot.responder('¿De qué trata el NT20045?');
    expect(chatbot.diagnostico.intencion).toBe('resumen_material');
  });

  test('personas en EN10388', async () => {
    const chatbot = new Chatbot();
    await chatbot.responder('¿Aparece alguna persona en el EN10388?');
    expect(chatbot.diagnostico.intencion).toBe('personas_en_material');
  });

  test('estado de NT20112', async () => {
    const chatbot = new Chatbot();
    await chatbot.responder('¿En qué estado está el NT20112?');
    expect(chatbot.diagnostico.intencion).toBe('disponibilidad_validacion');
  });

  test('búsqueda de hospitales', async () => {
    const chatbot = new Chatbot();
    const respuesta = await chatbot.responder('Busca videos sobre hospitales');
    expect(chatbot.diagnostico.intencion).toBe('buscar_por_tema');
    expect(normalizar(respuesta)).toContain('nt20112');
  });

  test('imagen con confianza alta', async () => {
    const chatbot = new Chatbot();
    const respuesta = await chatbot.responder('¿Qué escena es esta imagen?', {
      id: 'muestra_conferencia_prensa_1',
    });
    expect(chatbot.diagnostico.intencion).toBe('describir_imagen');
    expect(normalizar(respuesta)).toContain('conferencia de prensa');
    expect(respuesta).toContain('93%');
    expect(respuesta).toContain('NT20045');
    expect(respuesta).toContain('NT20150');
    expect(normalizar(respuesta)).toContain('clasificacion automatica');
    expect(contieneAlguno(respuesta, ['se llama', 'es el señor', 'reconozco a'])).toBe(false);
  });

  test('imagen con confianza baja', async () => {
    const chatbot = new Chatbot();
    const respuesta = await chatbot.responder('', { id: 'muestra_deportes_estadio_2' });
    expect(chatbot.diagnostico.intencion).toBe('describir_imagen');
    expect(normalizar(respuesta)).toContain('no puedo asegurar');
    expect(respuesta).not.toContain('NT');
    expect(respuesta).not.toContain('EN');
    expect(contieneAlguno(respuesta, ['se llama', 'es el señor', 'reconozco a'])).toBe(false);
  });

  test('escena sin imagen adjunta', async () => {
    const chatbot = new Chatbot();
    const respuesta = await chatbot.responder('¿Qué escena es esta imagen?');
    expect(normalizar(respuesta)).toContain('adjunta una imagen de muestra');
  });

  test('fuera de alcance', async () => {
    const chatbot = new Chatbot();
    const respuesta = await chatbot.responder('¿Quién ganó el partido de ayer?');
    expect(chatbot.diagnostico.intencion).toBe('fuera_de_alcance');
    expect(respuesta).not.toContain('VV50003');
  });
});
