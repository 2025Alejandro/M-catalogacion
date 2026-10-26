/**
 * Modelo simulado: reemplazo determinista del modelo de lenguaje.
 *
 * No usa IA. No llama a la red. No adivina fuera de las plantillas.
 * Un modelo real (LM Studio o Hermes) recibiría el mismo paquete, detectaría
 * la intención y redactaría la respuesta. Aquí esas dos tareas se hacen con
 * reglas fijas: puntajes de frases y textos del JSON. Si el mensaje no está
 * cubierto, la intención queda en null y el orquestador usa el respaldo.
 *
 * Qué hace: elige una intención y rellena una plantilla con el catálogo.
 * Recibe: el paquete armado por chatbot.js.
 * Devuelve: { intencion, respuesta, puntajes, saludo, materialUsado }.
 * Se relaciona con textoUtils.js. No importa el JSON por su cuenta: solo
 * lee lo que viene en el paquete.
 */

import { distanciaEdicion, raices, tcASegundos } from './textoUtils';

// Una frase fuerte pesa el triple que una clave, y el peso se multiplica
// por la cantidad de raíces: una expresión larga es más específica.
const PESO_FUERTE = 3;
const PESO_CLAVE = 1;

// Por debajo de 2 no hay intención. Una clave suelta (peso 1) no basta;
// hace falta una frase fuerte o dos claves.
const UMBRAL_INTENCION = 2;

// Si el mensaje ya trae un ID, buscar la ficha es más probable que una
// búsqueda abierta. El bono no alcanza, por sí solo, para ganar: 2 empata
// el umbral y otra intención con frase fuerte lo supera.
const BONO_ID = 2;

// Un timecode es una señal muy concreta. 4 supera a una clave y empata
// con una frase fuerte corta, de modo que «en el minuto 21:48» no se
// confunda con una transcripción general.
const BONO_TIMECODE = 4;

const INTENCIONES_DE_MATERIAL = new Set([
  'buscar_por_id',
  'resumen_material',
  'personas_en_material',
  'lugares_y_elementos_visuales',
  'transcripcion_material',
  'fragmento_por_timecode',
  'material_relacionado',
  'disponibilidad_validacion',
]);

/**
 * Sustituye {campos} de una plantilla. Lo que no venga se deja vacío.
 *
 * @param {string} plantilla
 * @param {object} campos
 * @returns {string}
 */
function rellenar(plantilla, campos) {
  return plantilla.replace(/\{([a-zA-Z0-9_]+)\}/g, (_coincidencia, clave) => {
    const valor = campos[clave];
    if (valor === undefined || valor === null) {
      return '';
    }
    return String(valor);
  });
}

/**
 * La plantilla pide {estado} legible («Completado»), no la clave interna.
 *
 * @param {object} estados
 * @param {string} clave
 * @returns {string}
 */
function etiquetaEstado(estados, clave) {
  return estados[clave] ? estados[clave].etiqueta : clave;
}

/**
 * Solo estos dos estados tienen resumen, personas o imagen ya revisables.
 *
 * @param {object} registro
 * @returns {boolean}
 */
function estaProcesado(registro) {
  return registro.estado === 'completado' || registro.estado === 'pendiente_revision';
}

/**
 * Compila frases a un mapa raíz → peso. Si la misma tupla está en fuertes
 * y en claves, se queda el peso mayor: no se suman dos veces.
 *
 * @param {{ fuertes?: string[], claves?: string[] }} definicion
 * @returns {Map<string, { raices: string[], peso: number }>}
 */
function compilarReglas(definicion) {
  const mapa = new Map();

  const agregar = (frases, pesoUnitario) => {
    (frases || []).forEach((frase) => {
      const lista = raices(frase);
      if (lista.length === 0) {
        return;
      }
      const clave = JSON.stringify(lista);
      const peso = pesoUnitario * lista.length;
      const previo = mapa.get(clave);
      if (!previo || peso > previo.peso) {
        mapa.set(clave, { raices: lista, peso });
      }
    });
  };

  agregar(definicion.claves, PESO_CLAVE);
  agregar(definicion.fuertes, PESO_FUERTE);
  return mapa;
}

/**
 * Una raíz coincide por igualdad o, si ambas tienen 6 caracteres o más,
 * por un solo error de tecleo. Varias raíces tienen que salir juntas y
 * en el mismo orden: así «que es el material» no se arma con palabras sueltas.
 *
 * @param {string[]} raicesFrase
 * @param {string[]} tokens
 * @returns {boolean}
 */
