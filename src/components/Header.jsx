/**
 * Encabezado de la maqueta.
 *
 * Qué hace: muestra el nombre del asistente y el botón de reinicio.
 * Recibe: onReiniciar, que vacía la conversación.
 * Devuelve: el encabezado.
 * Se relaciona con useChatbot.js.
 */

/**
 * @param {{ onReiniciar: () => void }} props
 * @returns {import('react').JSX.Element}
 */
export default function Header({ onReiniciar }) {
  return (
    <header className="encabezado">
      <div>
        <p className="encabezado-sobre">Acervo histórico de noticias</p>
        <h1>Asistente de catalogación</h1>
      </div>
      <button type="button" className="boton-secundario" onClick={onReiniciar}>
        Reiniciar conversación
      </button>
    </header>
  );
}
