/**
 * Sugerencias de consulta.
 *
 * Qué hace: muestra botones que envían un texto ya escrito.
 * Recibe: onElegir y si hay que desactivarlos mientras se responde.
 * Devuelve: el grupo de botones.
 * Se relaciona con ChatWindow.jsx. Los textos son los del enunciado,
 * sin las comillas angulares que solo los citan.
 */

const SUGERENCIAS = [
  '¿Qué es el material NT20045?',
  '¿De qué trata el NT20045?',
  '¿Aparece alguna persona en el NT20045?',
  'Busca materiales sobre inundaciones',
  'Entrevistas ingresadas esta semana',
  '¿Cómo puedo buscar en el acervo?',
];

/**
 * @param {{ onElegir: (texto: string) => void, deshabilitado: boolean }} props
 * @returns {import('react').JSX.Element}
 */
export default function QuickReplies({ onElegir, deshabilitado }) {
  return (
    <div className="sugerencias" role="group" aria-label="Sugerencias de búsqueda">
      {SUGERENCIAS.map((texto) => (
        <button
          key={texto}
          type="button"
          disabled={deshabilitado}
          onClick={() => onElegir(texto)}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}
