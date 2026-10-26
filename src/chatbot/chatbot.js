/**
 * Orquestador del flujo de consulta.
 *
 * Qué hace: por cada mensaje extrae datos, recupera registros, pide la
 * respuesta al modelo configurado, valida las citas y, si hace falta,
 * sustituye el texto por el de respaldo.
 * Recibe: el mensaje del usuario.
 * Devuelve: el texto que se muestra en el chat, y deja el diagnóstico
 * del último turno en la propiedad diagnostico.
 * Se relaciona con extraccionDatos.js, recuperacion.js, modeloSimulado.js,
 * adaptadorLMStudio.js, validacion.js, gestorConversacion.js y config.js.
 * Con MODO_MODELO en «simulado» no hay red ni IA.
 */

import { CONFIG } from '../config';
import base from '../data/baseConocimiento.json';
import { AdaptadorLMStudio } from './adaptadorLMStudio';
import { extraerDatos } from './extraccionDatos';
import { GestorConversacion } from './gestorConversacion';
import { ModeloSimulado } from './modeloSimulado';
import { recuperar } from './recuperacion';
import { validarRespuesta } from './validacion';

/**
 * El panel solo necesita saber qué fichas entraron en cada criterio.
 *
 * @param {object} registros
 * @returns {object}
 */
function registrosComoIds(registros) {
  return {
    porId: registros.porId,
    porContexto: registros.porContexto,
    porTerminos: registros.porTerminos.map((item) => item.id),
    porFrase: registros.porFrase.map((item) => item.id),
    porFiltro: [...registros.porFiltro],
    relacionados: registros.relacionados.map((item) => item.id),
  };
}

export class Chatbot {
  constructor() {
    this.gestor = new GestorConversacion();
    this.modeloSimulado = new ModeloSimulado();
    this.adaptador = new AdaptadorLMStudio();
    this.diagnostico = null;
  }

  /**
   * Borra material, fallos, historial, diagnóstico y la rotación de cortesía.
   *
   * @returns {void}
   */
  reiniciar() {
    this.gestor.reiniciar();
    this.modeloSimulado.reiniciarContadores();
    this.diagnostico = null;
  }

  /**
   * Responde un mensaje siguiendo el flujo completo.
   *
   * @param {string} mensaje
   * @returns {Promise<string>}
   */
  async responder(mensaje) {
    this.gestor.turnos += 1;
    const datos = extraerDatos(mensaje);
    const registros = recuperar(datos, this.gestor.ultimoMaterial);

    const paquete = {
      mensaje,
      historial: this.gestor.historial.map((turno) => ({ ...turno })),
      datos,
      registros,
      instrucciones: base.instrucciones_modelo,
      catalogo: base.catalogo_demo,
      estados: base.estados,
      plantillas: base.plantillas,
      // Cortesía y la lista de intenciones no están en las plantillas.
      // El modelo, simulado o real, las recibe en el paquete.
      intenciones: base.intenciones,
    };

    let salida;
    let modelo = 'simulado';
    let aviso = null;

    if (CONFIG.MODO_MODELO === 'lmstudio') {
      try {
        salida = await this.adaptador.generar(paquete);
        modelo = 'lmstudio';
      } catch (error) {
        salida = await this.modeloSimulado.generar(paquete);
        modelo = 'simulado';
        aviso = `LM Studio no respondió (${error.message}). Se usó el modelo simulado, que no es IA.`;
      }
    } else {
      salida = await this.modeloSimulado.generar(paquete);
    }

    if (salida.materialUsado) {
      this.gestor.ultimoMaterial = salida.materialUsado;
    }

    // Sin intención, o con un ID o un tiempo que no existe, no se muestra
    // lo que redactó el modelo: se usa el respaldo.
    const valida = salida.intencion !== null
      && validarRespuesta(salida.respuesta, datos, base.catalogo_demo);

    let respuesta;
    let intencion;
    if (valida) {
      this.gestor.fallosSeguidos = 0;
      respuesta = salida.respuesta;
      if (salida.saludo && salida.intencion !== 'cortesia') {
        respuesta = `¡Hola! ${respuesta}`;
      }
      intencion = salida.intencion;
    } else {
      this.gestor.fallosSeguidos += 1;
      const textos = base.respaldo.respuestas;
      if (this.gestor.fallosSeguidos >= 2) {
        respuesta = base.respaldo.repetido;
      } else {
        respuesta = textos[(this.gestor.turnos - 1) % textos.length];
      }
      intencion = 'respaldo';
    }

    this.gestor.registrarTurno({ mensaje, respuesta });
    this.diagnostico = {
      intencion,
      puntajes: salida.puntajes,
      id: datos.id,
      datos,
      registros: registrosComoIds(registros),
      validacion: valida,
      modelo,
      aviso,
    };
    this.gestor.diagnostico = this.diagnostico;
    return respuesta;
  }
}
