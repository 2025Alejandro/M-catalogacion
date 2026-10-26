/**
 * Preparación de Jest.
 *
 * Qué hace: carga los comparadores de DOM de Testing Library.
 * Recibe: nada.
 * Devuelve: nada; amplía expect.
 * Se relaciona con las pruebas de src/tests. Las conversaciones del anexo
 * no renderizan la interfaz, pero el proyecto conserva esta utilidad.
 */

import '@testing-library/jest-dom';
