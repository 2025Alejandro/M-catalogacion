/**
 * Clasificador de intenciones del Avance 2.
 *
 * Qué hace: aplica el SVM lineal entrenado en Python (TF-IDF de uni y bigramas).
 * Recibe: el texto del usuario y, al crear el clasificador, el JSON exportado y una función de raíz.
 * Devuelve: intención, puntaje, margen, tres mayores y tokens.
 * Se relaciona con ml/exportar_modelo_js.py, textoUtils.js y chatbot.js.
 * La prueba de paridad comprueba que los tokens y la clase coincidan con Python.
 */

/**
 * Minúsculas y sin acentos. Sustituye IDs de dos letras y cinco dígitos,
 * y los tiempos, por marcadores, igual que preprocesamiento.py.
 * La extracción del Avance 1 no usa esta función.
 *
 * @param {string} texto
 * @returns {string}
 */
export function normalizarParaModelo(texto) {
  const sinMarcas = String(texto ?? '')
    .replace(/\b[a-zA-Z]{2}\d{5}\b/g, ' idmaterial ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' timecode ');
  return sinMarcas.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Crea el clasificador a partir del modelo exportado.
 *
 * @param {object} modelo Contenido de modeloIntenciones.json.
 * @param {(token: string) => string} raiz Stemmer español.
 * @returns {{ preprocesar: Function, clasificar: Function }}
 */
export function crearClasificador(modelo, raiz) {
  const stop = new Set(modelo.stopwords);
  const marcadores = new Set(['idmaterial', 'timecode']);
  // Medido contra NLTK Snowball en paridad.json: snowball-stemmers deja
  // «ambientacion» igual y NLTK la reduce a «ambient». No se inventan más equivalencias.
  const ajusteNltk = { ambientacion: 'ambient' };

  /**
   * Normaliza, tokeniza, quita stopwords y aplica la raíz.
   * Los marcadores no pasan por el stemmer.
   *
   * @param {string} texto
   * @returns {string[]}
   */
  function preprocesar(texto) {
    const tokens = normalizarParaModelo(texto).match(/[a-z0-9]+/g) || [];
    return tokens
      .filter((token) => !stop.has(token))
      .map((token) => {
        if (marcadores.has(token)) {
          return token;
        }
        const reducida = raiz(token);
        return ajusteNltk[reducida] || reducida;
      });
  }

  /**
   * Intención de mayor puntaje del SVM.
   * tf = 1 + ln(conteo); el vector se normaliza con la norma L2.
   *
   * @param {string} texto
   * @returns {{ intencion: string, puntaje: number, margen: number, puntajes: object[], tokens: string[] }}
   */
  function clasificar(texto) {
    const tokens = preprocesar(texto);
    const gramas = tokens.concat(tokens.slice(1).map((token, indice) => `${tokens[indice]} ${token}`));
    const conteo = new Map();
    gramas.forEach((grama) => {
      const indice = modelo.vocabulario[grama];
      if (indice !== undefined) {
        conteo.set(indice, (conteo.get(indice) || 0) + 1);
      }
    });
    const vector = new Map();
    let norma2 = 0;
    conteo.forEach((cantidad, indice) => {
      const valor = (1 + Math.log(cantidad)) * modelo.idf[indice];
      vector.set(indice, valor);
      norma2 += valor * valor;
    });
    const norma = Math.sqrt(norma2) || 1;
    const puntajes = modelo.clases.map((clase, claseIndice) => {
      let suma = modelo.intercepto[claseIndice];
      vector.forEach((valor, indice) => {
        suma += (modelo.coef[claseIndice][indice] * valor) / norma;
      });
      return { clase, puntaje: suma };
    });
    const orden = [...puntajes].sort((a, b) => b.puntaje - a.puntaje);
    return {
      intencion: orden[0].clase,
      puntaje: orden[0].puntaje,
      margen: orden[0].puntaje - orden[1].puntaje,
      puntajes: orden.slice(0, 3),
      tokens,
    };
  }

  return { preprocesar, clasificar };
}
