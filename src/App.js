/**
 * Composición de la maqueta.
 *
 * Qué hace: coloca el aviso de modo simulado, el encabezado, el chat y
 * el panel del último flujo.
 * Recibe: nada por props; el estado vive en useChatbot.
 * Devuelve: la página completa.
 * Se relaciona con los componentes de src/components y con App.css.
 */

import './App.css';
import AvisoModoSimulado from './components/AvisoModoSimulado';
import ChatWindow from './components/ChatWindow';
import Header from './components/Header';
import PanelFlujo from './components/PanelFlujo';
import { useChatbot } from './hooks/useChatbot';

/**
 * Página del asistente en modo simulado.
 *
 * @returns {import('react').JSX.Element}
 */
export default function App() {
  const {
    mensajes,
    escribiendo,
    diagnostico,
    enviar,
    reiniciar,
  } = useChatbot();

  return (
    <div className="aplicacion">
      <AvisoModoSimulado />
      <Header onReiniciar={reiniciar} />
      <main className="cuerpo">
        <ChatWindow
          mensajes={mensajes}
          escribiendo={escribiendo}
          onEnviar={enviar}
        />
        <PanelFlujo diagnostico={diagnostico} />
      </main>
    </div>
  );
}
