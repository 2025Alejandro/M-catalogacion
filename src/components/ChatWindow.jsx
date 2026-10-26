/**
 * Ventana de la conversación.
 *
 * Qué hace: junta la lista, las sugerencias y el campo de texto.
 * Recibe: el estado y las acciones del hook.
 * Devuelve: la columna del chat.
 * Se relaciona con MessageList, QuickReplies, MessageInput y useChatbot.
 */

import MessageInput from './MessageInput';
import MessageList from './MessageList';
import QuickReplies from './QuickReplies';

/**
 * @param {{
 *   mensajes: { rol: string, texto: string }[],
 *   escribiendo: boolean,
 *   onEnviar: (texto: string) => void
 * }} props
 * @returns {import('react').JSX.Element}
 */
export default function ChatWindow({ mensajes, escribiendo, onEnviar }) {
  return (
    <section className="chat" aria-label="Conversación con el asistente">
      <MessageList mensajes={mensajes} escribiendo={escribiendo} />
      <QuickReplies onElegir={onEnviar} deshabilitado={escribiendo} />
      <MessageInput onEnviar={onEnviar} deshabilitado={escribiendo} />
    </section>
  );
}
