/**
 * Utilidades de texto, timecode y calendario.
 *
 * Qué hace: normaliza español, obtiene raíces, mide distancia de edición
 * y convierte tiempos y fechas sin consultar el reloj del sistema.
 * Recibe: cadenas, timecodes «HH:MM:SS» o fechas «YYYY-MM-DD».
 * Devuelve: textos normalizados, listas de raíces, distancias y fechas ISO.
 * Se relaciona con extraccionDatos.js, recuperacion.js, modeloSimulado.js
 * y las pruebas (la comparación de fragmentos también se normaliza).
 */

import { newStemmer } from 'snowball-stemmers';

// Equivalente al SnowballStemmer('spanish') de NLTK. El paquete no tiene
// export default usable: newStemmer es una exportación con nombre.
const stemmer = newStemmer('spanish');

// La misma palabra se raíz muchas veces (reglas, catálogo y mensaje).
// La caché evita repetir el stemmer.
const cacheRaices = new Map();

/**
 * Pasa el texto a minúsculas y le quita acentos. La ñ queda como n
 * porque NFD la separa en «n» más una marca diacrítica.
 *
 * @param {string} texto
 * @returns {string}
 */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Parte un texto ya normalizado en tokens de letras y dígitos.
 *
 * @param {string} textoNormalizado
 * @returns {string[]}
 */
export function tokenizar(textoNormalizado) {
  return textoNormalizado.match(/[a-z0-9]+/g) || [];
}

/**
 * Devuelve la raíz española de una palabra, reutilizando la caché.
 *
 * @param {string} palabra
 * @returns {string}
 */
export function raiz(palabra) {
  if (cacheRaices.has(palabra)) {
    return cacheRaices.get(palabra);
  }
  const resultado = stemmer.stem(palabra);
  cacheRaices.set(palabra, resultado);
  return resultado;
}

/**
 * Normaliza, tokeniza y convierte cada token en su raíz.
 *
 * @param {string} texto
 * @returns {string[]}
 */
export function raices(texto) {
  return tokenizar(normalizar(texto)).map(raiz);
}

/**
 * Distancia de Levenshtein. Cada inserción, borrado o sustitución cuesta 1.
 * Sirve para tolerar un error de tecleo en frases de una sola raíz.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function distanciaEdicion(a, b) {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const tabla = Array.from({ length: filas }, () => new Array(columnas).fill(0));

  for (let i = 0; i < filas; i += 1) {
    tabla[i][0] = i;
  }
  for (let j = 0; j < columnas; j += 1) {
    tabla[0][j] = j;
  }

  for (let i = 1; i < filas; i += 1) {
    for (let j = 1; j < columnas; j += 1) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      tabla[i][j] = Math.min(
        tabla[i - 1][j] + 1,
        tabla[i][j - 1] + 1,
        tabla[i - 1][j - 1] + costo,
      );
    }
  }

  return tabla[a.length][b.length];
}

/**
 * Convierte un timecode «HH:MM:SS» a segundos.
 *
 * @param {string} timecode
 * @returns {number}
 */
export function tcASegundos(timecode) {
  const [horas, minutos, segundos] = timecode.split(':').map(Number);
  return horas * 3600 + minutos * 60 + segundos;
}

/**
 * Convierte segundos a «HH:MM:SS», siempre con dos dígitos por componente.
 *
 * @param {number} totalSegundos
 * @returns {string}
 */
export function segundosATc(totalSegundos) {
  const total = Math.max(0, Math.floor(totalSegundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const dosDigitos = (valor) => String(valor).padStart(2, '0');
  return `${dosDigitos(horas)}:${dosDigitos(minutos)}:${dosDigitos(segundos)}`;
}

/**
 * Día de la semana de una fecha civil. 0 es domingo.
 * Usa el método de Sakamoto y no llama a new Date(): los rangos tienen
 * que salir siempre de fechaReferencia, no del reloj del equipo.
 *
 * @param {number} anio
 * @param {number} mes Mes de 1 a 12.
 * @param {number} dia
 * @returns {number}
 */
export function diaSemanaUTC(anio, mes, dia) {
  const desplazamientos = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let anioAjustado = anio;
  if (mes < 3) {
    anioAjustado -= 1;
  }
  return (
    anioAjustado
    + Math.floor(anioAjustado / 4)
    - Math.floor(anioAjustado / 100)
    + Math.floor(anioAjustado / 400)
    + desplazamientos[mes - 1]
    + dia
  ) % 7;
}

/**
 * Cuántos días tiene un mes. Febrero respeta los bisiestos.
 *
 * @param {number} anio
 * @param {number} mes
 * @returns {number}
 */
export function diasDelMes(anio, mes) {
  if (mes === 2) {
    const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
    return bisiesto ? 29 : 28;
  }
  return [1, 3, 5, 7, 8, 10, 12].includes(mes) ? 31 : 30;
}

/**
 * Formatea año, mes y día como «YYYY-MM-DD».
 *
 * @param {number} anio
 * @param {number} mes
 * @param {number} dia
 * @returns {string}
 */
export function fechaISO(anio, mes, dia) {
  const dosDigitos = (valor) => String(valor).padStart(2, '0');
  return `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
}

/**
 * Suma días civiles a una fecha ISO. delta puede ser negativo.
 * No usa el reloj: solo mueve año, mes y día.
 *
 * @param {string} iso
 * @param {number} delta
 * @returns {string}
 */
export function sumarDiasISO(iso, delta) {
  const partes = iso.split('-').map(Number);
  let anio = partes[0];
  let mes = partes[1];
  let dia = partes[2] + delta;

  while (dia > diasDelMes(anio, mes)) {
    dia -= diasDelMes(anio, mes);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }

  while (dia < 1) {
    mes -= 1;
    if (mes < 1) {
      mes = 12;
      anio -= 1;
    }
    dia += diasDelMes(anio, mes);
  }

  return fechaISO(anio, mes, dia);
}