function fraseCoincide(raicesFrase, tokens) {
  if (raicesFrase.length === 1) {
    const buscada = raicesFrase[0];
    return tokens.some((token) => {
      if (token === buscada) {
        return true;
      }
      return token.length >= 6
        && buscada.length >= 6
        && distanciaEdicion(token, buscada) <= 1;
    });
  }

  const tope = tokens.length - raicesFrase.length;
  for (let inicio = 0; inicio <= tope; inicio += 1) {
    let iguales = true;
    for (let desplazamiento = 0; desplazamiento < raicesFrase.length; desplazamiento += 1) {
      if (tokens[inicio + desplazamiento] !== raicesFrase[desplazamiento]) {
        iguales = false;
        break;
      }
    }
    if (iguales) {
      return true;
    }
  }
  return false;
}

/**
 * Suma el peso de cada frase compilada que aparece en el mensaje.
 *
 * @param {Map<string, { raices: string[], peso: number }>} mapa
 * @param {string[]} tokens
 * @returns {number}
 */
function sumarPuntaje(mapa, tokens) {
  let total = 0;
  mapa.forEach((regla) => {
    if (fraseCoincide(regla.raices, tokens)) {
      total += regla.peso;
    }
  });
  return total;
}

/**
 * Fragmento cuya marca de tiempo está más cerca de la pedida.
 * Si dos quedan a la misma distancia, gana el timecode menor.
 *
 * @param {{ tc: string, texto: string }[]} fragmentos
 * @param {string} tiempo
 * @returns {{ tc: string, texto: string }}
 */
function fragmentoMasCercano(fragmentos, tiempo) {
  const objetivo = tcASegundos(tiempo);
  let elegido = fragmentos[0];
  let mejorDiferencia = Math.abs(tcASegundos(elegido.tc) - objetivo);

  fragmentos.forEach((fragmento) => {
    const diferencia = Math.abs(tcASegundos(fragmento.tc) - objetivo);
    const empateMasTemprano = diferencia === mejorDiferencia && fragmento.tc < elegido.tc;
    if (diferencia < mejorDiferencia || empateMasTemprano) {
      mejorDiferencia = diferencia;
      elegido = fragmento;
    }
  });

  return elegido;
}

/**
 * Arma la frase « de tipo … ingresados del … del año …» solo con los
 * filtros que la extracción encontró. El espacio inicial lo pide la
 * plantilla, que no lo trae ella.
 *
 * @param {object} datos
 * @returns {string}
 */
function descripcionFiltro(datos) {
  let texto = '';
  if (datos.tipo) {
    texto += ` de tipo «${datos.tipo}»`;
  }
  if (datos.rango) {
    texto += ` ingresados del ${datos.rango.desde} al ${datos.rango.hasta}`;
  }
  if (datos.anio) {
    texto += ` del año ${datos.anio}`;
  }
  return texto;
}

/**
 * @param {string} id
 * @param {object} registro
 * @param {object} estados
 * @param {object} plantillas
 * @returns {string}
 */
function responderFicha(id, registro, estados, plantillas) {
  return rellenar(plantillas.ficha, {
    id,
    titulo: registro.titulo,
    tipo: registro.tipo,
    duracion: registro.duracion,
    ingreso: registro.ingreso,
    estado: etiquetaEstado(estados, registro.estado),
  });
}

/**
 * @param {string} id
 * @param {object} registro
 * @param {object} estados
 * @param {object} plantillas
 * @returns {string}
 */
function responderResumen(id, registro, estados, plantillas) {
  const estado = etiquetaEstado(estados, registro.estado);
  if (!registro.resumen) {
    return rellenar(plantillas.resumen_sin_datos, { id, estado });
  }
  return rellenar(plantillas.resumen, {
    id,
    titulo: registro.titulo,
    resumen: registro.resumen,
    etiquetas: (registro.etiquetas || []).join(', '),
  });
}

/**
 * @param {string} id
 * @param {object} registro
 * @param {object} estados
 * @param {object} plantillas
 * @returns {string}
 */
