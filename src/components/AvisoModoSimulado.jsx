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
export default function AvisoModoSimulado() {
  return (
    <p className="aviso" role="status">
      Modo simulado: no hay ningún modelo de lenguaje cargado. Catálogo de demostración con datos ficticios.
    </p>
  );
}
