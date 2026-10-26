/**
 * Índice del acervo y recuperación de registros.
 *
 * Qué hace: prepara una vez las raíces del catálogo y, para cada consulta,
 * devuelve los registros que encajan por ID, contexto, términos, frase,
 * filtro de fecha o tipo, y etiquetas compartidas.
 * Recibe: los datos extraídos y el último material de la conversación.
 * Devuelve: grupos de coincidencias ya ordenados.
 * Se relaciona con textoUtils.js, baseConocimiento.json y chatbot.js.
 * El modelo no busca por su cuenta: solo redacta a partir de este resultado.
 */

import base from '../data/baseConocimiento.json';
import { normalizar, raices } from './textoUtils';

const CATALOGO = base.catalogo_demo;

/**
 * Comparación binaria de IDs. No usa el locale del sistema para que
 * el orden no cambie entre máquinas.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compararId(a, b) {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

/**
 * Índice de raíces. Se construye al cargar el módulo: el catálogo de
 * demostración no cambia durante la ejecución.
 */
const INDICE = Object.entries(CATALOGO).map(([id, registro]) => {
  const textoMeta = [
    registro.titulo,
    registro.resumen,
    registro.tipo,
    ...(registro.etiquetas || []),
    ...(registro.palabras_relacionadas || []),
  ].join(' ');

  return {
    id,
    registro,
    meta: new Set(raices(textoMeta)),
    fragmentos: (registro.fragmentos || []).map((fragmento) => ({
      tc: fragmento.tc,
      texto: fragmento.texto,
      raices: new Set(raices(fragmento.texto)),
    })),
  };
});

/**
 * Cuenta cuántos términos de la consulta están en un conjunto de raíces.
 *
 * @param {string[]} terminos
 * @param {Set<string>} bolsa
 * @returns {number}
 */
function contarCompartidos(terminos, bolsa) {
  return terminos.filter((termino) => bolsa.has(termino)).length;
}

/**
 * Materiales cuyo título, resumen, tipo, etiquetas, palabras relacionadas
 * o transcripción comparten términos con la consulta.
 *
 * @param {string[]} terminos
 * @returns {{ cantidad: number, id: string, mejorFragmento: { tc: string, texto: string } | null }[]}
 */
function buscarPorTerminos(terminos) {
  const distintos = [...new Set(terminos)];
  if (distintos.length === 0) {
    return [];
  }

  const resultados = [];
  INDICE.forEach((entrada) => {
    const coinciden = distintos.filter((termino) => {
      if (entrada.meta.has(termino)) {
        return true;
      }
      return entrada.fragmentos.some((fragmento) => fragmento.raices.has(termino));
    });
    if (coinciden.length === 0) {
      return;
    }

    // El fragmento que se cita es el que comparte más términos.
    // Si el acierto fue solo por el título, queda null y la plantilla
    // puede avisar de que aún no hay transcripción.
    let mejorFragmento = null;
    let mejorCuenta = 0;
    entrada.fragmentos.forEach((fragmento) => {
      const cuenta = contarCompartidos(distintos, fragmento.raices);
      if (cuenta > mejorCuenta) {
        mejorCuenta = cuenta;
        mejorFragmento = { tc: fragmento.tc, texto: fragmento.texto };
      }
    });

    resultados.push({
      cantidad: coinciden.length,
      id: entrada.id,
      mejorFragmento,
    });
  });

  resultados.sort((a, b) => b.cantidad - a.cantidad || compararId(a.id, b.id));
  return resultados;
}

/**
 * Fragmentos que contienen bastantes términos de la frase citada.
 * El mínimo exigido evita que una sola palabra suelta dispare un acierto.
 *
 * @param {string[]} terminosFrase
 * @returns {{ k: number, id: string, fragmento: { tc: string, texto: string } }[]}
 */