function responderPersonas(id, registro, estados, plantillas) {
  const estado = etiquetaEstado(estados, registro.estado);
  if (!estaProcesado(registro)) {
    return rellenar(plantillas.personas_sin_procesar, { id, estado });
  }
  if (registro.personas && registro.personas.length > 0) {
    const lineas = registro.personas
      .map((persona) => rellenar(plantillas.personas_linea, persona))
      .join('\n');
    return rellenar(plantillas.personas_con_datos, { id, lineas });
  }
  return rellenar(plantillas.personas_ninguna, {
    id,
    descripcion_personas: registro.descripcion_personas || '',
  }).trimEnd();
}

/**
 * @param {string} id
 * @param {object} registro
 * @param {object} estados
 * @param {object} plantillas
 * @returns {string}
 */
function responderLugares(id, registro, estados, plantillas) {
  const estado = etiquetaEstado(estados, registro.estado);
  if (!estaProcesado(registro)) {
    return rellenar(plantillas.lugares_sin_procesar, { id, estado });
  }
  return rellenar(plantillas.lugares_con_datos, {
    id,
    lugares: (registro.lugares || []).join(', '),
    elementos: (registro.elementos_visuales || []).join('; '),
  });
}

/**
 * @param {string} id
 * @param {object} registro
 * @param {object} estados
 * @param {object} plantillas
 * @returns {string}
 */
function responderTranscripcion(id, registro, estados, plantillas) {
  const estado = etiquetaEstado(estados, registro.estado);
  if (!registro.fragmentos || registro.fragmentos.length === 0) {
    return rellenar(plantillas.transcripcion_sin_datos, { id, estado });
  }
  const lineas = registro.fragmentos
    .map((fragmento) => rellenar(plantillas.fragmento_linea, fragmento))
    .join('\n');
  return rellenar(plantillas.transcripcion_con_datos, { id, lineas });
}

/**
 * @param {string} id
 * @param {object} registro
 * @param {object} datos
 * @param {object} estados
 * @param {object} plantillas
 * @returns {string}
 */
function responderTimecode(id, registro, datos, estados, plantillas) {
  if (!registro.fragmentos || registro.fragmentos.length === 0) {
    return rellenar(plantillas.transcripcion_sin_datos, {
      id,
      estado: etiquetaEstado(estados, registro.estado),
    });
  }
  if (!datos.tiempo) {
    return responderTranscripcion(id, registro, estados, plantillas);
  }
  const fragmento = fragmentoMasCercano(registro.fragmentos, datos.tiempo);
  return rellenar(plantillas.timecode_con_datos, {
    id,
    tiempo: datos.tiempo,
    tc: fragmento.tc,
    texto: fragmento.texto,
  });
}

/**
 * @param {string} id
 * @param {object} registros
 * @param {object} catalogo
 * @param {object} plantillas
 * @returns {string}
 */
function responderRelacionados(id, registros, catalogo, plantillas) {
  const lista = (registros.relacionados || []).slice(0, 3);
  if (lista.length === 0) {
    return rellenar(plantillas.relacionados_sin_datos, { id });
  }
  const lineas = lista.map((item) => rellenar(plantillas.relacionado_linea, {
    id: item.id,
    titulo: catalogo[item.id].titulo,
    comun: item.enComun.join(', '),
  })).join('\n');
  return rellenar(plantillas.relacionados_con_datos, { id, lineas });
}

/**
 * @param {string} id
 * @param {object} registro
 * @param {object} estados
 * @param {object} plantillas
 * @returns {string}
 */
function responderDisponibilidad(id, registro, estados, plantillas) {
  const estado = etiquetaEstado(estados, registro.estado);
  const campos = { id, estado };
  if (registro.estado === 'completado') {
    return rellenar(plantillas.disp_completado, campos);
  }
  if (registro.estado === 'pendiente_revision') {
    return rellenar(plantillas.disp_pendiente_revision, campos);
  }
  if (registro.estado === 'error') {
    return rellenar(plantillas.disp_error, {
      ...campos,
      detalle: registro.detalle_error || 'causa no especificada',
    });
  }
  return rellenar(plantillas.disp_en_proceso, campos);
}

/**
 * @param {string} id
 * @param {object} registro
 * @param {object} estados
 * @param {object} plantillas
 * @returns {string}
 */
