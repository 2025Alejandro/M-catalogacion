/**
 * Paridad entre el clasificador de JavaScript y el exportado por Python.
 *
 * Qué hace: compara tokens, clase y los tres mayores puntajes.
 * Recibe: paridad.json generado por exportar_modelo_js.py.
 * Devuelve: el resultado de Jest.
 * Se relaciona con clasificadorIntenciones.js y textoUtils.js.
 * Si los tokens difieren, la fuente de verdad es Python: no se ajusta el stemmer a ojo.
 */

import modelo from '../data/modeloIntenciones.json';
import paridad from '../data/paridad.json';
import { crearClasificador } from '../clasificador/clasificadorIntenciones';
import { raiz } from '../chatbot/textoUtils';

const { preprocesar, clasificar } = crearClasificador(modelo, raiz);

describe('paridad del clasificador de intenciones con Python', () => {
  test('hay casos exportados por Python', () => {
    expect(paridad.length).toBeGreaterThan(0);
  });

  if (paridad.length > 0) {
    test.each(paridad)('tokens y clase de «$texto»', (caso) => {
    const tokens = preprocesar(caso.texto);
    const resultado = clasificar(caso.texto);
    expect(tokens).toEqual(caso.tokens);
    expect(resultado.intencion).toBe(caso.clase);

    const esperados = caso.puntajes
      .map((puntaje, indice) => ({ clase: modelo.clases[indice], puntaje }))
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, 3);
    resultado.puntajes.forEach((obtenido, indice) => {
      expect(obtenido.clase).toBe(esperados[indice].clase);
      expect(Math.abs(obtenido.puntaje - esperados[indice].puntaje)).toBeLessThan(1e-3);
    });
    });
  }
});
