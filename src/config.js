/**
 * Configuración del modo de respuesta.
 *
 * Qué hace: declara si la respuesta la produce el modelo simulado o,
 * en un trabajo futuro, el adaptador de LM Studio.
 * Recibe: nada; es un módulo de constantes.
 * Devuelve: el objeto CONFIG.
 * Se relaciona con chatbot.js (elige el generador) y adaptadorLMStudio.js
 * (lee la URL, el nombre del modelo y la temperatura). Las pruebas y la
 * interfaz usan siempre el valor por defecto, «simulado».
 */

export const CONFIG = {
  // Valor por defecto. No cambiarlo en las pruebas: no hay hardware
  // para cargar un modelo y el adaptador queda sin probar.
  MODO_MODELO: 'simulado',
  lmStudio: {
    baseUrl: 'http://localhost:1234/v1',
    modelo: 'modelo-cargado-en-lm-studio',
    // Temperatura baja: si algún día se activa el adaptador, se pide
    // una redacción estable, no creativa.
    temperatura: 0.1,
  },
  VERSION: '0.2 (Avance 2)',
  // 'clasificador' usa el SVM exportado. 'reglas' conserva el puntaje del Avance 1.
  // El SVM acierta 13 de 15 turnos del Avance 1. Dos etiquetas cambian
  // (paráfrasis de lluvia y «fuera_de_alcance» en vez de «respaldo»), así que
  // el valor por defecto sigue en reglas para no romper esa suite.
  // Las pruebas multimodales activan 'clasificador' de forma explícita.
  DETECTOR_INTENCION: 'reglas',
  // Puntaje mínimo del SVM. Por debajo, la respuesta es el respaldo.
  UMBRAL_CLASIFICADOR: 0.0,
  // Por debajo de esta confianza la escena visual se comunica como incierta.
  UMBRAL_VISUAL: 0.50,
};
