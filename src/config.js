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
  VERSION: '0.1 (Avance 1)',
};
