/**
 * Panel «Cómo respondió».
 *
 * Qué hace: muestra, plegado, los pasos de la última consulta.
 * Recibe: el diagnóstico que deja chatbot.responder.
 * Devuelve: un details con datos, IDs, puntajes, validación y modelo.
 * Se relaciona con useChatbot.js. Si aún no hay consulta, lo dice.
 */

/**
 * Texto corto para un dato que puede venir vacío.
 *
 * @param {unknown} valor
 * @returns {string}
 */
function mostrar(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return '—';
  }
  if (Array.isArray(valor)) {
    return valor.length > 0 ? valor.join(', ') : '—';
  }
  if (typeof valor === 'object') {
    if (valor.desde && valor.hasta) {
      return `${valor.desde} → ${valor.hasta}`;
    }
    return JSON.stringify(valor);
  }
  return String(valor);
}

/**
 * Los tres puntajes mayores, ya vengan como lista o como objeto vacío
 * del adaptador.
 *
 * @param {unknown} puntajes
 * @returns {string}
 */
function mostrarPuntajes(puntajes) {
  if (Array.isArray(puntajes)) {
    if (puntajes.length === 0) {
      return '—';
    }
    return puntajes.map((item) => `${item.intencion}: ${item.puntaje}`).join(' · ');
  }
  if (puntajes && typeof puntajes === 'object' && Object.keys(puntajes).length > 0) {
    return JSON.stringify(puntajes);
  }
  return '—';
}

/**
 * IDs recuperados, un criterio por línea.
 *
 * @param {object | undefined} registros
 * @returns {string}
 */
function mostrarRegistros(registros) {
  if (!registros) {
    return '—';
  }
  const lineas = [
    `por ID: ${mostrar(registros.porId)}`,
    `por contexto: ${mostrar(registros.porContexto)}`,
    `por términos: ${mostrar(registros.porTerminos)}`,
    `por frase: ${mostrar(registros.porFrase)}`,
    `por filtro: ${mostrar(registros.porFiltro)}`,
    `relacionados: ${mostrar(registros.relacionados)}`,
  ];
  return lineas.join('\n');
}

/**
 * @param {{ diagnostico: object | null }} props
 * @returns {import('react').JSX.Element}
 */
export default function PanelFlujo({ diagnostico }) {
  const datos = diagnostico?.datos;

  return (
    <details className="panel">
      <summary>Cómo respondió</summary>
      {!diagnostico && (
        <p className="panel-vacio">Todavía no hay una consulta en esta conversación.</p>
      )}
      {diagnostico && (
        <dl className="panel-lista">
          <dt>Datos extraídos</dt>
          <dd>
            {`ID: ${mostrar(datos.id)}\nTimecode: ${mostrar(datos.tiempo)}\nTipo: ${mostrar(datos.tipo)}\nRango: ${mostrar(datos.rango)}\nAño: ${mostrar(datos.anio)}\nTérminos: ${mostrar(datos.terminos)}\nFrase: ${mostrar(datos.frase)}`}
          </dd>
          <dt>Registros recuperados</dt>
          <dd>{mostrarRegistros(diagnostico.registros)}</dd>
          <dt>Intención</dt>
          <dd>{diagnostico.intencion}</dd>
          <dt>Tres mayores puntajes</dt>
          <dd>{mostrarPuntajes(diagnostico.puntajes)}</dd>
          <dt>Validación</dt>
          <dd>{diagnostico.validacion ? 'aceptada' : 'rechazada'}</dd>
          <dt>Modelo usado</dt>
          <dd>{diagnostico.modelo}</dd>
          {diagnostico.aviso && (
            <>
              <dt>Aviso</dt>
              <dd>{diagnostico.aviso}</dd>
            </>
          )}
        </dl>
      )}
    </details>
  );
}
