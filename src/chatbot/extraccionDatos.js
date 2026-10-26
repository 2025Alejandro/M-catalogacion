/**
 * Extracción de datos de la consulta.
 *
 * Qué hace: lee el mensaje y saca ID, timecode, tipo, rango de fechas,
 * año, términos de búsqueda y la frase citada.
 * Recibe: el texto tal como lo escribió el usuario.
 * Devuelve: el objeto de datos que consumen la recuperación y el modelo.
 * Se relaciona con textoUtils.js, baseConocimiento.json y chatbot.js.
 */

import base from '../data/baseConocimiento.json';
import {
  diaSemanaUTC,
  diasDelMes,
  fechaISO,
  normalizar,
  raiz,
  sumarDiasISO,
  tokenizar,
} from './textoUtils';

const VACIAS_BUSQUEDA = new Set(base.palabras_vacias_busqueda.map(normalizar));
const VACIAS_FRASE = new Set(base.palabras_vacias_frase.map(normalizar));

// Marcas que introducen una cita cuando el usuario no usó comillas.
// Se buscan en el texto ya normalizado y gana la que aparece antes.
const MARCAS_FRASE = ['dijeron que', 'dijo que', 'mencionaron que', 'mencionan que'];

/**
 * Lunes y domingo de la semana que contiene la fecha de referencia.
 * La semana empieza en lunes. fechaReferencia (2026-10-25) es domingo,
 * así que «esta semana» cierra ese mismo día.
 *
 * @param {string} iso
 * @returns {{ desde: string, hasta: string }}
 */
function semanaDe(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  const diaSemana = diaSemanaUTC(anio, mes, dia);
  const diasDesdeLunes = (diaSemana + 6) % 7;
  const lunes = sumarDiasISO(iso, -diasDesdeLunes);
  return { desde: lunes, hasta: sumarDiasISO(lunes, 6) };
}

/**
 * Elige el rango con la prioridad del enunciado. Si ninguna fórmula
 * aparece, devuelve null y el filtro por fecha no se activa.
 *
 * @param {string} norm
 * @param {string} fechaReferencia
 * @returns {{ desde: string, hasta: string } | null}
 */
function extraerRango(norm, fechaReferencia) {
  if (norm.includes('esta semana')) {
    return semanaDe(fechaReferencia);
  }
  if (norm.includes('semana pasada')) {
    const esta = semanaDe(fechaReferencia);
    const domingoAnterior = sumarDiasISO(esta.desde, -1);
    return { desde: sumarDiasISO(domingoAnterior, -6), hasta: domingoAnterior };
  }
  if (/\bhoy\b/.test(norm)) {
    return { desde: fechaReferencia, hasta: fechaReferencia };
  }
  if (/\bayer\b/.test(norm)) {
    const ayer = sumarDiasISO(fechaReferencia, -1);
    return { desde: ayer, hasta: ayer };
  }
  if (norm.includes('este mes')) {
    const [anio, mes] = fechaReferencia.split('-').map(Number);
    return {
      desde: fechaISO(anio, mes, 1),
      hasta: fechaISO(anio, mes, diasDelMes(anio, mes)),
    };
  }
  return null;
}

/**
 * Primera clave de tipos_material cuyo sinónimo aparece como palabra
 * completa. El orden del JSON decide si dos sinónimos pudieran solaparse.
 *
 * @param {string} norm
 * @returns {string | null}
 */
