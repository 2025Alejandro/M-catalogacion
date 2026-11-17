/**
 * Aviso permanente de modo simulado.
 *
 * Qué hace: recuerda que no hay un modelo de lenguaje cargado y que el
 * catálogo es ficticio.
 * Recibe: nada.
 * Devuelve: el banner fijo.
 * Se relaciona con App.js. No debe leerse como si el simulador fuera IA.
 */

/**
 * Banner fijo. El texto no presenta el simulador como un modelo real.
 *
 * @returns {import('react').JSX.Element}
 */
export default function AvisoModoSimulado({ modoVisual }) {
  const lineaVisual = modoVisual === 'real'
    ? 'Clasificador visual: predicciones del modelo entrenado'
    : 'Clasificador visual: SIMULADO (aún no hay modelo entrenado)';
  return (
    <div className="aviso" role="status">
      <p>Modo simulado: no hay ningún modelo de lenguaje cargado. Catálogo de demostración con datos ficticios.</p>
      <p>{lineaVisual}</p>
    </div>
  );
}
