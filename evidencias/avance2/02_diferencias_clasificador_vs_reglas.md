# Diferencias del clasificador frente a las reglas del Avance 1

Ejecución: `docker compose run --rm web npm test` con `CONFIG.DETECTOR_INTENCION = 'clasificador'`.
Salida: `02_jest_clasificador.txt`.

De 15 turnos, 13 conservan la intención del Avance 1. No se modificaron `casosPrueba.json` ni los pesos del SVM.

| Caso | Pregunta | Esperada por las reglas | Obtenida con el SVM |
|---|---|---|---|
| 6 | Necesito algo donde hablen de qué hacer si llueve mucho | `buscar_por_tema` | `respaldo` |
| 13 | ¿Quién ganó el partido de ayer? | `respaldo` | `fuera_de_alcance` |

La paráfrasis de la lluvia no alcanza una clase de búsqueda con la confianza del modelo, y el orquestador usa el texto de respaldo. La pregunta del partido sí la aprende el SVM como `fuera_de_alcance`. El texto mostrado sigue siendo el de respaldo y no cita VV50003. La etiqueta cambia porque en el Avance 2 esa clase sustituye al respaldo como nombre de la clasificación.

El valor por defecto del detector se dejó en `reglas`. Con `clasificador`, la suite del Avance 1 queda en rojo por esas dos etiquetas, y el criterio de aceptación pide que `npm test` pase. El clasificador se comprueba en `src/tests/multimodal.test.js` y en `src/tests/paridad.test.js`.

## Stemmer

NLTK Snowball y `snowball-stemmers` difieren en una palabra de las 28 frases de paridad: «ambientación» queda `ambientacion` en JavaScript y `ambient` en NLTK. `clasificadorIntenciones.js` aplica solo esa equivalencia, medida en la comparación, para que los tokens y la clase coincidan. No se añadieron más excepciones.