function extraerTipo(norm) {
  for (const [clave, sinonimos] of Object.entries(base.tipos_material)) {
    const encontrado = sinonimos.some((sinonimo) => {
      const limpio = normalizar(sinonimo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${limpio}\\b`).test(norm);
    });
    if (encontrado) {
      return clave;
    }
  }
  return null;
}

/**
 * Texto entre comillas del mensaje original. Si no hay, null.
 *
 * @param {string} original
 * @returns {string | null}
 */
function extraerEntreComillas(original) {
  const patrones = [/«([^»]*)»/, /"([^"]*)"/, /“([^”]*)”/];
  let elegido = null;
  patrones.forEach((patron) => {
    const coincidencia = patron.exec(original);
    if (!coincidencia) {
      return;
    }
    if (elegido === null || coincidencia.index < elegido.indice) {
      elegido = { indice: coincidencia.index, texto: coincidencia[1].trim() };
    }
  });
  if (!elegido || !elegido.texto) {
    return null;
  }
  return elegido.texto;
}

/**
 * Lo que sigue a «dijeron que», «dijo que» o sus variantes de mención.
 *
 * @param {string} norm
 * @returns {string | null}
 */
function extraerTrasMarca(norm) {
  let mejorIndice = -1;
  let marcaElegida = null;
  MARCAS_FRASE.forEach((marca) => {
    const indice = norm.indexOf(marca);
    if (indice !== -1 && (mejorIndice === -1 || indice < mejorIndice)) {
      mejorIndice = indice;
      marcaElegida = marca;
    }
  });
  if (!marcaElegida) {
    return null;
  }
  const resto = norm.slice(mejorIndice + marcaElegida.length).trim();
  return resto || null;
}

/**
 * Raíces de una frase, sin las palabras vacías propias de las citas.
 * Esas vacías son menos que las de búsqueda: en una cita, «no» y «que»
 * no aportan y hincharían el umbral de coincidencia.
 *
 * @param {string | null} frase
 * @returns {string[]}
 */
function terminosDeFrase(frase) {
  if (!frase) {
    return [];
  }
  return tokenizar(normalizar(frase))
    .filter((token) => !VACIAS_FRASE.has(token))
    .map(raiz);
}

/**
 * Extrae los datos estructurados de un mensaje.
 *
 * @param {string} texto
 * @returns {{
 *   id: string | null,
 *   tiempo: string | null,
 *   tipo: string | null,
 *   rango: { desde: string, hasta: string } | null,
 *   anio: string | null,
 *   palabras: string[],
 *   terminos: string[],
 *   frase: string | null,
 *   terminosFrase: string[]
 * }}
 */
export function extraerDatos(texto) {
  const original = String(texto ?? '');
  const norm = normalizar(original);

  const coincidenciaId = norm.match(/\b([a-z]{2,3})-?(\d{4,6})\b/);
  const id = coincidenciaId
    ? `${coincidenciaId[1]}${coincidenciaId[2]}`.toUpperCase()
    : null;

  // Dos grupos (21:48) son minutos y segundos. Tres grupos son hh:mm:ss.
  const coincidenciaTiempo = norm.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  let tiempo = null;
  if (coincidenciaTiempo) {
    const dosDigitos = (valor) => String(Number(valor)).padStart(2, '0');
    if (coincidenciaTiempo[3] !== undefined) {
      tiempo = `${dosDigitos(coincidenciaTiempo[1])}:${dosDigitos(coincidenciaTiempo[2])}:${dosDigitos(coincidenciaTiempo[3])}`;
    } else {
      tiempo = `00:${dosDigitos(coincidenciaTiempo[1])}:${dosDigitos(coincidenciaTiempo[2])}`;
    }
  }

  const tipo = extraerTipo(norm);
  const rango = extraerRango(norm, base.referencia.fechaReferencia);

  // Un ID tipo NT20045 también contiene dígitos. El año solo se lee
  // cuando no hay ID, para no confundir el número de ficha con un año.
  let anio = null;
  if (!id) {
    const coincidenciaAnio = norm.match(/\b(19\d{2}|20\d{2})\b/);
    anio = coincidenciaAnio ? coincidenciaAnio[1] : null;
  }

  const palabras = tokenizar(norm).filter((token) => {
    if (VACIAS_BUSQUEDA.has(token)) {
      return false;
    }
    if (/^\d+$/.test(token)) {
      return false;
    }
    if (/^[a-z]{2,3}\d{4,6}$/.test(token)) {
      return false;
    }
    return true;
  });

  const frase = extraerEntreComillas(original) || extraerTrasMarca(norm);

  return {
    id,
    tiempo,
    tipo,
    rango,
    anio,
    palabras,
    terminos: palabras.map(raiz),
    frase,
    terminosFrase: terminosDeFrase(frase),
  };
}
