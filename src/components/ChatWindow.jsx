/**
 * Ventana de la conversación.
 *
 * Qué hace: junta la lista, las sugerencias y el campo de texto.
 * Recibe: el estado y las acciones del hook.
 * Devuelve: la columna del chat.
 * Se relaciona con MessageList, QuickReplies, MessageInput y useChatbot.
 */

import AdjuntarImagen from './AdjuntarImagen';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import QuickReplies from './QuickReplies';

/**
 * @param {{
 *   mensajes: { rol: string, texto: string }[],
 *   escribiendo: boolean,
 *   onEnviar: (texto: string, imagen: object | null) => void,
 *   muestras: { id: string, archivo: string }[],
 *   imagenElegida: { id: string, archivo: string } | null,
 *   onElegirImagen: (muestra: object | null) => void
 * }} props
 */
export default function ChatWindow({
  mensajes,
  escribiendo,
  onEnviar,
  muestras,
  imagenElegida,
  onElegirImagen,
}) {
  return (
    <section className="chat" aria-label="Conversación con el asistente">
      <MessageList mensajes={mensajes} escribiendo={escribiendo} />
      <QuickReplies onElegir={(texto) => onEnviar(texto, null)} deshabilitado={escribiendo} />
      <AdjuntarImagen
        muestras={muestras}
        elegida={imagenElegida}
        deshabilitado={escribiendo}
        onElegir={onElegirImagen}
      />
      <MessageInput
        onEnviar={(texto) => onEnviar(texto, imagenElegida)}
        deshabilitado={escribiendo}
        hayImagen={Boolean(imagenElegida)}
      />
    </section>
  );
}