function responderCorregir(id, registro, estados, plantillas) {
  const estado = etiquetaEstado(estados, registro.estado);
  if (registro.estado === 'pendiente_revision') {
    return rellenar(plantillas.corregir_pendiente_revision, { id, estado });
  }
  if (registro.estado === 'completado') {
    return rellenar(plantillas.corregir_aprobado, { id, estado });
  }
  return rellenar(plantillas.corregir_otro_estado, { id, estado });
}

/**
 * @param {object} datos
 * @param {object} registros
 * @param {object} catalogo
 * @param {object} estados
 * @param {object} plantillas
 * @returns {string}
 */
function responderTema(datos, registros, catalogo, estados, plantillas) {
  if (!datos.terminos || datos.terminos.length === 0) {
    return plantillas.tema_sin_terminos;
  }
  if (!registros.porTerminos || registros.porTerminos.length === 0) {
    return rellenar(plantillas.tema_sin_resultados, {
      terminos: datos.palabras.join(' '),
    });
  }

  const elegidos = registros.porTerminos.slice(0, 3);
  const lineas = [
    rellenar(plantillas.resultados_encabezado, {
      n: Math.min(registros.porTerminos.length, 3),
    }),
  ];

  elegidos.forEach((item) => {
    const registro = catalogo[item.id];
    lineas.push(rellenar(plantillas.resultado_linea, {
      id: item.id,
      titulo: registro.titulo,
      estado: etiquetaEstado(estados, registro.estado),
    }));
    if (item.mejorFragmento) {
      lineas.push(rellenar(plantillas.resultado_fragmento, item.mejorFragmento));
    } else if (!registro.fragmentos || registro.fragmentos.length === 0) {
      lineas.push(plantillas.resultado_sin_transcripcion);
    }
  });

  return lineas.join('\n');
}

/**
 * @param {object} datos
 * @param {object} registros
 * @param {object} catalogo
 * @param {object} plantillas
 * @returns {string}
 */
function responderFrase(datos, registros, catalogo, plantillas) {
  if (!datos.terminosFrase || datos.terminosFrase.length === 0) {
    return plantillas.frase_sin_datos;
  }
  if (!registros.porFrase || registros.porFrase.length === 0) {
    return plantillas.frase_sin_resultados;
  }
  const lineas = registros.porFrase.slice(0, 3).map((item) => rellenar(plantillas.frase_linea, {
    id: item.id,
    titulo: catalogo[item.id].titulo,
    tc: item.fragmento.tc,
    texto: item.fragmento.texto,
  })).join('\n');
  return rellenar(plantillas.frase_con_resultados, { lineas });
}

/**
 * Una persona coincide solo si todas las raíces de la consulta están en
 * su nombre y su rol. No se identifica a nadie por el rostro.
 *
 * @param {object} datos
 * @param {object} catalogo
 * @param {object} plantillas
 * @returns {string}
 */
function responderPersona(datos, catalogo, plantillas) {
  const terminos = datos.terminos;
  if (!terminos || terminos.length === 0) {
    return plantillas.persona_sin_datos;
  }

  const apariciones = [];
  Object.entries(catalogo).forEach(([id, registro]) => {
    (registro.personas || []).forEach((persona) => {
      const bolsa = new Set(raices(`${persona.nombre} ${persona.rol}`));
      if (terminos.every((termino) => bolsa.has(termino))) {
        apariciones.push({
          id,
          titulo: registro.titulo,
          nombre: persona.nombre,
          tc: persona.tc,
          origen: persona.origen,
        });
      }
    });
  });

  if (apariciones.length === 0) {
    return rellenar(plantillas.persona_sin_resultados, {
      terminos: datos.palabras.join(' '),
    });
  }

  const lineas = apariciones
    .slice(0, 3)
    .map((item) => rellenar(plantillas.persona_linea, item))
    .join('\n');
  return rellenar(plantillas.persona_con_resultados, {
    nombre: apariciones[0].nombre,
    lineas,
  });
}

/**
 * @param {object} datos
 * @param {object} registros
 * @param {object} catalogo
 * @param {object} estados
 * @param {object} plantillas
 * @returns {string}
 */
