/**
 * Interpretación de una predicción visual ya calculada.
 *
 * Qué hace: lee la predicción guardada de una imagen de muestra y busca
 * materiales del catálogo con esa escena.
 * Recibe: el id de la muestra, el JSON de predicciones y el catálogo.
 * Devuelve: clase, nombre, confianza, modo, si es incierta y los IDs.
 * Se relaciona con prediccionesVisual.json, config.js y chatbot.js.
 * No ejecuta la red neuronal. No identifica personas.
 */

import { CONFIG } from '../config';

/**
 * Interpreta una muestra.
 *
 * @param {string} muestraId
 * @param {object} predicciones
 * @param {object} catalogo
 * @param {object} escenasVisuales Nombres legibles.
 * @returns {{ clase: string | null, nombre: string, confianza: number, modo: string, incierto: boolean, materiales: string[], encontrada: boolean }}
 */
export function interpretarImagen(muestraId, predicciones, catalogo, escenasVisuales) {
  const muestra = (predicciones.muestras || []).find((item) => item.id === muestraId);
  if (!muestra) {
    return {
      clase: null,
      nombre: '',
      confianza: 0,
      modo: predicciones.modo || 'simulado',
      incierto: true,
      materiales: [],
      encontrada: false,
    };
  }

  const clase = muestra.clase_predicha;
  const confianza = muestra.confianza;
  const incierto = confianza < CONFIG.UMBRAL_VISUAL;
  const materiales = incierto
    ? []
    : Object.entries(catalogo)
      .filter(([, registro]) => (registro.escenas || []).includes(clase))
      .map(([id]) => id)
      .sort();

  return {
    clase,
    nombre: (escenasVisuales && escenasVisuales[clase]) || clase,
    confianza,
    modo: predicciones.modo || 'simulado',
    incierto,
    materiales,
    encontrada: true,
  };
}
