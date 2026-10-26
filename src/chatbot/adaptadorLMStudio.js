/**
 * Adaptador teórico de LM Studio. Sin probar.
 *
 * Sin probar: no hay hardware para ejecutar un modelo. Hermes se usaría
 * cargándolo en LM Studio con esta misma API.
 *
 * Qué hace: cumpliría el mismo contrato que ModeloSimulado.generar.
 * Enviaría la pregunta y los registros a un servidor compatible con la
 * API de chat de OpenAI y traduciría el JSON de vuelta.
 * Recibe: el paquete de la consulta.
 * Devuelve: { intencion, respuesta, puntajes, saludo, materialUsado }.
 * Si la petición falla, lanza un error para que chatbot.js vuelva al
 * modelo simulado. Este archivo no se ejecuta con MODO_MODELO en
 * «simulado» y las pruebas automáticas no lo llaman.
 * Se relaciona con config.js y chatbot.js.
 */

import { CONFIG } from '../config';

/**
 * Saca el primer objeto JSON de un texto. Algunos servidores envuelven
 * la respuesta en una cerca de código.
 *
 * @param {string} contenido
 * @returns {string}
 */
function extraerJson(contenido) {
  const inicio = contenido.indexOf('{');
  const fin = contenido.lastIndexOf('}');
  if (inicio === -1 || fin === -1 || fin < inicio) {
    throw new Error('LM Studio no devolvió un JSON.');
  }
  return contenido.slice(inicio, fin + 1);
}

export class AdaptadorLMStudio {
  /**
   * Pide una respuesta al servidor configurado.
   * No se invoca mientras MODO_MODELO sea «simulado».
   *
   * @param {object} paquete
   * @returns {Promise<{ intencion: string | null, respuesta: string, puntajes: object, saludo: boolean, materialUsado: string | null }>}
   */
  async generar(paquete) {
    const url = `${CONFIG.lmStudio.baseUrl}/chat/completions`;
    const nombres = Object.keys(paquete.intenciones || {});
    const sistema = [
      ...(paquete.instrucciones || []),
      `Intenciones permitidas: ${nombres.join(', ')}.`,
      'Responde únicamente con un JSON {"intencion":"...","respuesta":"..."}.',
    ].join('\n');

    const usuario = JSON.stringify({
      mensaje: paquete.mensaje,
      historial: paquete.historial,
      registros: paquete.registros,
    });

    let http;
    try {
      http = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: CONFIG.lmStudio.modelo,
          temperature: CONFIG.lmStudio.temperatura,
          messages: [
            { role: 'system', content: sistema },
            { role: 'user', content: usuario },
          ],
        }),
      });
    } catch (error) {
      throw new Error('LM Studio no está disponible.');
    }

    if (!http.ok) {
      throw new Error(`LM Studio respondió con estado ${http.status}.`);
    }

    const cuerpo = await http.json();
    const contenido = cuerpo.choices?.[0]?.message?.content || '';
    const json = JSON.parse(extraerJson(contenido));
    const citado = String(json.respuesta || '').match(/\b[A-Z]{2,3}\d{4,6}\b/);

    return {
      intencion: json.intencion ?? null,
      respuesta: json.respuesta || '',
      puntajes: {},
      saludo: false,
      materialUsado: citado ? citado[0] : null,
    };
  }
}
