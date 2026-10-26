/**
 * Validación de lo que el modelo afirma.
 *
 * Qué hace: comprueba que cada ID y cada timecode citado existan en el
 * catálogo, o que el propio mensaje del usuario los haya aportado.
 * Recibe: el texto de la respuesta, los datos extraídos y el catálogo.
 * Devuelve: true solo si no hay citas inventadas.
 * Se relaciona con chatbot.js. Si falla, el orquestador descarta la
 * respuesta y usa el texto de respaldo.
 */

/**
 * IDs con forma de ficha (dos o tres letras y de cuatro a seis dígitos).
 *
 * @param {string} respuesta
 * @returns {string[]}
 */
function idsCitados(respuesta) {
  return respuesta.match(/\b[A-Z]{2,3}\d{4,6}\b/g) || [];
}

/**
 * Timecodes con reloj completo. Las horas sueltas no cuentan.
 *
 * @param {string} respuesta
 * @returns {string[]}
 */
function timecodesCitados(respuesta) {
  return respuesta.match(/\b\d{2}:\d{2}:\d{2}\b/g) || [];
}

/**
 * Reúne los timecodes que sí se pueden citar: fragmentos, rótulos de
 * persona, la duración de la ficha y el tiempo que pidió el usuario.
 *
 * @param {object} catalogo
 * @param {object} datos
 * @returns {Set<string>}
 */
function timecodesPermitidos(catalogo, datos) {
  const permitidos = new Set();
  if (datos.tiempo) {
    permitidos.add(datos.tiempo);
  }
  Object.values(catalogo).forEach((registro) => {
    if (registro.duracion) {
      permitidos.add(registro.duracion);
    }
    (registro.fragmentos || []).forEach((fragmento) => {
      permitidos.add(fragmento.tc);
    });
    (registro.personas || []).forEach((persona) => {
      if (persona.tc) {
        permitidos.add(persona.tc);
      }
    });
  });
  return permitidos;
}

/**
 * Acepta la respuesta solo si no inventa fichas ni tiempos.
 *
 * @param {string} respuesta
 * @param {object} datos
 * @param {object} catalogo
 * @returns {boolean}
 */
export function validarRespuesta(respuesta, datos, catalogo) {
  const ids = idsCitados(respuesta);
  const idsValidos = ids.every((id) => catalogo[id] || id === datos.id);
  if (!idsValidos) {
    return false;
  }

  const permitidos = timecodesPermitidos(catalogo, datos);
  return timecodesCitados(respuesta).every((timecode) => permitidos.has(timecode));
}
