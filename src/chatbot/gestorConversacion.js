/**
 * Memoria de la conversación.
 *
 * Qué hace: guarda el último material, los fallos seguidos y los turnos
 * recientes. No escribe en localStorage: al recargar la página se pierde.
 * Recibe: cada turno ya respondido, o la orden de reiniciar.
 * Devuelve: el estado que el orquestador necesita para el contexto.
 * Se relaciona con chatbot.js. El modelo solo ve una copia del historial
 * dentro del paquete, no este objeto.
 */

const TURNOS_EN_HISTORIAL = 4;

export class GestorConversacion {
  constructor() {
    this.reiniciar();
  }

  /**
   * Vuelve al estado inicial: sin material, sin fallos y sin turnos.
   *
   * @returns {void}
   */
  reiniciar() {
    this.ultimoMaterial = null;
    this.fallosSeguidos = 0;
    this.turnos = 0;
    this.historial = [];
    this.diagnostico = null;
  }

  /**
   * Añade un turno y se queda solo con los cuatro últimos.
   * El modelo real recibiría esa ventana, no la charla completa.
   *
   * @param {{ mensaje: string, respuesta: string }} turno
   * @returns {void}
   */
  registrarTurno(turno) {
    this.historial.push(turno);
    if (this.historial.length > TURNOS_EN_HISTORIAL) {
      this.historial = this.historial.slice(-TURNOS_EN_HISTORIAL);
    }
  }
}