function responderFiltro(datos, registros, catalogo, estados, plantillas) {
  if (!datos.tipo && !datos.rango && !datos.anio) {
    return plantillas.filtro_sin_datos;
  }
  const descripcionFiltroTexto = descripcionFiltro(datos);
  if (!registros.porFiltro || registros.porFiltro.length === 0) {
    return rellenar(plantillas.filtro_sin_resultados, {
      descripcion_filtro: descripcionFiltroTexto,
    });
  }

  const lineas = [
    rellenar(plantillas.filtro_encabezado, {
      n: Math.min(registros.porFiltro.length, 5),
      descripcion_filtro: descripcionFiltroTexto,
    }),
  ];
  registros.porFiltro.slice(0, 5).forEach((id) => {
    const registro = catalogo[id];
    lineas.push(rellenar(plantillas.filtro_linea, {
      id,
      titulo: registro.titulo,
      estado: etiquetaEstado(estados, registro.estado),
      ingreso: registro.ingreso,
    }));
  });
  return lineas.join('\n');
}

/**
 * Elige la intención y, si hace falta un material, lo resuelve.
 *
 * @param {string} intencion
 * @param {object} datos
 * @param {object} registros
 * @param {object} catalogo
 * @param {object} estados
 * @param {object} plantillas
 * @returns {{ respuesta: string, materialUsado: string | null }}
 */
function redactar(intencion, datos, registros, catalogo, estados, plantillas) {
  if (intencion === 'guia_de_busqueda') {
    return { respuesta: plantillas.guia, materialUsado: null };
  }

  if (intencion === 'corregir_o_reportar' && !datos.id && !registros.porContexto) {
    return { respuesta: plantillas.corregir_sin_id, materialUsado: null };
  }

  if (intencion === 'buscar_por_tema') {
    return {
      respuesta: responderTema(datos, registros, catalogo, estados, plantillas),
      materialUsado: null,
    };
  }
  if (intencion === 'buscar_por_frase') {
    return {
      respuesta: responderFrase(datos, registros, catalogo, plantillas),
      materialUsado: null,
    };
  }
  if (intencion === 'buscar_por_persona') {
    return {
      respuesta: responderPersona(datos, catalogo, plantillas),
      materialUsado: null,
    };
  }
  if (intencion === 'buscar_por_fecha_tipo') {
    return {
      respuesta: responderFiltro(datos, registros, catalogo, estados, plantillas),
      materialUsado: null,
    };
  }

  const pideMaterial = INTENCIONES_DE_MATERIAL.has(intencion) || intencion === 'corregir_o_reportar';
  if (!pideMaterial) {
    return { respuesta: '', materialUsado: null };
  }

  // Un ID escrito que no está en el catálogo se responde enseguida y no
  // se recuerda como material de la conversación.
  if (datos.id && !registros.porId) {
    return {
      respuesta: rellenar(plantillas.id_inexistente, { id: datos.id }),
      materialUsado: null,
    };
  }

  const id = registros.porId ?? registros.porContexto;
  if (!id || !catalogo[id]) {
    return { respuesta: plantillas.pedir_id, materialUsado: null };
  }

  const registro = catalogo[id];
  let respuesta = '';
  if (intencion === 'buscar_por_id') {
    respuesta = responderFicha(id, registro, estados, plantillas);
  } else if (intencion === 'resumen_material') {
    respuesta = responderResumen(id, registro, estados, plantillas);
  } else if (intencion === 'personas_en_material') {
    respuesta = responderPersonas(id, registro, estados, plantillas);
  } else if (intencion === 'lugares_y_elementos_visuales') {
    respuesta = responderLugares(id, registro, estados, plantillas);
  } else if (intencion === 'transcripcion_material') {
    respuesta = responderTranscripcion(id, registro, estados, plantillas);
  } else if (intencion === 'fragmento_por_timecode') {
    respuesta = responderTimecode(id, registro, datos, estados, plantillas);
  } else if (intencion === 'material_relacionado') {
    respuesta = responderRelacionados(id, registros, catalogo, plantillas);
  } else if (intencion === 'disponibilidad_validacion') {
    respuesta = responderDisponibilidad(id, registro, estados, plantillas);
  } else if (intencion === 'corregir_o_reportar') {
    respuesta = responderCorregir(id, registro, estados, plantillas);
  }

  return { respuesta, materialUsado: id };
}

export class ModeloSimulado {
  constructor() {
    this.reiniciarContadores();
  }

  /**
   * Vuelve a la primera respuesta de cada subintención de cortesía.
   *
   * @returns {void}
   */
  reiniciarContadores() {
    this.contadoresCortesia = {};
  }