function buscarPorFrase(terminosFrase) {
  if (!terminosFrase || terminosFrase.length === 0) {
    return [];
  }

  const n = terminosFrase.length;
  const necesarios = Math.max(Math.min(2, n), Math.ceil(0.6 * n));
  const resultados = [];

  INDICE.forEach((entrada) => {
    let mejor = null;
    let mejorK = 0;
    entrada.fragmentos.forEach((fragmento) => {
      const k = contarCompartidos(terminosFrase, fragmento.raices);
      if (k > mejorK) {
        mejorK = k;
        mejor = fragmento;
      }
    });
    if (mejor && mejorK >= necesarios) {
      resultados.push({
        k: mejorK,
        id: entrada.id,
        fragmento: { tc: mejor.tc, texto: mejor.texto },
      });
    }
  });

  resultados.sort((a, b) => b.k - a.k || compararId(a.id, b.id));
  return resultados;
}

/**
 * Filtro acumulativo: solo se exige el tipo, el rango o el año que
 * realmente se detectaron. Un registro tiene que cumplir todos ellos.
 *
 * @param {{ tipo: string | null, rango: { desde: string, hasta: string } | null, anio: string | null }} datos
 * @returns {string[]}
 */
function buscarPorFiltro(datos) {
  if (!datos.tipo && !datos.rango && !datos.anio) {
    return [];
  }

  const entradas = INDICE.filter((entrada) => {
    const registro = entrada.registro;
    if (datos.tipo && normalizar(registro.tipo) !== normalizar(datos.tipo)) {
      return false;
    }
    if (datos.rango && (registro.ingreso < datos.rango.desde || registro.ingreso > datos.rango.hasta)) {
      return false;
    }
    if (datos.anio) {
      const anioIngreso = registro.ingreso.slice(0, 4);
      const enTexto = new RegExp(`\\b${datos.anio}\\b`).test(
        normalizar(`${registro.titulo} ${registro.resumen}`),
      );
      if (anioIngreso !== datos.anio && !enTexto) {
        return false;
      }
    }
    return true;
  });

  entradas.sort((a, b) => {
    if (a.registro.ingreso !== b.registro.ingreso) {
      return a.registro.ingreso < b.registro.ingreso ? 1 : -1;
    }
    return compararId(b.id, a.id);
  });

  return entradas.map((entrada) => entrada.id);
}

/**
 * Otros materiales que comparten raíces de etiqueta con la ficha base.
 * No usa el título: «relacionado» aquí significa el mismo tema catalogado.
 *
 * @param {string | null} baseId
 * @returns {{ cantidad: number, id: string, enComun: string[] }[]}
 */
function buscarRelacionados(baseId) {
  if (!baseId || !CATALOGO[baseId]) {
    return [];
  }

  const raicesBase = new Set(raices((CATALOGO[baseId].etiquetas || []).join(' ')));
  if (raicesBase.size === 0) {
    return [];
  }

  const resultados = [];
  INDICE.forEach((entrada) => {
    if (entrada.id === baseId) {
      return;
    }
    const enComun = (entrada.registro.etiquetas || []).filter((etiqueta) => (
      raices(etiqueta).some((termino) => raicesBase.has(termino))
    ));
    if (enComun.length > 0) {
      resultados.push({ cantidad: enComun.length, id: entrada.id, enComun });
    }
  });

  resultados.sort((a, b) => b.cantidad - a.cantidad || compararId(a.id, b.id));
  return resultados;
}

/**
 * Recupera los registros relevantes para una consulta.
 *
 * @param {object} datos Resultado de extraerDatos.
 * @param {string | null} ultimoMaterial ID usado en un turno anterior.
 * @returns {{
 *   porId: string | null,
 *   porContexto: string | null,
 *   porTerminos: object[],
 *   porFrase: object[],
 *   porFiltro: string[],
 *   relacionados: object[]
 * }}
 */
export function recuperar(datos, ultimoMaterial) {
  const porId = datos.id && CATALOGO[datos.id] ? datos.id : null;
  const porContexto = ultimoMaterial || null;
  const baseRelacionados = porId || porContexto;

  return {
    porId,
    porContexto,
    porTerminos: buscarPorTerminos(datos.terminos),
    porFrase: buscarPorFrase(datos.terminosFrase),
    porFiltro: buscarPorFiltro(datos),
    relacionados: buscarRelacionados(baseRelacionados),
  };
}