  /**
   * Puntúa intenciones y subintenciones. En empate gana la que aparece
   * antes en el JSON, porque el orden de las claves se conserva y el
   * orden de JavaScript es estable.
   *
   * @param {object} intenciones
   * @param {string[]} tokens
   * @param {object} datos
   * @returns {{ intencion: string | null, puntajes: object[], saludo: boolean, puntajesSub: object }}
   */
  puntuar(intenciones, tokens, datos) {
    const lista = [];
    Object.keys(intenciones).forEach((nombre) => {
      if (nombre === 'cortesia') {
        return;
      }
      let puntaje = sumarPuntaje(compilarReglas(intenciones[nombre]), tokens);
      if (nombre === 'buscar_por_id' && datos.id) {
        puntaje += BONO_ID;
      }
      if (nombre === 'fragmento_por_timecode' && datos.tiempo) {
        puntaje += BONO_TIMECODE;
      }
      lista.push({ intencion: nombre, puntaje });
    });

    const puntajesSub = {};
    const subintenciones = intenciones.cortesia.subintenciones;
    Object.keys(subintenciones).forEach((nombre) => {
      puntajesSub[nombre] = sumarPuntaje(compilarReglas(subintenciones[nombre]), tokens);
    });

    const mejorCortesia = Math.max(0, ...Object.values(puntajesSub));
    lista.push({ intencion: 'cortesia', puntaje: mejorCortesia });

    const sustantivas = lista.filter(
      (item) => item.intencion !== 'cortesia' && item.puntaje >= UMBRAL_INTENCION,
    );

    let intencion = null;
    if (sustantivas.length > 0) {
      sustantivas.sort((a, b) => b.puntaje - a.puntaje);
      intencion = sustantivas[0].intencion;
    } else if (Object.values(puntajesSub).some((puntaje) => puntaje > 0)) {
      intencion = 'cortesia';
    }

    const puntajes = [...lista].sort((a, b) => b.puntaje - a.puntaje).slice(0, 3);
    return {
      intencion,
      puntajes,
      saludo: (puntajesSub.saludo || 0) > 0,
      puntajesSub,
    };
  }

  /**
   * Rota las respuestas de una subintención. Con una sola frase el texto
   * no cambia, pero el contador deja el contrato listo si se añaden más.
   *
   * @param {object} subintenciones
   * @param {object} puntajesSub
   * @returns {string}
   */
  respuestaCortesia(subintenciones, puntajesSub) {
    let ganadora = null;
    let mejor = -1;
    Object.keys(subintenciones).forEach((nombre) => {
      const puntaje = puntajesSub[nombre] || 0;
      if (puntaje > mejor) {
        mejor = puntaje;
        ganadora = nombre;
      }
    });

    const respuestas = subintenciones[ganadora].respuestas;
    const usados = this.contadoresCortesia[ganadora] || 0;
    this.contadoresCortesia[ganadora] = usados + 1;
    return respuestas[usados % respuestas.length];
  }

  /**
   * Genera la intención y el texto. Es asíncrono para compartir contrato
   * con el adaptador de LM Studio, aunque aquí no hay espera de red.
   *
   * @param {object} paquete
   * @returns {Promise<{ intencion: string | null, respuesta: string, puntajes: object[], saludo: boolean, materialUsado: string | null }>}
   */
  async generar(paquete) {
    const tokens = raices(paquete.mensaje);
    const decision = this.puntuar(paquete.intenciones, tokens, paquete.datos);

    if (decision.intencion === null) {
      return {
        intencion: null,
        respuesta: '',
        puntajes: decision.puntajes,
        saludo: decision.saludo,
        materialUsado: null,
      };
    }

    if (decision.intencion === 'cortesia') {
      return {
        intencion: 'cortesia',
        respuesta: this.respuestaCortesia(
          paquete.intenciones.cortesia.subintenciones,
          decision.puntajesSub,
        ),
        puntajes: decision.puntajes,
        saludo: decision.saludo,
        materialUsado: null,
      };
    }

    const redaccion = redactar(
      decision.intencion,
      paquete.datos,
      paquete.registros,
      paquete.catalogo,
      paquete.estados,
      paquete.plantillas,
    );

    return {
      intencion: decision.intencion,
      respuesta: redaccion.respuesta,
      puntajes: decision.puntajes,
      saludo: decision.saludo,
      materialUsado: redaccion.materialUsado,
    };
  }
}
