# Prompt para el agente (modo plan): Avance 2 del proyecto «Catalogacion»

> **Cómo usarlo:** pégalo completo en el agente (Cursor, modo plan) con el repositorio `Catalogacion` abierto. Es autocontenido: incluye las instrucciones oficiales, el contexto vigente del proyecto, los contratos, el código base probado y los criterios de aceptación. **Primero presenta un plan por fases y espera aprobación; después ejecuta fase por fase.** No ejecutes `npx create-react-app`: el proyecto ya existe.

---

## 0. Rol y reglas de honestidad

Eres un ingeniero que continúa un proyecto existente (maqueta React del asistente de un acervo histórico de noticias, Avance 1, versión 0.1) y lo lleva a la **versión 0.2 (Avance 2): primera versión multimodal** con procesamiento de lenguaje natural clásico y clasificación de imágenes con CNN.

Reglas que no se negocian:

1. **Nunca inventes métricas ni resultados.** Toda cifra que aparezca en README, evidencias o portal debe salir de una ejecución real y quedar guardada en un archivo (`metricas_*.json`, salida de consola guardada). Si algo no se pudo ejecutar (por ejemplo, el entrenamiento de la CNN sin GPU), dilo y deja el artefacto marcado como **SIMULADO**.
2. **Lo simulado se muestra como simulado**, en código, interfaz, README y evidencias. El modelo de lenguaje (LM Studio/Hermes) sigue siendo teórico y simulado; el clasificador visual es **real** solo si existe el archivo de predicciones producido por el modelo entrenado.
3. Mantén todas las reglas del archivo `.agent` del repositorio (resumidas en el Anexo B y reproducidas completas al final). En especial: comentarios en español (cabecera de archivo y JSDoc), sin credenciales ni datos reales, catálogo ficticio, no activar LM Studio, no usar la fecha del sistema para los rangos, no tocar `casosPrueba.json` ni las plantillas existentes.
4. El sistema **clasifica la escena de una imagen; no identifica personas por su rostro**. Ninguna respuesta, plantilla ni evidencia debe sugerir lo contrario.
5. No subas al repositorio los conjuntos de imágenes completos (solo las muestras pequeñas del punto 5.4) ni archivos de modelo grandes (`*.keras`, `*.h5`). Añádelos a `.gitignore`.

---

## 1. Objetivo y requisitos oficiales del Avance 2 (texto de la actividad)

**Objetivo:** implementar y evaluar componentes de procesamiento de lenguaje natural y clasificación de imágenes para desarrollar una primera versión multimodal del asistente inteligente.

**Instrucciones:**

1. Recuperar problema, objetivo, usuarios, alcance, arquitectura conceptual y chatbot del Avance 1, corrigiendo lo necesario para mantener la coherencia.
2. Construir un conjunto de datos para entrenar las intenciones conversacionales.
3. Preprocesamiento de texto: tokenización, normalización, eliminación de stopwords y lematización o stemming.
4. Representación del texto con TF-IDF o Bolsa de Palabras.
5. Entrenar un clasificador de intenciones con Naive Bayes o SVM y evaluarlo.
6. Seleccionar un conjunto de imágenes del dominio y preparar los datos de entrenamiento y evaluación.
7. Clasificador de imágenes con una CNN con transferencia de aprendizaje (ResNet50 o EfficientNet).
8. Evaluar el modelo visual con Accuracy, Precision, Recall, F1-score y matriz de confusión.
9. Integrar el componente conversacional y el visual: el sistema procesa texto e interpreta/comunica los resultados del clasificador de imágenes.
10. Analizar resultados de ambos componentes, limitaciones y conclusiones para la versión final.

**Entregable del alumno:** documento Word y PDF con: Introducción, Conjunto de datos textual, Preprocesamiento de texto, Representación y clasificación de intenciones, Conjunto de imágenes, Arquitectura y desarrollo del clasificador visual, Integración multimodal, Resultados, Métricas, Conclusiones, Referencias. **Tu trabajo es producir el código, las salidas reales y las evidencias que ese documento cita**, con los nombres de archivo exactos de la sección 7.

---

## 2. Decisiones de arquitectura (ya tomadas; no las rediscutas)

| Tema | Decisión |
|---|---|
| Dónde vive el ML | Carpeta nueva `ml/` en la raíz del repositorio, en **Python**, con un servicio Docker `ml` (no hace falta instalar Python en el host). |
| Texto | `ml/` genera el dataset, preprocesa (con **NLTK Snowball español**, el mismo algoritmo que `snowball-stemmers` en JS), entrena TF-IDF + Naive Bayes y TF-IDF + LinearSVC, evalúa y **exporta el SVM a JSON** para correr en el navegador. |
| Texto en React | Nuevo módulo `src/clasificador/clasificadorIntenciones.js` que lee el JSON exportado y calcula el puntaje del SVM en JavaScript. Una prueba Jest de **paridad** compara tokens y clase contra lo que calculó Python. |
| Detector de intención | Nuevo parámetro `CONFIG.DETECTOR_INTENCION`: `'clasificador'` (por defecto, Avance 2) o `'reglas'` (el puntaje por frases del Avance 1, que se conserva para regresión). |
| Visual | Entrenamiento de ResNet50 (transferencia de aprendizaje) en **Google Colab con GPU**; no en el host ni en Docker. El agente deja listos los scripts y el cuaderno. |
| Visual en React | El navegador **no ejecuta la CNN**. La interfaz ofrece un selector de **imágenes de muestra** (del conjunto de prueba) y muestra la **predicción precalculada** por el modelo entrenado (`src/data/prediccionesVisual.json`). Mientras ese archivo no exista, se usa uno generado con `modo: "simulado"`, con etiquetas visibles de SIMULADO. |
| Respuestas | Siguen siendo plantillas del JSON (modelo de lenguaje simulado). Se añaden plantillas para imagen. |

**Clases de intención del Avance 2 (17):** las 14 de consulta que ya existen en `baseConocimiento.json` (`buscar_por_id`, `resumen_material`, `personas_en_material`, `lugares_y_elementos_visuales`, `transcripcion_material`, `fragmento_por_timecode`, `buscar_por_tema`, `buscar_por_frase`, `buscar_por_persona`, `buscar_por_fecha_tipo`, `material_relacionado`, `disponibilidad_validacion`, `guia_de_busqueda`, `corregir_o_reportar`) + `cortesia` + **`describir_imagen`** (nueva) + **`fuera_de_alcance`** (nueva clase aprendida que sustituye al «respaldo» como etiqueta de clasificación; el texto de respaldo sigue en el JSON y se usa cuando la clase es `fuera_de_alcance` o cuando el puntaje no alcanza el umbral).

**Clases de escena visual (6):** `conferencia_prensa`, `entrevista_estudio`, `exteriores_calle`, `ceremonia_evento`, `multitud_manifestacion`, `deportes_estadio`.

---

## 3. Plan por fases (preséntalo, espera aprobación y ejecútalo en este orden)

### Fase 0 — Línea base
1. Lee `.agent` (Anexo B) y recorre `src/`. Ejecuta `docker compose run --rm test` y guarda la salida en `evidencias/avance2/00_jest_linea_base.txt` (deben pasar las 13 pruebas / 15 turnos).
2. No avances si la línea base falla; repórtalo.

### Fase 1 — Pipeline de texto en `ml/` (instrucciones 2 a 5)
1. Crea la estructura de la sección 4 y los archivos del Anexo A (`ml/*.py`). Copia el código tal cual; solo ajusta rutas si hace falta.
2. Crea `ml/Dockerfile` (`python:3.12-slim`, instala `ml/requirements.txt`: `scikit-learn pandas numpy matplotlib joblib nltk pillow requests`) y añade el servicio `ml` a `docker-compose.yml` (monta `./ml:/app`, `working_dir: /app`). Comandos de uso:
   ```powershell
   docker compose build ml
   docker compose run --rm ml python generar_dataset_intenciones.py
   docker compose run --rm ml python preprocesamiento.py
   docker compose run --rm ml python clasificador_intenciones.py
   docker compose run --rm ml python exportar_modelo_js.py
   ```
3. Verifica en la salida de `preprocesamiento.py` que **`STEMMER_USADO` diga NLTK SnowballStemmer('spanish')**. Si dice «reductor de sufijos propio», NLTK no está instalado: corrige el entorno antes de seguir.
4. Guarda cada salida de consola en `ml/resultados_texto/salida_*.txt` (`salida_dataset.txt`, `salida_preprocesamiento.txt`, `salida_clasificador.txt`, `salida_exportacion.txt`).
5. Extra obligatorio para el documento: crea `ml/ablacion_preprocesamiento.py` que reentrene el SVM quitando un paso cada vez (completo / sin stopwords / sin stemming / sin ninguno) y guarde `ml/resultados_texto/ablacion.json` y `salida_ablacion.txt` (accuracy y F1 macro en la prueba por plantilla y en la independiente).
6. Reporta los números reales obtenidos con NLTK. **Pueden diferir de los de referencia** (sección 8); los reales son los que cuentan.

### Fase 2 — Clasificador en React (instrucción 9, parte de texto)
1. Copia `ml/exportado_js/modeloIntenciones.json` y `paridad.json` a `src/data/`.
2. Crea `src/clasificador/clasificadorIntenciones.js` con el código del Anexo A.7 y conéctalo al stemmer que ya usa `textoUtils.js` (`newStemmer('spanish').stem`).
3. Prueba de paridad `src/tests/paridad.test.js`: para cada elemento de `paridad.json`, el preprocesamiento de JS debe dar **los mismos tokens** y la **misma clase**, y los tres mayores puntajes deben coincidir con tolerancia 1e-3. Si los tokens difieren por el stemmer, **no ajustes el stemmer a ojo**: lista las diferencias y repórtalas (la fuente de verdad es Python).
4. Modifica `chatbot.js`: si `CONFIG.DETECTOR_INTENCION === 'clasificador'`, calcula `clasificar(mensaje)` y añade al paquete `intencionClasificada` = `{ intencion, puntaje, margen, puntajes }`. Mantén intactas la extracción y la recuperación.
5. Modifica `modeloSimulado.js`: si el paquete trae `intencionClasificada`, **usa esa intención** en lugar del puntaje por frases, salvo que `puntaje < CONFIG.UMBRAL_CLASIFICADOR` (valor inicial `0.0`) o la clase sea `fuera_de_alcance`: en esos casos responde con el respaldo. En modo `'reglas'` todo se comporta como en el Avance 1.
6. `diagnostico` agrega: `detector` (`clasificador` o `reglas`), `clasificador` (clase, puntaje, margen, tres mejores) y el aviso si cayó al respaldo por umbral.
7. **Regresión:** corre las 13 conversaciones con `DETECTOR_INTENCION = 'reglas'` (deben pasar todas, sin modificar `casosPrueba.json`) y luego con `'clasificador'`. Guarda ambas salidas (`evidencias/avance2/02_jest_reglas.txt`, `02_jest_clasificador.txt`). **Si con el clasificador fallan turnos, no cambies los casos ni los pesos**: documenta cuáles fallan, la intención predicha y por qué (`evidencias/avance2/02_diferencias_clasificador_vs_reglas.md`). El valor por defecto queda en `'clasificador'` solo si pasan al menos 12 de los 15 turnos; si no, déjalo en `'reglas'`, avísalo y deja la decisión al usuario.

### Fase 3 — Componente visual (instrucciones 6 a 8)
1. Crea en `ml/` los scripts del Anexo A.8 a A.11 (descarga de Commons, división, entrenamiento ResNet50, evaluación). No los ejecutes en el host: requieren internet, TensorFlow y GPU.
2. Crea `ml/Avance2_Colab.ipynb` con celdas (markdown + código) que, en orden: monten la carpeta `ml/` (subida o `git clone` del repositorio), instalen dependencias, descarguen imágenes, pausen para **revisión manual** de imágenes que no correspondan a su clase, dividan en train/val/test, entrenen (fase 1 y fase 2), evalúen, guarden `resultados_visual/` y **generen las predicciones de muestra** (siguiente punto).
3. Crea `ml/visual/predecir_muestras.py` (lo ejecuta el usuario en Colab, tras entrenar): toma del conjunto de **prueba** 2 imágenes por clase (12 en total, semilla fija), las copia a `muestras/` con nombre `muestra_<clase>_<n>.jpg`, y escribe `prediccionesVisual.json` con el formato de la sección 5.3 (`modo: "real"`), usando el modelo entrenado. También escribe `muestras/manifest.json` con autor, licencia y origen de cada muestra (tomados de `manifest.csv`).
4. Si el usuario aún no trajo esos archivos, genera tú `src/data/prediccionesVisual.json` con **`modo: "simulado"`** (probabilidades deterministas inventadas para las 12 muestras, una de ellas con confianza menor a 0.50 para probar el caso incierto) y marca en el JSON `"aviso": "SIMULADO: no proviene de ningún modelo entrenado"`. Para las miniaturas de `public/muestras/`, genera **12 imágenes sintéticas neutras** (rectángulos de color con el nombre de la clase, sin personas ni marcas) con Pillow en `ml/visual/generar_muestras_simuladas.py`, claramente rotuladas «MUESTRA SIMULADA».
5. Entrega a **`ml/visual/INSTRUCCIONES_COLAB.md`** los pasos exactos para que el usuario ejecute el cuaderno y copie al proyecto: `resultados_visual/metricas_visual.json`, `matriz_confusion_visual.png`, `historial.csv`, `prediccionesVisual.json` y `muestras/*.jpg`.

### Fase 4 — Integración multimodal en la interfaz (instrucción 9)
1. **Base de conocimiento** (`baseConocimiento.json`; solo aditivo, sin reordenar ni cambiar nada existente):
   - Campo `escenas` en cada registro de `catalogo_demo` (valores en la sección 5.1).
   - Objeto `escenas_visuales` con el nombre legible de cada clase (sección 5.1).
   - Nueva intención `describir_imagen` **al final** de `intenciones` (después de `cortesia`), con `fuertes` y `claves` sin acentos (por ejemplo «que escena es esta imagen», «clasifica esta imagen», «analiza esta foto», «que se ve en esta imagen»), para que el modo `'reglas'` también la reconozca.
   - Plantillas nuevas (sección 5.2). No modifiques las existentes.
2. **Lógica:** `src/clasificador/clasificadorVisual.js` con `interpretarImagen(muestraId, predicciones, catalogo)` que devuelve `{ clase, nombre, confianza, modo, incierto, materiales }` donde `incierto = confianza < CONFIG.UMBRAL_VISUAL` (valor `0.50`) y `materiales` son los registros cuyo campo `escenas` incluye la clase (orden: ID ascendente; vacío si `incierto`).
3. `Chatbot.responder(mensaje, imagen = null)`: si hay `imagen` (`{ id }`), la intención es `describir_imagen` sin pasar por el clasificador de texto; se añade al paquete `imagenInterpretada`. Si la intención es `describir_imagen` pero no hay imagen, responde con la plantilla `imagen_sin_adjunto`.
4. `validarRespuesta` debe seguir pasando: los IDs que cite la respuesta de imagen deben existir en el catálogo.
5. **Interfaz:**
   - `AdjuntarImagen.jsx`: botón «Adjuntar imagen de muestra» que abre una cuadrícula de 12 miniaturas (de `public/muestras/`); al elegir una se muestra como vista previa en el mensaje del usuario. Accesible (etiquetas, foco, teclado).
   - `MessageList.jsx`: puede mostrar la miniatura en el mensaje del usuario.
   - Texto fijo bajo el selector: «Solo se pueden clasificar las imágenes de muestra: la red neuronal se entrenó fuera del navegador y aquí se muestra su predicción guardada».
   - `AvisoModoSimulado.jsx`: añade una segunda línea con el modo visual: «Clasificador visual: predicciones del modelo entrenado» (`modo real`) o «Clasificador visual: SIMULADO (aún no hay modelo entrenado)» (`modo simulado`).
   - `PanelFlujo.jsx`: muestra el detector usado, los tres puntajes del clasificador de texto, y para imágenes la clase, la confianza, el modo y los materiales propuestos.
   - Un mensaje con imagen y sin texto envía «¿Qué escena es esta imagen?».
   - No uses `localStorage`; no subas archivos del usuario a ningún sitio.

### Fase 5 — Pruebas automáticas
- `src/tests/paridad.test.js` (Fase 2).
- `src/tests/multimodal.test.js` con estos casos mínimos (cada conversación con un `Chatbot` nuevo y `DETECTOR_INTENCION = 'clasificador'`), usando las muestras de `prediccionesVisual.json`:
  1. Texto: «¿De qué trata el NT20045?» → `resumen_material`.
  2. Texto: «¿Aparece alguna persona en el EN10388?» → `personas_en_material`.
  3. Texto: «¿En qué estado está el NT20112?» → `disponibilidad_validacion`.
  4. Texto: «Busca videos sobre hospitales» → `buscar_por_tema` y cita NT20112.
  5. Imagen con confianza ≥ 0.50: intención `describir_imagen`, la respuesta nombra la escena, la confianza y lista materiales cuyo campo `escenas` la incluye; contiene el aviso de «clasificación automática».
  6. Imagen con confianza < 0.50: la respuesta dice que no puede asegurar la escena y **no lista materiales**.
  7. «¿Qué escena es esta imagen?» sin imagen adjunta → `imagen_sin_adjunto`.
  8. «¿Quién ganó el partido de ayer?» → `fuera_de_alcance` (respuesta de respaldo; no cita VV50003).
  9. Ninguna respuesta de imagen contiene palabras de identificación de personas («se llama», «es el señor», «reconozco a»).
- Guarda la salida de `docker compose run --rm test` en `evidencias/avance2/05_jest_final.txt`.
- `docker compose run --rm web npm run build` debe terminar **sin warnings de ESLint** (guarda la salida en `evidencias/avance2/05_build.txt`).

### Fase 6 — Evidencias y portal (sección 7)
Genera todas las evidencias de la sección 7 y extiende `evidencias/portal.html` con una sección «Avance 2» (índice de evidencias, métricas, enlaces a capturas y salidas). Las capturas de la interfaz las produces con el mismo método con el que se hicieron las 14 del Avance 1 (si no lo conoces, usa Playwright con Chromium en un contenedor o en el host; documenta cómo).

### Fase 7 — Documentación y continuidad
1. `README.md`: nueva sección «Avance 2» (qué se añadió, cómo reproducir cada paso, qué es real y qué es simulado, resultados reales con enlace a los JSON, limitaciones).
2. Actualiza **`.agent`**: versión 0.2 (Avance 2), nuevas carpetas y archivos, nuevos parámetros `CONFIG`, contratos nuevos (paquete, `diagnostico`, `responder(mensaje, imagen)`), y los límites conocidos nuevos. Mantén su estilo y conserva lo vigente.
3. Cabeceras en español en cada archivo nuevo y JSDoc/docstrings en cada función; sin comentarios vacíos.
4. `package.json`: versión `0.2.0`.
5. Commit sugerido (no hagas push sin que el usuario lo pida): «Avance 2: clasificador de intenciones, componente visual e integración multimodal».

### Fase 8 — Cierre
Entrega un informe final con: archivos creados/modificados, comandos ejecutados, **tabla de resultados reales** (texto), pruebas pasadas/falladas, qué quedó **pendiente del usuario** (entrenar en Colab y copiar archivos), y cualquier desviación respecto a este prompt.

---

## 4. Estructura esperada

```
Catalogacion/
├─ .agent                          (actualizado)
├─ docker-compose.yml              (+ servicio ml)
├─ ml/
│  ├─ Dockerfile, requirements.txt
│  ├─ generar_dataset_intenciones.py
│  ├─ preprocesamiento.py
│  ├─ clasificador_intenciones.py
│  ├─ ablacion_preprocesamiento.py
│  ├─ exportar_modelo_js.py
│  ├─ datos/                       (CSV generados)
│  ├─ modelos/                     (joblib; en .gitignore)
│  ├─ resultados_texto/            (métricas, matrices, errores, salidas)
│  ├─ exportado_js/                (modeloIntenciones.json, paridad.json)
│  ├─ visual/
│  │  ├─ descargar_imagenes_commons.py
│  │  ├─ dividir_dataset.py
│  │  ├─ clasificador_visual.py
│  │  ├─ evaluacion_visual.py
│  │  ├─ predecir_muestras.py
│  │  ├─ generar_muestras_simuladas.py
│  │  └─ INSTRUCCIONES_COLAB.md
│  └─ Avance2_Colab.ipynb
├─ public/muestras/                (12 miniaturas + manifest.json)
├─ src/
│  ├─ clasificador/ (clasificadorIntenciones.js, clasificadorVisual.js)
│  ├─ components/AdjuntarImagen.jsx (+ cambios en los demás)
│  ├─ data/ (modeloIntenciones.json, paridad.json, prediccionesVisual.json, baseConocimiento.json ampliado)
│  └─ tests/ (conversaciones.test.js sin cambios, paridad.test.js, multimodal.test.js)
└─ evidencias/avance2/             (sección 7)
```

---

## 5. Contratos

### 5.1 Base de conocimiento (cambios aditivos)

Campo `escenas` por registro y nombres legibles:

```json
"escenas_visuales": {
  "conferencia_prensa": "conferencia de prensa",
  "entrevista_estudio": "entrevista en estudio",
  "exteriores_calle": "exteriores o calle",
  "ceremonia_evento": "ceremonia o evento",
  "multitud_manifestacion": "multitud o manifestación",
  "deportes_estadio": "deportes o estadio"
}
```

| ID | `escenas` |
|---|---|
| NT20045 | `["conferencia_prensa"]` |
| EN10388 | `["entrevista_estudio", "exteriores_calle"]` |
| NT20112 | `["ceremonia_evento"]` |
| EN10391 | `["entrevista_estudio"]` |
| RB30077 | `["exteriores_calle", "multitud_manifestacion"]` |
| HI40015 | `["ceremonia_evento", "multitud_manifestacion"]` |
| NT20150 | `["conferencia_prensa", "ceremonia_evento"]` |
| VV50003 | `["deportes_estadio", "multitud_manifestacion"]` |

### 5.2 Plantillas nuevas (claves nuevas en `plantillas`)

- `describir_imagen`: «La imagen parece una escena de «{escena}» (confianza {confianza}). {materiales} Es una clasificación automática y debe confirmarla una persona.» Cuando `{materiales}` existe: «Materiales del archivo con ese tipo de escena: {lista}.» Si no hay: «Por ahora ningún material del catálogo tiene ese tipo de escena registrado.»
- `imagen_incierta`: «No puedo asegurar qué escena es: la mejor opción sería «{escena}», pero la confianza es solo {confianza}. Prueba con otra imagen o descríbeme lo que buscas con texto.»
- `imagen_sin_adjunto`: «Adjunta una imagen de muestra con el botón correspondiente y te digo qué tipo de escena parece.»
- `imagen_no_disponible`: «No tengo una predicción guardada para esa imagen; en esta maqueta solo se pueden clasificar las imágenes de muestra.»

Si el modo visual es `simulado`, añade al final de la respuesta: «(Clasificador visual SIMULADO: solo demostración.)». La confianza se muestra como porcentaje entero.

### 5.3 `src/data/prediccionesVisual.json`

```json
{
  "modo": "real",
  "aviso": "",
  "modelo": "ResNet50 (transferencia de aprendizaje, ImageNet)",
  "clases": ["conferencia_prensa", "entrevista_estudio", "exteriores_calle", "ceremonia_evento", "multitud_manifestacion", "deportes_estadio"],
  "muestras": [
    {
      "id": "muestra_conferencia_prensa_1",
      "archivo": "muestras/muestra_conferencia_prensa_1.jpg",
      "clase_real": "conferencia_prensa",
      "clase_predicha": "conferencia_prensa",
      "confianza": 0.93,
      "probabilidades": { "conferencia_prensa": 0.93, "entrevista_estudio": 0.03, "exteriores_calle": 0.01, "ceremonia_evento": 0.02, "multitud_manifestacion": 0.01, "deportes_estadio": 0.0 }
    }
  ]
}
```

En modo `simulado`, el campo `modo` vale `"simulado"` y `aviso` es obligatorio.

### 5.4 Muestras

12 imágenes (2 por clase) del **conjunto de prueba**, con licencia abierta registrada en `muestras/manifest.json` (`archivo`, `clase`, `autor`, `licencia`, `origen`). En modo simulado, las muestras son las sintéticas rotuladas.

### 5.5 `CONFIG` (nuevos parámetros)

`DETECTOR_INTENCION: 'clasificador'`, `UMBRAL_CLASIFICADOR: 0.0` (puntaje mínimo del SVM; con la prueba independiente del Avance 2, un umbral de 0 aceptó ~75 % de las preguntas con ~88 % de acierto sobre ellas; ajústalo con validación, no con la prueba), `UMBRAL_VISUAL: 0.50`.

### 5.6 `diagnostico` (campos nuevos)

`detector`, `clasificador: { intencion, puntaje, margen, puntajes }`, `imagen: { id, clase, nombre, confianza, modo, incierto, materiales }` (solo con imagen) y `aviso` si hubo respaldo por umbral.

---

## 6. Detalles de implementación que suelen fallar

- El JSON exportado trae el vocabulario de n-gramas con **espacio** entre palabras (`"minut timecode"`). JS arma los bigramas con un espacio, sobre las **raíces ya filtradas por stopwords**, igual que Python.
- `normalizar` de JS debe reemplazar IDs y tiempos **antes** de quitar acentos y pasar a minúsculas, y usar los mismos patrones que Python (ID: `[A-Za-z]{2}\d{5}`; tiempo: `\d{1,2}:\d{2}(:\d{2})?`). La extracción de datos del Avance 1 (`extraccionDatos.js`) **no se toca**: sigue usando su propio patrón de ID para la recuperación.
- Los marcadores `idmaterial` y `timecode` no se pasan por el stemmer.
- CRA/Jest importa JSON directamente (`import modelo from '../data/modeloIntenciones.json'`).
- El build con `CI=true` falla con warnings de ESLint: sin variables sin usar ni dependencias faltantes en hooks.
- En Windows, copia archivos con `Copy-Item`; en el contenedor `ml`, las rutas son de Linux.

---

## 7. Evidencias que debes producir (nombres exactos)

El documento de la actividad las cita; guárdalas en `evidencias/avance2/` salvo indicación.

| # | Archivo | Contenido | Sección del documento |
|---|---|---|---|
| E1 | `ml/datos/intenciones_dataset.csv`, `intenciones_prueba_independiente.csv`, `ml/resultados_texto/salida_dataset.txt` | Dataset, particiones y conteos | 2 |
| E2 | `ml/resultados_texto/salida_preprocesamiento.txt` | Ejemplo paso a paso con NLTK | 3 |
| E3 | `ml/resultados_texto/ablacion.json`, `salida_ablacion.txt` | Efecto de stopwords y stemming | 3.3 |
| E4 | `ml/resultados_texto/metricas_texto.json`, `salida_clasificador.txt`, `reporte_*.txt`, `errores_*.csv` | Métricas NB y SVM, validación cruzada | 4, 8, 9 |
| E5 | `ml/resultados_texto/matriz_confusion_svm_independiente.png` (y las demás) | Matrices de confusión del texto | 9 |
| E6 | `ml/resultados_texto/salida_exportacion.txt`, `00_jest_linea_base.txt`, `02_jest_reglas.txt`, `02_jest_clasificador.txt`, `02_diferencias_clasificador_vs_reglas.md` | Exportación, paridad JS-Python y regresión | 7 |
| E7 | `ml/resultados_visual/metricas_visual.json`, `matriz_confusion_visual.png`, `historial.csv`, `reporte_visual.txt` | **Producidos por el usuario en Colab**; el agente solo deja el procedimiento | 5, 6, 8, 9 |
| E8 | `05_jest_final.txt`, `05_build.txt` | Pruebas finales y build sin warnings | 7 |
| E9 | `capturas/a2_01_clasificador_texto.png` … `a2_08_*.png` | Capturas de la interfaz (ver lista) | 7, 8 |
| E10 | `evidencias/portal.html` (sección Avance 2) | Índice de evidencias | todas |

**Capturas mínimas (E9)**, con el panel «Cómo respondió» abierto cuando aplique: (1) pregunta de texto con el clasificador (resumen de NT20045); (2) pregunta por persona; (3) búsqueda por tema; (4) fragmento por timecode; (5) selector de imágenes de muestra abierto; (6) imagen con confianza alta y materiales propuestos; (7) imagen con confianza baja (respuesta incierta); (8) pregunta fuera de alcance. Los banners de modo (simulado de lenguaje y modo visual) deben verse en todas.

---

## 8. Resultados de referencia (para que detectes anomalías; los reales mandan)

Obtenidos con el código del Anexo A usando un reductor de sufijos propio porque NLTK no estaba instalado en ese entorno. Con NLTK Snowball pueden variar unos puntos:

- Dataset: 1,084 frases, 17 intenciones; 875 de entrenamiento, 209 de prueba por plantilla y 102 de prueba independiente.
- SVM (TF-IDF 1-2 gramas): prueba por plantilla accuracy 0.727 / F1 macro 0.721; prueba independiente 0.794 / 0.789. Naive Bayes: 0.703 / 0.700 y 0.804 / 0.791. Validación cruzada ≈ 0.96 (optimista por las plantillas repetidas).
- Si tus números se alejan más de ~10 puntos de estos, revisa el pipeline antes de reportar.
- El clasificador visual: **no hay cifras de referencia**; no las inventes.

---

## 9. Criterios de aceptación (checklist final)

- [ ] `docker compose run --rm ml python clasificador_intenciones.py` se ejecuta sin error y deja `metricas_texto.json`.
- [ ] `STEMMER_USADO` indica NLTK Snowball en todas las salidas guardadas.
- [ ] La prueba de paridad JS-Python pasa (tokens y clase idénticos; puntajes con tolerancia 1e-3).
- [ ] Las 13 conversaciones del Avance 1 pasan en modo `'reglas'`; el resultado en modo `'clasificador'` está documentado, con diferencias explicadas.
- [ ] La interfaz permite elegir una imagen de muestra y muestra la escena, la confianza y los materiales; la confianza baja se comunica como incierta.
- [ ] La interfaz muestra siempre los dos avisos de modo (lenguaje simulado y modo visual real/simulado).
- [ ] Ninguna cifra visual existe si no hay `metricas_visual.json` real.
- [ ] `docker compose run --rm test` y `npm run build` pasan sin warnings.
- [ ] `.agent`, README y portal actualizados; todo comentado en español.
- [ ] `ml/visual/INSTRUCCIONES_COLAB.md` explica con claridad qué debe hacer el usuario para completar la parte visual.

---

# ANEXO A — Código base probado (créalo tal cual en la ruta indicada)

Todo el código de este anexo se ejecutó y probó. Los archivos Python van en `ml/` salvo que se indique otra ruta; ajusta solo rutas relativas si la estructura lo exige.

## A.1 `ml/generar_dataset_intenciones.py`

```python
"""Genera el conjunto de datos de intenciones conversacionales (Avance 2).

Salidas (carpeta datos/):
  - intenciones_dataset.csv                 -> texto, intencion, plantilla_id, particion (train | test)
  - intenciones_prueba_independiente.csv    -> texto, intencion (frases escritas a mano, sin plantillas)

Estrategia:
  1. Para cada intención hay ~20 plantillas de pregunta con huecos ({id}, {tema}, {persona}...).
  2. Cada plantilla se rellena con valores de listas ficticias y se le aplica un poco de ruido
     (muletillas, errores de dedo) para parecerse a lo que escribiría un usuario real.
  3. La partición train/test se hace POR PLANTILLA: ~20 % de las plantillas de cada intención
     se reservan para prueba. Así el modelo no ve en entrenamiento la misma estructura de frase
     que se usa para evaluarlo (evita una evaluación inflada por plantillas repetidas).
  4. Además se incluye un conjunto de prueba independiente de frases escritas a mano con otra redacción.

Los datos son sintéticos y sirven para esta etapa del proyecto; no provienen de usuarios reales.
Uso:  python generar_dataset_intenciones.py
"""
from __future__ import annotations

import csv
import random
from pathlib import Path

SEMILLA = 42
MUESTRAS_POR_INTENCION = 56

# --------------------------------------------------------------------------- #
# Valores para rellenar los huecos de las plantillas (todos ficticios)
# --------------------------------------------------------------------------- #
IDS = ["NT20045", "EN10388", "NT20112", "EN10391", "RB30077", "HI40015", "NT20150", "VV50003",
       "NT20201", "EN10402", "RB30120", "HI40033", "VV50010", "NT20310", "EN10455", "RB30201"]
TEMAS = ["inundaciones", "hospitales", "transporte público", "seguridad vial", "cambio climático",
         "tarifas del metro", "lluvias fuertes", "accidentes de tránsito", "protección civil",
         "obras en avenidas", "salud pública", "educación", "elecciones", "contaminación del aire",
         "sequía", "mercados", "turismo", "incendios forestales", "vivienda", "festivales de música"]
PERSONAS = ["Laura Mendoza", "Ricardo Salas", "Ana Torres", "Carlos Vega", "Marta Ibarra",
            "Jorge Ramírez", "Sofía Luna", "Pedro Cano", "Elena Ortiz", "Luis Navarro"]
TIEMPOS = ["21:48", "05:32", "12:05", "00:09:15", "07:40", "03:10", "15:20", "00:31:05", "01:02:30", "10:00"]
TIPOS = [("entrevista", "entrevistas"), ("conferencia", "conferencias"), ("cinta histórica", "cintas históricas"),
         ("material en bruto", "materiales en bruto"), ("emisión en vivo", "emisiones en vivo"), ("ceremonia", "ceremonias")]
RANGOS = ["esta semana", "hoy", "ayer", "este mes", "la semana pasada"]
ANIOS = ["1998", "2003", "2015", "2020", "2024", "2026"]
FRASES = ["no habrá aumento en la tarifa", "cien camas y urgencias las veinticuatro horas",
          "la velocidad excesiva es la principal causa", "mochila de emergencia", "rutas de evacuación",
          "reducir veinte minutos los traslados", "las zonas bajas se inundan", "el drenaje se satura",
          "vamos a ampliar la línea", "no hay riesgo para la población", "la obra termina en diciembre"]

# --------------------------------------------------------------------------- #
# Plantillas por intención
# --------------------------------------------------------------------------- #
PLANTILLAS: dict[str, list[str]] = {
 "buscar_por_id": [
  "¿Qué es el material {id}?", "Dame la ficha del {id}", "Ficha del material {id}", "Muéstrame los datos del {id}",
  "Información del material {id}", "¿Cuánto dura el {id}?", "Duración del {id}", "¿Qué tipo de material es el {id}?",
  "¿Cuándo ingresó el {id}?", "Necesito los datos del {id}", "Abre el material {id}", "Quiero ver la ficha de {id}",
  "¿Qué video es el {id}?", "Datos generales de {id}", "{id}", "Busca el {id}", "Consulta el ID {id}",
  "¿Cuál es el título del {id}?", "¿De qué fecha es el {id}?", "Ficha técnica {id}", "Dime qué es {id}",
  "Detalles del archivo {id}"],
 "resumen_material": [
  "¿De qué trata el {id}?", "Resumen del {id}", "Hazme un resumen del material {id}", "¿De qué va el video {id}?",
  "¿Qué contiene el {id}?", "Cuéntame de qué se trata el {id}", "¿Cuál es el tema del {id}?", "Dame un resumen de {id}",
  "¿Qué etiquetas tiene el {id}?", "Explícame brevemente el {id}", "¿Sobre qué es el material {id}?",
  "¿Qué temas aborda el {id}?", "Resume el {id}", "¿Qué hay en el {id}?", "Quiero saber de qué habla el {id}",
  "Descripción general de {id}", "¿De qué se habla en el {id}?", "Sinopsis del {id}", "¿Me resumes el material {id}?",
  "De qué trata {id}"],
 "personas_en_material": [
  "¿Aparece alguna persona en el {id}?", "¿Quiénes aparecen en el {id}?", "¿Qué personas salen en el material {id}?",
  "¿Se identifica a alguien en el {id}?", "¿Quién habla en el {id}?", "¿Hay personas identificadas en {id}?",
  "Dime quién aparece en el {id}", "Personas que aparecen en el {id}", "¿Salen funcionarios en el {id}?",
  "¿Quién es el entrevistado del {id}?", "¿A quién entrevistan en el {id}?", "¿Aparece algún político en el {id}?",
  "¿Qué personajes aparecen en {id}?", "¿Hay algún rótulo con nombre en el {id}?",
  "¿Se menciona el nombre del especialista en el {id}?", "Lista de personas del {id}", "¿Cuántas personas hay en el {id}?",
  "¿Quién sale en {id}?", "¿Reconoce a las personas del {id}?", "¿Aparece alguien conocido en el {id}?",
  "¿Qué personas se ven en {id}?"],
 "lugares_y_elementos_visuales": [
  "¿Dónde se grabó el {id}?", "¿Qué se ve en el {id}?", "¿Qué lugares aparecen en el {id}?", "Descripción visual del {id}",
  "¿Qué elementos visuales tiene el {id}?", "¿Qué aparece en pantalla en el {id}?", "¿Hay texto en pantalla en el {id}?",
  "¿En qué lugar sucede el {id}?", "¿Qué escenas tiene el {id}?", "¿Qué imágenes se ven en {id}?",
  "¿Se ve algún mapa en el {id}?", "¿Cómo es el escenario del {id}?", "Describe lo que se ve en el {id}",
  "¿En qué sitio se filmó el {id}?", "¿Qué objetos aparecen en el {id}?", "¿Hay rótulos o gráficos en el {id}?",
  "Cuáles son los lugares de {id}", "¿Cómo luce el video {id}?", "¿Qué tomas tiene el {id}?", "Elementos visuales de {id}"],
 "transcripcion_material": [
  "¿Qué dicen en el {id}?", "Muéstrame la transcripción del {id}", "Transcripción del material {id}", "¿Qué se dice en el {id}?",
  "Dame el texto del audio del {id}", "Quiero leer lo que dicen en {id}", "¿Qué dijo el entrevistado en el {id}?",
  "Pásame la transcripción de {id}", "¿Qué declaraciones hay en el {id}?", "Texto completo del {id}",
  "Lee lo que se habla en el {id}", "¿Qué se escucha en el {id}?", "Fragmentos de la transcripción del {id}",
  "Necesito el audio transcrito del {id}", "¿Qué hablan en el {id}?", "Las declaraciones del {id}",
  "¿Tiene transcripción el {id}?", "Subtítulos del {id}", "Transcribe el {id}",
  "¿Cuáles son las frases más importantes del {id}?"],
 "fragmento_por_timecode": [
  "¿Qué se dice en el minuto {tc} del {id}?", "¿Qué dicen en el minuto {tc}?", "Muéstrame el fragmento en {tc} del {id}",
  "¿Qué pasa en el {tc} del {id}?", "Lo que se dice a los {tc} en {id}", "Texto en el timecode {tc}",
  "¿Qué dicen en el segundo {tc}?", "Ve al minuto {tc} del {id}", "Qué hay en {tc} del {id}", "¿Qué declaran en {tc}?",
  "Fragmento de {tc}", "¿Qué se escucha en el minuto {tc}?", "Dame el texto a partir del {tc} de {id}",
  "Salta al {tc} de {id}", "¿Qué dicen alrededor del minuto {tc}?", "En el {id}, ¿qué dicen en {tc}?",
  "Cita en el minuto {tc} del {id}", "¿Qué se menciona en el timecode {tc} del material {id}?",
  "A las {tc} del {id} ¿qué dicen?", "Qué dicen en {tc}"],
 "buscar_por_tema": [
  "Busca materiales sobre {tema}", "¿Hay videos de {tema}?", "Muéstrame material sobre {tema}",
  "Necesito algo donde hablen de {tema}", "Encuéntrame videos sobre {tema}", "¿Tienen material de {tema}?",
  "Busco grabaciones sobre {tema}", "Quiero ver todo lo que haya de {tema}", "Videos relacionados con {tema}",
  "Algo sobre {tema}", "Material de archivo sobre {tema}", "¿Qué tienen sobre {tema}?", "Busca {tema}",
  "Localiza material donde se hable de {tema}", "¿Existe algún video acerca de {tema}?", "Necesito imágenes de {tema}",
  "Dame los materiales que traten {tema}", "Busca noticias de {tema}", "¿Algún material sobre {tema} en el archivo?",
  "Estoy buscando contenido de {tema}", "Encuentra todo sobre {tema}", "Material acerca de {tema}"],
 "buscar_por_frase": [
  "¿En qué video dijeron «{frase}»?", "¿Quién dijo que {frase}?", "Busca la frase «{frase}»", "¿Dónde dijeron que {frase}?",
  "Necesito la declaración donde dicen «{frase}»", "Localiza la cita «{frase}»", "¿En qué material mencionaron que {frase}?",
  "Encuentra el fragmento que dice «{frase}»", "Quiero ubicar la frase exacta «{frase}»",
  "¿En qué entrevista dijeron que {frase}?", "¿Cuándo dijeron «{frase}»?", "Busca la declaración «{frase}»",
  "¿Hay algún video donde digan «{frase}»?", "¿En qué minuto dijeron que {frase}?", "Ubica la cita textual «{frase}»",
  "Declaración exacta: «{frase}»", "¿Dónde se menciona que {frase}?", "Rastrea quién afirmó que {frase}",
  "Busca en las transcripciones «{frase}»", "Alguien dijo que {frase}, ¿dónde fue?"],
 "buscar_por_persona": [
  "¿En qué materiales aparece {persona}?", "Busca videos donde sale {persona}", "¿Dónde aparece {persona}?",
  "Muéstrame las apariciones de {persona}", "Materiales con {persona}", "¿En qué videos sale {persona}?",
  "Encuentra entrevistas a {persona}", "¿Tienen material de {persona}?", "Busca a {persona} en el archivo",
  "¿Qué materiales hay con {persona}?", "Localiza apariciones de {persona}", "¿En cuáles videos entrevistaron a {persona}?",
  "Videos en los que participa {persona}", "¿Hay algo donde hable {persona}?", "Todo lo que tenga a {persona}",
  "¿Salió {persona} en algún material?", "Declaraciones de {persona}", "¿Se menciona a {persona} en algún video?",
  "Dónde se ve a {persona}", "Apariciones de {persona} en el acervo"],
 "buscar_por_fecha_tipo": [
  "Entrevistas ingresadas {rango}", "Muéstrame las {tipo_pl} de {rango}", "¿Qué {tipo_pl} ingresaron {rango}?",
  "Material nuevo de {rango}", "Lista de {tipo_pl} ingresadas {rango}", "{tipo_pl} de {anio}", "Cintas históricas de {anio}",
  "¿Qué ingresó {rango}?", "Filtra por {tipo} y {rango}", "Videos ingresados {rango}", "Dame las {tipo_pl} más recientes",
  "¿Hay {tipo_pl} nuevas {rango}?", "Busca {tipo_pl} del año {anio}", "Qué material llegó {rango}", "Muestra solo {tipo_pl}",
  "Materiales recibidos {rango}", "Material del año {anio}", "Últimas {tipo_pl} que entraron",
  "Quiero ver las {tipo_pl} ingresadas {rango}", "Filtrar por fecha de ingreso {rango}"],
 "material_relacionado": [
  "¿Hay más material como el {id}?", "Material relacionado con el {id}", "Muéstrame algo parecido al {id}",
  "¿Qué otros videos se parecen al {id}?", "Busca materiales similares al {id}", "Más contenido como {id}",
  "¿Hay algo relacionado con el {id}?", "Materiales con etiquetas en común con {id}", "¿Qué más tienen parecido al {id}?",
  "Recomiéndame videos similares al {id}", "Otros materiales del mismo tema que {id}",
  "¿Existe más material sobre lo mismo que el {id}?", "Algo similar al {id}", "Videos relacionados al {id}",
  "¿Qué más hay como este material?", "Muestra más de lo mismo", "Materiales parecidos a este",
  "Ver contenido relacionado con {id}", "¿Tienen otro material como el {id}?", "Busca más del mismo tema que el {id}"],
 "disponibilidad_validacion": [
  "¿Ya puedo consultar el {id}?", "¿En qué estado está el {id}?", "¿Ya está listo el {id}?",
  "¿Está validada la descripción del {id}?", "¿Ya se procesó el {id}?", "Estado del material {id}",
  "¿Cuándo estará listo el {id}?", "¿Se puede buscar el {id}?", "¿Ya fue aprobado el {id}?", "¿Sigue en proceso el {id}?",
  "¿Terminó de procesarse el {id}?", "¿Qué estatus tiene el {id}?", "¿Está disponible el {id}?",
  "¿El {id} está pendiente de revisión?", "¿Ya transcribieron el {id}?", "Avance de procesamiento del {id}",
  "¿Por qué no aparece el {id} en las búsquedas?", "¿Falló el procesamiento del {id}?",
  "Revisa si el {id} ya está completo", "¿Ya pasó la revisión humana el {id}?"],
 "guia_de_busqueda": [
  "¿Cómo puedo buscar en el acervo?", "¿Cómo busco una declaración?", "Ayuda", "¿Qué puedo preguntarte?",
  "¿Qué puedes hacer?", "¿Cómo se usa este asistente?", "Explícame cómo buscar materiales", "¿De qué formas puedo buscar?",
  "Quiero aprender a usar el buscador", "¿Qué tipos de búsqueda existen?", "Dame ejemplos de preguntas", "¿Por dónde empiezo?",
  "No sé cómo buscar", "¿Qué funciones tienes?", "Menú de opciones", "¿Cómo encuentro un video en el archivo?",
  "¿Cómo funciona la búsqueda?", "Instrucciones de uso", "¿Cómo consulto el archivo?", "Necesito ayuda para buscar",
  "¿Qué sabes hacer?", "¿Se puede buscar por persona o por frase?"],
 "corregir_o_reportar": [
  "El {id} tiene una descripción incorrecta", "Hay un error en la descripción del {id}", "Quiero reportar un problema con el {id}",
  "¿Cómo corrijo la descripción del {id}?", "La transcripción del {id} está mal", "No encuentro un material que debería estar",
  "El {id} no aparece en el sistema", "Las etiquetas del {id} están equivocadas", "¿Cómo reporto un error?",
  "Necesito hablar con soporte", "Se quedó atorado el {id}", "El nombre de la persona en {id} está mal escrito",
  "Quiero editar la información del {id}", "Detecté un dato incorrecto en {id}", "¿Cómo apruebo la descripción del {id}?",
  "Falta un material en el archivo", "La ficha del {id} tiene datos erróneos", "Reportar falla",
  "El resumen del {id} no coincide con el video", "¿Dónde corrijo una etiqueta?", "Algo no funciona con el {id}"],
 "describir_imagen": [
  "¿Qué se ve en esta imagen?", "Clasifica esta imagen", "¿Qué tipo de escena es esta foto?", "Analiza la imagen que subí",
  "Describe esta captura del video", "¿Qué tipo de toma es este fotograma?", "Identifica la escena de esta imagen",
  "¿A qué categoría pertenece esta imagen?", "Te mando un fotograma, ¿qué escena es?", "Mira esta foto y dime qué es",
  "¿Es una conferencia de prensa esta imagen?", "¿Qué muestra este frame?", "Dime de qué tipo es esta imagen",
  "Revisa esta imagen", "¿Qué escena aparece en la foto adjunta?", "Interpreta esta imagen",
  "¿Qué categoría visual tiene esta captura?", "Busca materiales parecidos a esta imagen",
  "¿Qué materiales tienen una escena como esta imagen?", "Con esta foto, ¿qué tipo de material es?",
  "Clasifica el fotograma adjunto", "Analiza esta toma", "¿Qué ves en esta fotografía?",
  "Esta imagen, ¿de qué tipo de escena es?", "Quiero saber qué escena es esta"],
 "fuera_de_alcance": [
  "¿Quién ganó el partido de ayer?", "¿Qué clima hará mañana?", "Cuéntame un chiste", "¿Cuál es la capital de Francia?",
  "Recomiéndame una película", "¿Cuánto cuesta un boleto de avión?", "Escribe un poema", "¿Cómo hago arroz?",
  "¿Qué hora es?", "¿Cuál es el precio del dólar?", "Resuelve esta ecuación", "Traduce esta frase al inglés",
  "¿Quién es el presidente de Argentina?", "Dame consejos de salud", "¿Cómo cambio la llanta del coche?",
  "¿Cuál es tu color favorito?", "¿Qué opinas de la política?", "Programa un recordatorio", "Reserva un restaurante",
  "Dime la receta del pozole", "¿Dónde queda el aeropuerto?", "¿Cuál es el mejor celular?",
  "Explícame la teoría de la relatividad", "Mándame un correo", "¿Cuántos años tienes?", "Ponme música",
  "¿Cómo se juega ajedrez?", "¿Cuál es la población de México?"],
}

# Cortesía: frases completas (saludo, despedida, agradecimiento); cada una es su propia "plantilla"
CORTESIA = [
 "Hola", "Buenos días", "Buenas tardes", "Buenas noches", "Hola, buen día", "Hey", "Saludos", "Qué tal", "Hola asistente",
 "Gracias", "Muchas gracias", "Te agradezco", "Muy amable", "Gracias por la ayuda", "Adiós", "Hasta luego", "Nos vemos",
 "Eso es todo", "Hasta pronto", "Chao", "Bye", "Me despido", "Listo, gracias", "Perfecto, gracias",
 "Excelente, muchas gracias", "Ok gracias", "Hola, ¿cómo estás?", "Buen día", "Muchísimas gracias",
 "Gracias, hasta luego", "Que tengas buen día", "Hasta mañana", "Nos vemos luego", "Hola de nuevo", "Muy bien, gracias",
 "Genial, gracias", "Mil gracias", "Hola, buenas", "Saludos cordiales", "Gracias, eso era todo", "Ya no necesito nada más",
 "Es todo por ahora", "Hola equipo", "Buenos días, asistente", "Gracias, adiós"]

# Prueba independiente: frases escritas a mano con redacción distinta a las plantillas (6 por intención)
INDEPENDIENTE: dict[str, list[str]] = {
 "buscar_por_id": ["Necesito conocer el título y la fecha de ingreso del EN10388", "¿Me pasas la información básica de NT20112?",
   "Quiero saber cuánto tiempo dura el material RB30077", "¿Qué clase de archivo es HI40015?",
   "Consulta el registro VV50003, por favor", "Revisa el material con ID NT20045 y dime sus datos"],
 "resumen_material": ["¿Puedes contarme brevemente qué muestra el EN10391?", "Necesito una sinopsis corta del NT20112",
   "¿Cuál es el asunto principal del material NT20045?", "Dame un panorama de lo que trata el EN10388",
   "¿Qué se aborda en el video EN10391?", "¿Me haces un extracto del NT20045?"],
 "personas_en_material": ["¿Se logra identificar a algún entrevistado en el EN10388?", "En el NT20045, ¿quién es la persona que presenta?",
   "¿Quién aparece rotulado en el video EN10391?", "¿Hay nombres de personas en el material NT20112?",
   "¿Podrías decirme qué personas intervienen en el RB30077?", "¿Se ve a alguna autoridad en el NT20112?"],
 "lugares_y_elementos_visuales": ["¿En qué escenario se desarrolla el EN10391?", "¿Qué se alcanza a ver en las imágenes del NT20112?",
   "Cuéntame cómo es la ambientación visual del NT20045", "¿Qué ubicaciones aparecen en el material EN10388?",
   "¿Aparecen gráficos o letreros en el NT20045?", "Detalla el contenido visual del NT20112"],
 "transcripcion_material": ["Necesito leer lo que se habla en el NT20045", "¿Me muestras el texto de lo que dicen en el EN10388?",
   "Quiero revisar las palabras del entrevistado en el EN10391", "¿Cuál es la transcripción disponible del NT20112?",
   "Pásame lo dicho en el audio del NT20045", "Sácame lo que se escucha en el material EN10388"],
 "fragmento_por_timecode": ["¿Qué comentan cuando va en 12:05 el EN10388?", "Necesito saber lo dicho al minuto 05:32 del NT20045",
   "¿Qué declaración se escucha a las 00:09:15 en EN10391?", "Muéstrame el texto exacto en 07:40 del NT20112",
   "Qué se menciona en el instante 21:48", "¿Qué dice la persona hacia el minuto 03:10 del EN10388?"],
 "buscar_por_tema": ["Quisiera revisar grabaciones que tengan que ver con lluvias fuertes", "¿Existe archivo en el que se trate el tema de hospitales?",
   "Estoy preparando una nota sobre transporte público, ¿qué material tienen?", "¿Qué hay guardado acerca de accidentes de tránsito?",
   "Necesito tomas relacionadas con cambio climático", "Ayúdame a ubicar contenido sobre tarifas del metro"],
 "buscar_por_frase": ["Recuerdo que alguien afirmó que no subirían las tarifas, ¿en qué material fue?",
   "Necesito ubicar el momento exacto en que dijeron «cien camas»", "¿En cuál grabación se escucha la frase «mochila de emergencia»?",
   "¿Quién pronunció que la velocidad es la principal causa de accidentes?", "Encuentra la declaración que habla de rutas de evacuación",
   "Me suena que dijeron «reducir veinte minutos los traslados», ¿dónde?"],
 "buscar_por_persona": ["¿Tienes grabaciones donde participe Laura Mendoza?", "Necesito todos los materiales de Ricardo Salas",
   "¿En qué piezas del archivo interviene Ana Torres?", "¿Cuántos videos hay con la entrevistada Laura Mendoza?",
   "Ubica los clips donde se ve a Carlos Vega", "¿Dónde puedo encontrar intervenciones de Ricardo Salas?"],
 "buscar_por_fecha_tipo": ["¿Cuáles conferencias entraron en los últimos días?", "Enséñame lo ingresado el lunes de esta semana",
   "Necesito las entrevistas del mes en curso", "¿Qué cintas antiguas de 1998 hay disponibles?",
   "Filtra emisiones en vivo recibidas ayer", "Listado de materiales que llegaron hoy"],
 "material_relacionado": ["¿Qué otros materiales tocan el mismo asunto que el EN10388?", "Recomiéndame contenido emparentado con el NT20045",
   "¿Hay piezas análogas al EN10391 en el archivo?", "Quiero explorar más videos del estilo del NT20112",
   "Sugiere otros materiales conectados con este", "¿Se parece a algo más el material EN10388?"],
 "disponibilidad_validacion": ["¿Cómo va el procesamiento del NT20150?", "¿Puedo buscar ya por el contenido del RB30077?",
   "¿El NT20112 ya cuenta con aprobación?", "Me urge saber si el HI40015 terminó de analizarse",
   "¿Sigue en cola el NT20150 o ya avanzó?", "¿Qué pasó con el VV50003, ya quedó?"],
 "guia_de_busqueda": ["Soy nuevo aquí, ¿cómo le hago para encontrar cosas?", "¿Qué criterios puedo usar para localizar un material?",
   "Muéstrame ejemplos de consultas válidas", "No entiendo cómo funciona esto, ¿me orientas?",
   "¿Puedo buscar por fecha o por persona?", "¿Cuáles son las opciones del asistente?"],
 "corregir_o_reportar": ["Noté que la etiqueta del NT20045 no corresponde con el video", "El texto transcrito del EN10388 tiene errores, ¿qué hago?",
   "Un material que subimos ayer no aparece en el catálogo", "Necesito avisar de una falla en la ficha del NT20112",
   "¿A quién le notifico una descripción equivocada?", "El sistema marca error en el VV50003, quiero levantar un reporte"],
 "cortesia": ["Muy buenas, qué gusto saludarte", "Te lo agradezco un montón", "Con esto me quedo, que tengas excelente día",
   "Hola, buenas tardes a todos", "Gracias por tu paciencia", "Nos hablamos después, cuídate"],
 "describir_imagen": ["Subo una foto y quiero que me digas de qué escena se trata", "¿Puedes interpretar este fotograma que adjunto?",
   "Necesito que revises esta captura y la categorices", "¿Qué clase de escena es la que aparece en la imagen?",
   "Con base en esta imagen, ¿qué materiales del archivo se le parecen?", "Dime qué tipo de plano es el de la fotografía"],
 "fuera_de_alcance": ["¿Me recomiendas un buen restaurante cerca?", "¿A cuánto está el euro hoy?", "Platícame sobre la historia del futbol",
   "¿Puedes ayudarme a escribir una carta de renuncia?", "¿Qué películas están en cartelera?", "Calcula cuánto es el quince por ciento de 840"],
}

PREFIJOS = ["Oye, ", "Por favor, ", "Disculpa, ", "Hola, ", "Una duda: ", "Necesito saber: ", "Mira, "]
SUFIJOS = [", por favor", " gracias", " urgente", " por favor"]


def _rellenar(plantilla: str, rng: random.Random) -> str:
    tipo, tipo_pl = rng.choice(TIPOS)
    valores = {"id": rng.choice(IDS), "tema": rng.choice(TEMAS), "persona": rng.choice(PERSONAS), "tc": rng.choice(TIEMPOS),
               "tipo": tipo, "tipo_pl": tipo_pl, "rango": rng.choice(RANGOS), "anio": rng.choice(ANIOS), "frase": rng.choice(FRASES)}
    return plantilla.format(**valores)


def _ruido(texto: str, rng: random.Random) -> str:
    """Añade muletillas y, rara vez, un error de dedo (borra o intercambia letras en una palabra larga)."""
    if rng.random() < 0.20:
        texto = rng.choice(PREFIJOS) + texto[0].lower() + texto[1:]
    if rng.random() < 0.12:
        texto = texto.rstrip("?") + rng.choice(SUFIJOS)
    if rng.random() < 0.10:
        palabras = texto.split(" ")
        candidatas = [i for i, p in enumerate(palabras) if len(p) >= 6 and p.isalpha()]
        if candidatas:
            i = rng.choice(candidatas); p = palabras[i]; k = rng.randrange(1, len(p) - 1)
            palabras[i] = p[:k] + p[k + 1:] if rng.random() < 0.5 else p[:k] + p[k + 1] + p[k] + p[k + 2:]
            texto = " ".join(palabras)
    return texto


def generar() -> list[dict]:
    rng = random.Random(SEMILLA)
    filas, vistos = [], set()
    for intencion, plantillas in PLANTILLAS.items():
        # Se reserva cada quinta plantilla para prueba (≈ 20 %) => partición por plantilla
        reparto = {i: ("test" if i % 5 == 4 else "train") for i in range(len(plantillas))}
        for pid in range(len(plantillas)):
            filas_pid = 0
            for _ in range(200):  # intentos hasta llegar a la cuota por plantilla
                if filas_pid >= max(1, MUESTRAS_POR_INTENCION // len(plantillas) + 1):
                    break
                texto = _ruido(_rellenar(plantillas[pid], rng), rng)
                if texto in vistos:
                    continue
                vistos.add(texto); filas_pid += 1
                filas.append({"texto": texto, "intencion": intencion, "plantilla_id": f"{intencion}#{pid}", "particion": reparto[pid]})
    # Cortesía: cada frase es una plantilla; se reparte igual (cada quinta a prueba) y se repite con ruido
    for i, base in enumerate(CORTESIA):
        part = "test" if i % 5 == 4 else "train"
        for k in range(2):
            texto = base if k == 0 else _ruido(base, rng)
            if texto in vistos:
                continue
            vistos.add(texto)
            filas.append({"texto": texto, "intencion": "cortesia", "plantilla_id": f"cortesia#{i}", "particion": part})
    # Evita fuga con la prueba independiente
    indep = {t for lst in INDEPENDIENTE.values() for t in lst}
    return [f for f in filas if f["texto"] not in indep]


def main() -> None:
    carpeta = Path(__file__).resolve().parent / "datos"
    carpeta.mkdir(exist_ok=True)
    filas = generar()
    with open(carpeta / "intenciones_dataset.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["texto", "intencion", "plantilla_id", "particion"]); w.writeheader(); w.writerows(filas)
    with open(carpeta / "intenciones_prueba_independiente.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f); w.writerow(["texto", "intencion"])
        for intencion, lst in INDEPENDIENTE.items():
            for t in lst:
                w.writerow([t, intencion])
    n_tr = sum(1 for f in filas if f["particion"] == "train"); n_te = len(filas) - n_tr
    print(f"Dataset: {len(filas)} frases ({n_tr} train, {n_te} test por plantilla) en {len(PLANTILLAS) + 1} intenciones")
    print(f"Prueba independiente: {sum(len(v) for v in INDEPENDIENTE.values())} frases")


if __name__ == "__main__":
    main()
```

## A.2 `ml/preprocesamiento.py`

```python
"""Preprocesamiento de texto en español para el clasificador de intenciones (Avance 2).

Pasos (en este orden):
  1. Normalización: minúsculas, eliminación de acentos (NFD), reemplazo de IDs y tiempos por marcadores.
  2. Tokenización: palabras alfanuméricas con expresión regular.
  3. Eliminación de stopwords: lista propia que CONSERVA palabras con valor para la intención
     (qué, quién, dónde, cómo, cuándo, minuto, aparece, dice, etc.).
  4. Stemming (raíz): SnowballStemmer('spanish') de NLTK si está instalado; si no, un reductor de
     sufijos sencillo incluido aquí (menos preciso). El script informa cuál se usó (STEMMER_USADO).

Marcadores: los IDs (NT20045) y tiempos (21:48, 00:09:15) no aportan significado por sí mismos, pero SÍ
indican la intención (un ID sugiere consulta de ficha; un tiempo sugiere fragmento por timecode),
por eso se sustituyen por los tokens «idmaterial» y «timecode» en lugar de eliminarse.
"""
from __future__ import annotations

import re
import unicodedata

try:  # NLTK es la opción del proyecto; si no está disponible se usa el reductor propio
    from nltk.stem.snowball import SpanishStemmer
    _SNOWBALL = SpanishStemmer()
    STEMMER_USADO = "NLTK SnowballStemmer('spanish')"
except Exception:  # pragma: no cover - depende del entorno
    _SNOWBALL = None
    STEMMER_USADO = "reductor de sufijos propio (NLTK no disponible)"

# Stopwords: artículos, preposiciones, conjunciones y pronombres de bajo valor.
# NO se incluyen palabras interrogativas ni verbos de consulta porque distinguen intenciones.
STOPWORDS = {
    "el", "la", "los", "las", "un", "una", "unos", "unas", "uno", "lo", "al", "del", "de", "en", "con", "por", "para",
    "a", "y", "o", "u", "e", "se", "me", "te", "le", "les", "nos", "mi", "mis", "tu", "tus", "su", "sus",
    "es", "son", "este", "esta", "estos", "estas", "ese", "esa", "eso", "esto", "muy", "tambien", "pero",
    "entre", "porque", "pues", "ahi", "aqui", "oye", "disculpa", "favor", "urgente", "mira",
}
# Se conservan a propósito (aportan significado a la intención): que, quien, donde, como, cuando, cuanto, hay,
# mas, ya, sobre, hasta, desde, si, no, hola, gracias, minuto, aparece, dice, etc.

_RE_ID = re.compile(r"\b[a-z]{2}\d{5}\b", re.I)
_RE_TIEMPO = re.compile(r"\b\d{1,2}:\d{2}(?::\d{2})?\b")
_RE_TOKEN = re.compile(r"[a-z0-9]+")


def quitar_acentos(texto: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def normalizar(texto: str) -> str:
    """Minúsculas, sin acentos, con IDs y tiempos sustituidos por marcadores."""
    texto = _RE_ID.sub(" idmaterial ", texto)
    texto = _RE_TIEMPO.sub(" timecode ", texto)
    return quitar_acentos(texto.lower())


def tokenizar(texto: str) -> list[str]:
    return _RE_TOKEN.findall(texto)


_SUFIJOS = ["amientos", "imientos", "aciones", "uciones", "amiento", "imiento", "mente", "adoras", "adores",
            "ancias", "encias", "acion", "ucion", "adora", "ador", "ables", "ibles", "istas", "ando", "iendo",
            "aron", "ieron", "aban", "idas", "idos", "adas", "ados", "ante", "able", "ible", "ista", "ar", "er", "ir",
            "ado", "ido", "ada", "ida", "an", "en", "as", "es", "os", "a", "e", "o", "s"]


def _reductor_propio(token: str) -> str:
    if len(token) <= 4 or token.isdigit():
        return token
    for suf in _SUFIJOS:
        if token.endswith(suf) and len(token) - len(suf) >= 3:
            return token[: -len(suf)]
    return token


def raiz(token: str) -> str:
    if token in {"idmaterial", "timecode"}:
        return token
    return _SNOWBALL.stem(token) if _SNOWBALL else _reductor_propio(token)


def preprocesar(texto: str, usar_stopwords: bool = True, usar_stemming: bool = True) -> list[str]:
    tokens = tokenizar(normalizar(texto))
    if usar_stopwords:
        tokens = [t for t in tokens if t not in STOPWORDS]
    if usar_stemming:
        tokens = [raiz(t) for t in tokens]
    return tokens


def preprocesar_a_texto(texto: str) -> str:
    """Devuelve los tokens unidos por espacio (formato que consume TfidfVectorizer)."""
    return " ".join(preprocesar(texto))


if __name__ == "__main__":
    ejemplos = ["¿En qué minuto dijeron que no habrá aumento en la tarifa del metro? (NT20045, 21:48)",
                "Busca materiales sobre inundaciones", "¿Aparece alguna persona en el EN10388?"]
    print("Stemmer:", STEMMER_USADO)
    for e in ejemplos:
        n = normalizar(e); t = tokenizar(n); s = [x for x in t if x not in STOPWORDS]
        print(f"\nOriginal      : {e}\nNormalizado   : {n}\nTokens        : {t}\nSin stopwords : {s}\nRaíces        : {[raiz(x) for x in s]}")
```

## A.3 `ml/clasificador_intenciones.py`

```python
"""Entrenamiento y evaluación del clasificador de intenciones (Avance 2).

Pipeline:  preprocesamiento -> TF-IDF (uni y bigramas) -> MultinomialNB  |  LinearSVC
Evaluación:
  - Validación cruzada estratificada (5 pliegues) sobre el conjunto de entrenamiento.
  - Prueba 1: partición por plantilla (frases con estructura no vista en el entrenamiento).
  - Prueba 2: frases independientes escritas a mano con otra redacción (la más exigente).
Salidas en ./resultados_texto/: metricas_texto.json, matriz_confusion_*.png, errores_*.csv,
reporte_*.txt  y  ./modelos/clasificador_intenciones.joblib (SVM entrenado con train + test por plantilla).

Uso:  python clasificador_intenciones.py
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (accuracy_score, classification_report, confusion_matrix,
                             precision_recall_fscore_support)
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from preprocesamiento import STEMMER_USADO, preprocesar_a_texto

RAIZ = Path(__file__).resolve().parent
DATOS, SALIDA, MODELOS = RAIZ / "datos", RAIZ / "resultados_texto", RAIZ / "modelos"
SEMILLA = 42


def construir(modelo: str) -> Pipeline:
    vec = TfidfVectorizer(preprocessor=None, tokenizer=str.split, token_pattern=None, lowercase=False,
                          ngram_range=(1, 2), sublinear_tf=True, min_df=1)
    clf = MultinomialNB(alpha=0.1) if modelo == "Naive Bayes" else LinearSVC(C=1.0, random_state=SEMILLA)
    return Pipeline([("tfidf", vec), ("clf", clf)])


def metricas(y_real, y_pred) -> dict:
    p, r, f, _ = precision_recall_fscore_support(y_real, y_pred, average="macro", zero_division=0)
    return {"accuracy": accuracy_score(y_real, y_pred), "precision_macro": p, "recall_macro": r, "f1_macro": f}


def guardar_matriz(y_real, y_pred, clases, titulo, ruta):
    cm = confusion_matrix(y_real, y_pred, labels=clases)
    fig, ax = plt.subplots(figsize=(9.5, 8))
    ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(clases))); ax.set_yticks(range(len(clases)))
    ax.set_xticklabels(clases, rotation=60, ha="right", fontsize=8); ax.set_yticklabels(clases, fontsize=8)
    for i in range(len(clases)):
        for j in range(len(clases)):
            if cm[i, j]:
                ax.text(j, i, cm[i, j], ha="center", va="center", fontsize=7,
                        color="white" if cm[i, j] > cm.max() / 2 else "black")
    ax.set_xlabel("Intención predicha"); ax.set_ylabel("Intención real"); ax.set_title(titulo)
    fig.tight_layout(); fig.savefig(ruta, dpi=150); plt.close(fig)
    return cm


def main() -> None:
    SALIDA.mkdir(exist_ok=True); MODELOS.mkdir(exist_ok=True)
    df = pd.read_csv(DATOS / "intenciones_dataset.csv")
    ind = pd.read_csv(DATOS / "intenciones_prueba_independiente.csv")
    for d in (df, ind):
        d["proc"] = d["texto"].map(preprocesar_a_texto)
    train, test = df[df.particion == "train"], df[df.particion == "test"]
    clases = sorted(df.intencion.unique())
    print(f"Stemmer: {STEMMER_USADO}\nTrain {len(train)} | Test por plantilla {len(test)} | Independiente {len(ind)} | Intenciones {len(clases)}")

    resultado = {"stemmer": STEMMER_USADO, "n_train": len(train), "n_test_plantilla": len(test),
                 "n_test_independiente": len(ind), "n_intenciones": len(clases), "modelos": {}}
    skf = StratifiedKFold(5, shuffle=True, random_state=SEMILLA)
    for nombre in ("Naive Bayes", "SVM (LinearSVC)"):
        modelo = construir("Naive Bayes" if nombre == "Naive Bayes" else "svm")
        cv = cross_val_score(modelo, train.proc, train.intencion, cv=skf, scoring="f1_macro")
        modelo.fit(train.proc, train.intencion)
        r = {"cv_f1_macro_media": cv.mean(), "cv_f1_macro_desv": cv.std()}
        slug = "nb" if nombre == "Naive Bayes" else "svm"
        for etiqueta, datos in (("plantilla", test), ("independiente", ind)):
            pred = modelo.predict(datos.proc)
            r[etiqueta] = metricas(datos.intencion, pred)
            guardar_matriz(datos.intencion, pred, clases, f"{nombre} · prueba {etiqueta}", SALIDA / f"matriz_confusion_{slug}_{etiqueta}.png")
            rep = classification_report(datos.intencion, pred, labels=clases, zero_division=0, digits=3)
            (SALIDA / f"reporte_{slug}_{etiqueta}.txt").write_text(rep, encoding="utf-8")
            if etiqueta == "independiente":
                r["por_intencion_independiente"] = classification_report(
                    datos.intencion, pred, labels=clases, zero_division=0, output_dict=True)
            err = datos.assign(predicha=pred)
            err[err.intencion != err.predicha][["texto", "intencion", "predicha"]].to_csv(
                SALIDA / f"errores_{slug}_{etiqueta}.csv", index=False, encoding="utf-8")
        resultado["modelos"][nombre] = r
        print(f"\n== {nombre} ==  CV F1 macro {cv.mean():.3f} ± {cv.std():.3f}")
        for etiqueta in ("plantilla", "independiente"):
            m = r[etiqueta]
            print(f"  {etiqueta:<14} acc {m['accuracy']:.3f} | P {m['precision_macro']:.3f} | R {m['recall_macro']:.3f} | F1 {m['f1_macro']:.3f}")

    # Modelo final para integrar: SVM entrenado con todo el conjunto generado (train + test por plantilla)
    final = construir("svm").fit(df.proc, df.intencion)
    joblib.dump({"pipeline": final, "clases": clases, "stemmer": STEMMER_USADO}, MODELOS / "clasificador_intenciones.joblib")
    (SALIDA / "metricas_texto.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=2, default=float), encoding="utf-8")
    print(f"\nModelo guardado en {MODELOS / 'clasificador_intenciones.joblib'}\nMétricas en {SALIDA}")


if __name__ == "__main__":
    main()
```

## A.4 `ml/ablacion_preprocesamiento.py`

```python
"""Ablación del preprocesamiento (Avance 2): reentrena el SVM quitando un paso cada vez y mide el efecto.

Configuraciones: completo | sin stopwords | sin stemming | sin stopwords ni stemming.
Salidas: resultados_texto/ablacion.json  (accuracy y F1 macro en la prueba por plantilla y en la independiente).
Uso:  python ablacion_preprocesamiento.py
"""
from __future__ import annotations
import json
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, f1_score
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from preprocesamiento import STEMMER_USADO, preprocesar

RAIZ = Path(__file__).resolve().parent
CONFIGS = {"completo": (True, True), "sin_stopwords": (False, True), "sin_stemming": (True, False), "sin_stopwords_ni_stemming": (False, False)}


def main() -> None:
    df = pd.read_csv(RAIZ / "datos" / "intenciones_dataset.csv")
    ind = pd.read_csv(RAIZ / "datos" / "intenciones_prueba_independiente.csv")
    tr, te = df[df.particion == "train"], df[df.particion == "test"]
    salida = {"stemmer": STEMMER_USADO, "configuraciones": {}}
    for nombre, (sw, st) in CONFIGS.items():
        f = lambda t: " ".join(preprocesar(t, sw, st))
        modelo = Pipeline([("v", TfidfVectorizer(tokenizer=str.split, token_pattern=None, lowercase=False, ngram_range=(1, 2), sublinear_tf=True)),
                           ("c", LinearSVC(random_state=42))]).fit(tr.texto.map(f), tr.intencion)
        r = {}
        for etiqueta, datos in (("plantilla", te), ("independiente", ind)):
            y = modelo.predict(datos.texto.map(f))
            r[etiqueta] = {"accuracy": round(accuracy_score(datos.intencion, y), 3), "f1_macro": round(f1_score(datos.intencion, y, average="macro"), 3)}
        salida["configuraciones"][nombre] = r
        print(f"{nombre:<28} plantilla {r['plantilla']} | independiente {r['independiente']}")
    (RAIZ / "resultados_texto").mkdir(exist_ok=True)
    (RAIZ / "resultados_texto" / "ablacion.json").write_text(json.dumps(salida, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
```

## A.5 `ml/exportar_modelo_js.py`

```python
"""Exporta el clasificador de intenciones entrenado (TF-IDF + LinearSVC) a JSON para usarlo en JavaScript (React).

Salidas (carpeta exportado_js/):
  - modeloIntenciones.json : clases, vocabulario (n-gramas -> índice), idf, coeficientes (clases x vocabulario) e intercepto
  - paridad.json           : textos de prueba con tokens esperados, clase predicha y puntajes, para comprobar en Jest que
                             el preprocesamiento y el clasificador de JavaScript dan lo mismo que Python.

Cálculo que debe repetir JavaScript:  tf = 1 + ln(conteo) ; x = tf * idf ; x = x / ||x||2 ; puntaje_c = coef_c · x + intercepto_c
Uso:  python exportar_modelo_js.py
"""
from __future__ import annotations
import json, math
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from preprocesamiento import STEMMER_USADO, STOPWORDS, preprocesar, preprocesar_a_texto

RAIZ = Path(__file__).resolve().parent
SALIDA = RAIZ / "exportado_js"


def puntajes_manual(modelo: dict, texto: str) -> list[float]:
    """Réplica en Python del cálculo que hará JavaScript (sirve para verificar la exportación)."""
    tokens = preprocesar(texto)
    gramas = tokens + [f"{a} {b}" for a, b in zip(tokens, tokens[1:])]
    conteo: dict[int, int] = {}
    for g in gramas:
        i = modelo["vocabulario"].get(g)
        if i is not None:
            conteo[i] = conteo.get(i, 0) + 1
    x = {i: (1 + math.log(c)) * modelo["idf"][i] for i, c in conteo.items()}
    norma = math.sqrt(sum(v * v for v in x.values())) or 1.0
    return [sum(modelo["coef"][c][i] * v / norma for i, v in x.items()) + modelo["intercepto"][c]
            for c in range(len(modelo["clases"]))]


def main() -> None:
    SALIDA.mkdir(exist_ok=True)
    paquete = joblib.load(RAIZ / "modelos" / "clasificador_intenciones.joblib")
    pipe = paquete["pipeline"]; vec, clf = pipe.named_steps["tfidf"], pipe.named_steps["clf"]
    modelo = {
        "version": "avance2", "stemmer": STEMMER_USADO, "clases": [str(c) for c in clf.classes_],
        "vocabulario": {k: int(v) for k, v in vec.vocabulary_.items()},
        "idf": [round(float(v), 6) for v in vec.idf_],
        "coef": [[round(float(w), 5) for w in fila] for fila in clf.coef_],
        "intercepto": [round(float(b), 5) for b in clf.intercept_],
        "stopwords": sorted(STOPWORDS),
    }
    (SALIDA / "modeloIntenciones.json").write_text(json.dumps(modelo, ensure_ascii=False), encoding="utf-8")
    ind = pd.read_csv(RAIZ / "datos" / "intenciones_prueba_independiente.csv")
    muestras = list(ind.texto.sample(25, random_state=7)) + ["¿Qué escena es esta imagen?", "Hola", "¿Qué dicen en el minuto 21:48 del NT20045?"]
    paridad, max_dif = [], 0.0
    for t in muestras:
        p = puntajes_manual(modelo, t); ref = pipe.decision_function([preprocesar_a_texto(t)])[0]
        max_dif = max(max_dif, float(np.max(np.abs(np.array(p) - ref))))
        paridad.append({"texto": t, "tokens": preprocesar(t), "clase": modelo["clases"][int(np.argmax(p))],
                        "puntajes": [round(v, 4) for v in p]})
        assert paridad[-1]["clase"] == str(pipe.predict([preprocesar_a_texto(t)])[0]), t
    (SALIDA / "paridad.json").write_text(json.dumps(paridad, ensure_ascii=False, indent=1), encoding="utf-8")
    kb = (SALIDA / "modeloIntenciones.json").stat().st_size / 1024
    print(f"Modelo exportado: {len(modelo['clases'])} clases, {len(modelo['vocabulario'])} atributos, {kb:.0f} KB")
    print(f"Verificación de la exportación: diferencia máxima de puntajes frente a scikit-learn = {max_dif:.5f}")


if __name__ == "__main__":
    main()
```

## A.6 `ml/requirements.txt` y `ml/Dockerfile`

```text
scikit-learn>=1.3
pandas
numpy
matplotlib
joblib
nltk>=3.8
pillow
requests
```

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "--version"]
```

Servicio para `docker-compose.yml` (adáptalo al formato del archivo existente):

```yaml
  ml:
    build: ./ml
    working_dir: /app
    volumes:
      - ./ml:/app
```

## A.7 `src/clasificador/clasificadorIntenciones.js`

Probado contra Python (28 de 28 clases y tokens idénticos con el mismo preprocesamiento). `raiz` es la función de stemming de `textoUtils.js`. Uso: `crearClasificador(modeloJSON, (t) => stemmer.stem(t))`.

```javascript
/**
 * clasificadorIntenciones.js
 * Qué hace: clasifica la intención de un mensaje con el modelo TF-IDF + SVM lineal entrenado en Python y exportado a JSON.
 * Recibe: el texto del usuario (y, al crear el clasificador, el modelo JSON y una función `raiz(token)` para el stemming).
 * Devuelve: { intencion, puntaje, margen, puntajes, tokens } (puntajes = las tres mayores).
 * Se relaciona con: ml/exportar_modelo_js.py (genera el JSON), textoUtils.js (stemmer Snowball) y chatbot.js (lo consume).
 * Debe dar lo mismo que Python: lo comprueba src/tests/paridad.test.js con exportado_js/paridad.json.
 */

/** Quita acentos y pasa a minúsculas; sustituye IDs y tiempos por marcadores (igual que preprocesamiento.py). */
export function normalizarParaModelo(texto) {
  const sinMarcas = texto
    .replace(/\b[a-zA-Z]{2}\d{5}\b/g, ' idmaterial ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' timecode ');
  return sinMarcas.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Crea un clasificador a partir del modelo exportado.
 * @param {object} modelo contenido de modeloIntenciones.json
 * @param {(token: string) => string} raiz función de stemming (Snowball español)
 * @returns {{ preprocesar: Function, clasificar: Function }}
 */
export function crearClasificador(modelo, raiz) {
  const stop = new Set(modelo.stopwords);
  const marcadores = new Set(['idmaterial', 'timecode']);

  /** Normaliza, tokeniza (`[a-z0-9]+`), quita stopwords y reduce cada palabra a su raíz. */
  function preprocesar(texto) {
    const tokens = normalizarParaModelo(texto).match(/[a-z0-9]+/g) || [];
    return tokens.filter((t) => !stop.has(t)).map((t) => (marcadores.has(t) ? t : raiz(t)));
  }

  /** Devuelve la intención con mayor puntaje del SVM y los datos para explicar la decisión. */
  function clasificar(texto) {
    const tokens = preprocesar(texto);
    const gramas = tokens.concat(tokens.slice(1).map((t, i) => `${tokens[i]} ${t}`));
    const conteo = new Map();
    gramas.forEach((g) => {
      const i = modelo.vocabulario[g];
      if (i !== undefined) conteo.set(i, (conteo.get(i) || 0) + 1);
    });
    const x = new Map();
    let norma2 = 0;
    conteo.forEach((c, i) => {
      const v = (1 + Math.log(c)) * modelo.idf[i];
      x.set(i, v);
      norma2 += v * v;
    });
    const norma = Math.sqrt(norma2) || 1;
    const puntajes = modelo.clases.map((clase, c) => {
      let s = modelo.intercepto[c];
      x.forEach((v, i) => { s += (modelo.coef[c][i] * v) / norma; });
      return { clase, puntaje: s };
    });
    const orden = [...puntajes].sort((a, b) => b.puntaje - a.puntaje);
    return {
      intencion: orden[0].clase,
      puntaje: orden[0].puntaje,
      margen: orden[0].puntaje - orden[1].puntaje,
      puntajes: orden.slice(0, 3),
      tokens,
    };
  }
  return { preprocesar, clasificar };
}
```

## Nota para A.8 a A.12 (componente visual)

Estos scripts se ejecutan **desde `ml/`** (por ejemplo `python visual/clasificador_visual.py`), porque usan rutas relativas `modelos/`, `resultados_visual/`, `imagenes_raw/` y `dataset_visual/`. Necesitan internet (A.8), TensorFlow y GPU (A.10 a A.12): en Colab, no en el host. `evaluacion_visual.py --autoprueba` sí puede correr en el contenedor `ml` sin TensorFlow. Las `requirements` de Colab: `tensorflow` ya viene instalado.

## A.8 `ml/visual/descargar_imagenes_commons.py`

```python
"""Descarga imágenes de Wikimedia Commons para el conjunto visual (Avance 2).

Para cada clase se consultan varias búsquedas en la API pública de Commons, se descargan miniaturas
(ancho 640 px) de archivos JPG/PNG y se guarda un manifest.csv con autor, licencia y URL de origen,
para poder citar y respetar cada licencia. Se descartan imágenes cuya licencia no sea de tipo Creative Commons
o dominio público.

Requiere conexión a internet (se ejecuta en Colab/equipo del estudiante, NO en el entorno donde se redactó el documento).
Uso:  python descargar_imagenes_commons.py --por-clase 120 --salida imagenes_raw
"""
from __future__ import annotations

import argparse, csv, re, time
from pathlib import Path

import requests

API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "AsistenteArchivoUniversidad/1.0 (proyecto académico)"}

BUSQUEDAS = {
    "conferencia_prensa": ["press conference podium microphones", "rueda de prensa", "news conference politician"],
    "entrevista_estudio": ["television interview studio", "news anchor studio", "entrevista televisión estudio"],
    "exteriores_calle": ["street reporter live broadcast", "city street traffic", "reportero en la calle"],
    "ceremonia_evento": ["official ceremony", "award ceremony stage", "ceremonia oficial"],
    "multitud_manifestacion": ["protest crowd", "demonstration march", "manifestación multitud"],
    "deportes_estadio": ["football stadium match", "stadium crowd sport", "estadio deportes"],
}
LICENCIAS_OK = re.compile(r"(CC[ -]BY|CC0|Public domain|PD)", re.I)


def consultar(busqueda: str, limite: int) -> list[dict]:
    p = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": 6, "gsrsearch": busqueda,
         "gsrlimit": min(limite, 50), "prop": "imageinfo", "iiprop": "url|extmetadata|mime", "iiurlwidth": 640}
    r = requests.get(API, params=p, headers=HEADERS, timeout=30); r.raise_for_status()
    return list(r.json().get("query", {}).get("pages", {}).values())


def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("--por-clase", type=int, default=120)
    ap.add_argument("--salida", default="imagenes_raw"); a = ap.parse_args()
    raiz = Path(a.salida); raiz.mkdir(exist_ok=True)
    filas = []
    for clase, consultas in BUSQUEDAS.items():
        carpeta = raiz / clase; carpeta.mkdir(exist_ok=True); n = 0
        for q in consultas:
            for pag in consultar(q, 50):
                if n >= a.por_clase: break
                info = (pag.get("imageinfo") or [{}])[0]
                if info.get("mime") not in ("image/jpeg", "image/png"): continue
                meta = info.get("extmetadata", {}); lic = meta.get("LicenseShortName", {}).get("value", "")
                if not LICENCIAS_OK.search(lic): continue
                url = info.get("thumburl") or info.get("url")
                destino = carpeta / f"{clase}_{n:03d}.jpg"
                try:
                    img = requests.get(url, headers=HEADERS, timeout=30); img.raise_for_status()
                    destino.write_bytes(img.content)
                except Exception as e:
                    print("  omitida:", pag.get("title"), e); continue
                filas.append({"archivo": str(destino), "clase": clase, "titulo": pag.get("title"),
                              "autor": re.sub("<[^>]+>", "", meta.get("Artist", {}).get("value", "")),
                              "licencia": lic, "origen": info.get("descriptionurl", "")})
                n += 1; time.sleep(0.3)
        print(f"{clase}: {n} imágenes")
    with open(raiz / "manifest.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["archivo", "clase", "titulo", "autor", "licencia", "origen"]); w.writeheader(); w.writerows(filas)
    print("Revisa manualmente las carpetas y elimina imágenes que no correspondan a su clase antes de dividir el conjunto.")


if __name__ == "__main__":
    main()
```

## A.9 `ml/visual/dividir_dataset.py`

```python
"""Divide imagenes_raw/<clase>/*.jpg en dataset_visual/{train,val,test}/<clase>/ (70/15/15, estratificado).

Antes de dividir: elimina duplicados exactos (hash MD5) y archivos que PIL no pueda abrir, para evitar fuga de
datos entre particiones. Uso: python dividir_dataset.py --origen imagenes_raw --destino dataset_visual
"""
from __future__ import annotations
import argparse, hashlib, random, shutil
from pathlib import Path
from PIL import Image


def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("--origen", default="imagenes_raw")
    ap.add_argument("--destino", default="dataset_visual"); ap.add_argument("--semilla", type=int, default=42); a = ap.parse_args()
    rng = random.Random(a.semilla); resumen = {}
    for carpeta in sorted(p for p in Path(a.origen).iterdir() if p.is_dir()):
        vistos, validos = set(), []
        for f in sorted(carpeta.glob("*")):
            if f.suffix.lower() not in (".jpg", ".jpeg", ".png"): continue
            try:
                Image.open(f).verify()
            except Exception:
                print("corrupta, se omite:", f); continue
            h = hashlib.md5(f.read_bytes()).hexdigest()
            if h in vistos: continue
            vistos.add(h); validos.append(f)
        rng.shuffle(validos); n = len(validos); n_tr, n_va = int(.70 * n), int(.15 * n)
        partes = {"train": validos[:n_tr], "val": validos[n_tr:n_tr + n_va], "test": validos[n_tr + n_va:]}
        for nombre, archivos in partes.items():
            d = Path(a.destino) / nombre / carpeta.name; d.mkdir(parents=True, exist_ok=True)
            for f in archivos: shutil.copy2(f, d / f.name)
        resumen[carpeta.name] = {k: len(v) for k, v in partes.items()}
    for c, r in resumen.items(): print(f"{c:<26}", r)


if __name__ == "__main__":
    main()
```

## A.10 `ml/visual/clasificador_visual.py`

```python
"""Clasificador visual con transferencia de aprendizaje (ResNet50 de ImageNet) - Avance 2.

Fase 1: base congelada + cabeza nueva (GlobalAveragePooling -> Dropout -> Dense softmax).
Fase 2 (fine-tuning): se descongela el último bloque convolucional (conv5_*) con tasa de aprendizaje baja,
        manteniendo las capas BatchNormalization congeladas.
Requiere TensorFlow >= 2.15 (Colab lo trae). NO se pudo ejecutar en el entorno donde se redactó el documento.

Uso:  python clasificador_visual.py --datos dataset_visual --epocas1 12 --epocas2 8 [--modelo resnet50|efficientnetb0]
Salidas: modelos/clasificador_visual.keras, modelos/clases_visual.json, resultados_visual/historial.csv
"""
from __future__ import annotations
import argparse, json
from pathlib import Path

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

TAM = (224, 224)


def cargar(datos: Path, lote: int):
    kw = dict(image_size=TAM, batch_size=lote, label_mode="categorical", seed=42)
    tr = keras.utils.image_dataset_from_directory(datos / "train", shuffle=True, **kw)
    va = keras.utils.image_dataset_from_directory(datos / "val", shuffle=False, **kw)
    clases = tr.class_names
    return tr.prefetch(tf.data.AUTOTUNE), va.prefetch(tf.data.AUTOTUNE), clases


def construir(n_clases: int, modelo: str = "resnet50"):
    aug = keras.Sequential([layers.RandomFlip("horizontal"), layers.RandomRotation(0.05),
                            layers.RandomZoom(0.1), layers.RandomContrast(0.1)], name="aumento")
    if modelo == "resnet50":
        base = keras.applications.ResNet50(include_top=False, weights="imagenet", input_shape=TAM + (3,))
        prep = keras.applications.resnet50.preprocess_input
    else:
        base = keras.applications.EfficientNetB0(include_top=False, weights="imagenet", input_shape=TAM + (3,))
        prep = keras.applications.efficientnet.preprocess_input  # identidad: EfficientNet normaliza internamente
    base.trainable = False
    entrada = keras.Input(TAM + (3,))
    x = aug(entrada); x = layers.Lambda(prep, name="preproceso")(x)
    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D()(x); x = layers.Dropout(0.3)(x)
    salida = layers.Dense(n_clases, activation="softmax")(x)
    return keras.Model(entrada, salida), base


def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("--datos", default="dataset_visual")
    ap.add_argument("--epocas1", type=int, default=12); ap.add_argument("--epocas2", type=int, default=8)
    ap.add_argument("--lote", type=int, default=32); ap.add_argument("--modelo", default="resnet50"); a = ap.parse_args()
    tr, va, clases = cargar(Path(a.datos), a.lote)
    modelo, base = construir(len(clases), a.modelo)
    cb = [keras.callbacks.EarlyStopping(patience=4, restore_best_weights=True, monitor="val_accuracy"),
          keras.callbacks.ReduceLROnPlateau(patience=2, factor=0.5)]
    modelo.compile(keras.optimizers.Adam(1e-3), "categorical_crossentropy", ["accuracy"])
    h1 = modelo.fit(tr, validation_data=va, epochs=a.epocas1, callbacks=cb)
    # Fase 2: fine-tuning del último bloque (conv5) sin tocar BatchNorm
    base.trainable = True
    for capa in base.layers:
        capa.trainable = capa.name.startswith("conv5") and not isinstance(capa, layers.BatchNormalization) if a.modelo == "resnet50" else False
    modelo.compile(keras.optimizers.Adam(1e-5), "categorical_crossentropy", ["accuracy"])
    h2 = modelo.fit(tr, validation_data=va, epochs=a.epocas2, callbacks=cb)
    Path("modelos").mkdir(exist_ok=True); Path("resultados_visual").mkdir(exist_ok=True)
    modelo.save("modelos/clasificador_visual.keras")
    Path("modelos/clases_visual.json").write_text(json.dumps(clases, ensure_ascii=False), encoding="utf-8")
    import pandas as pd
    pd.concat([pd.DataFrame(h1.history).assign(fase=1), pd.DataFrame(h2.history).assign(fase=2)]).to_csv("resultados_visual/historial.csv", index=False)
    print("Modelo guardado. Ejecuta evaluacion_visual.py para obtener las métricas sobre el conjunto de prueba.")


if __name__ == "__main__":
    main()
```

## A.11 `ml/visual/evaluacion_visual.py`

```python
"""Métricas del clasificador visual: Accuracy, Precision, Recall, F1 y matriz de confusión.

Dos modos:
  python evaluacion_visual.py --datos dataset_visual      # evalúa el modelo entrenado sobre test/ (requiere TensorFlow)
  python evaluacion_visual.py --autoprueba                 # verifica las funciones con etiquetas sintéticas (sin TF)
La función `calcular_metricas` solo usa scikit-learn y por eso puede probarse sin entrenar el modelo.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path

import numpy as np
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support


def calcular_metricas(y_real, y_pred, clases):
    p, r, f, s = precision_recall_fscore_support(y_real, y_pred, labels=range(len(clases)), zero_division=0)
    pm, rm, fm, _ = precision_recall_fscore_support(y_real, y_pred, average="macro", zero_division=0)
    return {"accuracy": float(accuracy_score(y_real, y_pred)), "precision_macro": float(pm), "recall_macro": float(rm), "f1_macro": float(fm),
            "por_clase": {c: {"precision": float(p[i]), "recall": float(r[i]), "f1": float(f[i]), "soporte": int(s[i])} for i, c in enumerate(clases)},
            "matriz_confusion": confusion_matrix(y_real, y_pred, labels=range(len(clases))).tolist()}


def guardar_matriz(cm, clases, ruta):
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    cm = np.array(cm); fig, ax = plt.subplots(figsize=(7, 6)); ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(clases))); ax.set_yticks(range(len(clases)))
    ax.set_xticklabels(clases, rotation=45, ha="right"); ax.set_yticklabels(clases)
    for i in range(len(clases)):
        for j in range(len(clases)):
            ax.text(j, i, cm[i, j], ha="center", va="center", color="white" if cm[i, j] > cm.max() / 2 else "black")
    ax.set_xlabel("Clase predicha"); ax.set_ylabel("Clase real"); ax.set_title("Matriz de confusión del clasificador visual")
    fig.tight_layout(); fig.savefig(ruta, dpi=150); plt.close(fig)


def evaluar_modelo(datos: Path):
    import tensorflow as tf
    from tensorflow import keras
    clases = json.loads(Path("modelos/clases_visual.json").read_text(encoding="utf-8"))
    modelo = keras.models.load_model("modelos/clasificador_visual.keras")
    test = keras.utils.image_dataset_from_directory(datos / "test", image_size=(224, 224), batch_size=32,
                                                    label_mode="int", shuffle=False, class_names=clases)
    y_real = np.concatenate([y.numpy() for _, y in test]); y_pred = modelo.predict(test).argmax(1)
    return calcular_metricas(y_real, y_pred, clases), clases, y_real, y_pred


def main() -> None:
    ap = argparse.ArgumentParser(); ap.add_argument("--datos", default="dataset_visual"); ap.add_argument("--autoprueba", action="store_true"); a = ap.parse_args()
    if a.autoprueba:
        clases = ["a", "b", "c"]; r = np.array([0, 0, 1, 1, 2, 2]); p = np.array([0, 1, 1, 1, 2, 0])
        m = calcular_metricas(r, p, clases); assert abs(m["accuracy"] - 4 / 6) < 1e-9 and m["matriz_confusion"] == [[1, 1, 0], [0, 2, 0], [1, 0, 1]]
        print("Autoprueba correcta: accuracy", round(m["accuracy"], 3)); return
    m, clases, y, p = evaluar_modelo(Path(a.datos)); Path("resultados_visual").mkdir(exist_ok=True)
    Path("resultados_visual/metricas_visual.json").write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")
    guardar_matriz(m["matriz_confusion"], clases, "resultados_visual/matriz_confusion_visual.png")
    print(classification_report(y, p, target_names=clases, digits=3, zero_division=0))


if __name__ == "__main__":
    main()
```

## A.12 `ml/visual/predecir_muestras.py`

```python
"""Genera las muestras y las predicciones que usa la interfaz React (se ejecuta en Colab DESPUÉS de entrenar).

Toma del conjunto de PRUEBA 2 imágenes por clase (semilla fija), las copia a muestras/ y escribe prediccionesVisual.json
(modo "real") con la clase predicha y las probabilidades del modelo entrenado. Si existe imagenes_raw/manifest.csv,
escribe también muestras/manifest.json con autor, licencia y origen de cada muestra.
Uso (desde ml/):  python visual/predecir_muestras.py --datos dataset_visual --salida salida_muestras
Después copiar salida_muestras/prediccionesVisual.json a src/data/ y salida_muestras/muestras/ a public/muestras/.
"""
from __future__ import annotations
import argparse, csv, json, random, shutil
from pathlib import Path

import numpy as np
from tensorflow import keras


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--datos", default="dataset_visual"); ap.add_argument("--salida", default="salida_muestras")
    ap.add_argument("--manifest", default="imagenes_raw/manifest.csv"); a = ap.parse_args()
    clases = json.loads(Path("modelos/clases_visual.json").read_text(encoding="utf-8"))
    modelo = keras.models.load_model("modelos/clasificador_visual.keras")
    origen = {}
    if Path(a.manifest).exists():
        with open(a.manifest, encoding="utf-8") as f:
            origen = {Path(r["archivo"]).name: r for r in csv.DictReader(f)}
    rng = random.Random(42); sal = Path(a.salida) / "muestras"; sal.mkdir(parents=True, exist_ok=True)
    muestras, manifest = [], []
    for clase in clases:
        archivos = sorted((Path(a.datos) / "test" / clase).glob("*.jp*g")) + sorted((Path(a.datos) / "test" / clase).glob("*.png"))
        for n, f in enumerate(rng.sample(archivos, min(2, len(archivos))), start=1):
            mid = f"muestra_{clase}_{n}"; destino = sal / f"{mid}.jpg"; shutil.copy2(f, destino)
            img = keras.utils.load_img(f, target_size=(224, 224)); x = np.expand_dims(keras.utils.img_to_array(img), 0)
            p = modelo.predict(x, verbose=0)[0]; i = int(p.argmax())
            muestras.append({"id": mid, "archivo": f"muestras/{mid}.jpg", "clase_real": clase, "clase_predicha": clases[i],
                             "confianza": round(float(p[i]), 4), "probabilidades": {c: round(float(p[k]), 4) for k, c in enumerate(clases)}})
            o = origen.get(f.name, {})
            manifest.append({"archivo": f"{mid}.jpg", "clase": clase, "autor": o.get("autor", ""), "licencia": o.get("licencia", ""), "origen": o.get("origen", "")})
    (Path(a.salida) / "prediccionesVisual.json").write_text(json.dumps(
        {"modo": "real", "aviso": "", "modelo": "ResNet50 (transferencia de aprendizaje, ImageNet)", "clases": clases, "muestras": muestras},
        ensure_ascii=False, indent=2), encoding="utf-8")
    (sal / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(muestras)} muestras escritas en {a.salida}")


if __name__ == "__main__":
    main()
```

## A.13 `ml/Avance2_Colab.ipynb` (lo escribes tú)

Celdas en este orden, cada una con un markdown breve en español: (1) activar GPU y montar/clonar el proyecto; (2) `pip install nltk` y `cd ml`; (3) descargar imágenes (`python visual/descargar_imagenes_commons.py --por-clase 120 --salida imagenes_raw`); (4) **pausa de revisión manual** con instrucciones para borrar imágenes que no correspondan; (5) `python visual/dividir_dataset.py --origen imagenes_raw --destino dataset_visual` e impresión de conteos; (6) `python visual/clasificador_visual.py --datos dataset_visual --epocas1 12 --epocas2 8`; (7) `python visual/evaluacion_visual.py --datos dataset_visual` y mostrar `resultados_visual/matriz_confusion_visual.png`; (8) `python visual/predecir_muestras.py`; (9) comprimir `resultados_visual/` y `salida_muestras/` en un zip descargable con `shutil.make_archive` y `files.download`.

---

# ANEXO B — Contexto vigente del proyecto (contenido del archivo `.agent`, Avance 1)

Léelo antes de modificar código. Estas reglas siguen vigentes salvo donde este prompt las amplía de forma explícita (nuevas intenciones, `escenas`, plantillas e interfaz del Avance 2).

# Continuidad del proyecto Catalogacion

Documento para otro agente. Léelo antes de modificar código. El producto es una maqueta React del asistente de un acervo histórico de noticias. El catálogo es ficticio y el modelo de lenguaje es simulado. No lo presentes como inteligencia artificial.

Versión: 0.1 (Avance 1). Paquete npm: `catalogacion` (minúsculas; npm rechaza `Catalogacion`).

## Qué es y qué no es

Periodistas, editores y archivistas consultan materiales por ID, tema, frase, persona, fecha y tipo, y preguntan de qué trata un material, quién aparece, qué se dice y en qué minuto.

El diseño teórico usa un modelo (LM Studio o Hermes) que recibe la pregunta y los registros recuperados, detecta la intención y redacta. No hay hardware para desplegarlo. Por eso `CONFIG.MODO_MODELO` vale `simulado`. `ModeloSimulado.generar` cumple el mismo contrato que tendría el modelo real y rellena plantillas del JSON. No llama a la red ni a un modelo.

`AdaptadorLMStudio` existe, está desactivado y no se probó. Solo correría si alguien cambia `MODO_MODELO` a `lmstudio`. Las pruebas automáticas no deben llamarlo.

La interfaz muestra siempre: «Modo simulado: no hay ningún modelo de lenguaje cargado. Catálogo de demostración con datos ficticios.»

## Cómo se construyó

- Create React App con la plantilla JavaScript, dentro de Docker (`node:20-bookworm`). No hay Vite, Next ni TypeScript.
- `npx create-react-app Catalogacion` falló porque npm no admite mayúsculas. Se creó `catalogacion` y la carpeta se renombró a `Catalogacion`. El nombre del paquete se quedó en minúsculas.
- Dependencia añadida: `snowball-stemmers` (stemmer español). El paquete no tiene `export default` usable. En `textoUtils.js` se importa `{ newStemmer }`.
- No hizo falta `--legacy-peer-deps`.
- Se borraron `src/logo.svg`, `src/App.test.js`, `src/reportWebVitals.js`, `public/logo192.png` y `public/logo512.png`. Se conservó `src/setupTests.js`.
- No hubo ajuste de `palabras_relacionadas`. Los 15 turnos de Jest pasaron con el JSON original.
- El host de desarrollo no tenía Node en el PATH. Todo `npm` se ejecutó dentro del contenedor.
- `web-vitals` sigue en `package.json` porque venía con CRA. Ya no se importa.

## Cómo funciona cada mensaje

`useChatbot` crea un `Chatbot` y llama `responder(mensaje)`. La bienvenida no es un turno: es el texto de `cortesia > saludo` leído del JSON. Hay una pausa visual de unos 400 ms («escribiendo…»). No hay `localStorage`.

`Chatbot.responder`:

1. `extraerDatos(mensaje)` sobre el texto normalizado (minúsculas, sin acentos; la ñ queda n).
2. `recuperar(datos, ultimoMaterial)` contra un índice de raíces armado una sola vez.
3. Arma el paquete: mensaje, historial (4 turnos previos), datos, registros, instrucciones, catálogo, estados, plantillas e intenciones.
4. `ModeloSimulado.generar(paquete)` si `MODO_MODELO` es `simulado`. Si fuera `lmstudio` y el POST falla, vuelve al simulado y deja `diagnostico.aviso`.
5. Si el modelo devuelve `materialUsado`, ese ID pasa a ser el último material.
6. `validarRespuesta`: cada ID `\b[A-Z]{2,3}\d{4,6}\b` debe existir en el catálogo o ser el ID que escribió el usuario; cada timecode `\b\d{2}:\d{2}:\d{2}\b` debe ser un fragmento, una persona, una duración o `datos.tiempo`.
7. Si no hay intención o la validación falla, la respuesta es el respaldo y `diagnostico.intencion` queda en `respaldo`. Al segundo fallo seguido se usa `respaldo.repetido`.
8. Si el puntaje de saludo es mayor que 0 y la intención ganadora no es cortesía, se antepone «¡Hola! ».

Contrato de `generar(paquete)`: `{ intencion, respuesta, puntajes, saludo, materialUsado }`. El modelo solo debe usar el paquete.

### Extracción (`extraccionDatos.js`)

Devuelve `{ id, tiempo, tipo, rango, anio, palabras, terminos, frase, terminosFrase }`.

- ID: `/\b([a-z]{2,3})-?(\d{4,6})\b/`, en mayúsculas y sin guion. Ejemplo: NT20045.
- Tiempo: `21:48` es mm:ss y se guarda como `00:21:48`. Tres grupos son hh:mm:ss.
- Tipo: primera clave de `tipos_material` cuyo sinónimo aparece como palabra completa. El orden del JSON decide.
- Rango, en este orden: «esta semana», «semana pasada», «hoy», «ayer», «este mes». Semanas de lunes a domingo. No uses `new Date()` para «hoy». La fecha de referencia es `2026-10-25` (domingo). Esa semana es del `2026-10-19` al `2026-10-25`. El cálculo está en `textoUtils.js` (`diaSemanaUTC`, `sumarDiasISO`).
- Año: solo si no hay ID, el primer `19xx` o `20xx`.
- Palabras de búsqueda: tokens que no están en `palabras_vacias_busqueda`, no son solo dígitos y no son un ID. `terminos` son sus raíces.
- Frase: texto entre `«»`, `""` o `“”`. Si no hay comillas, lo que sigue en el texto normalizado a «dijeron que», «dijo que», «mencionaron que» o «mencionan que». `terminosFrase` quita `palabras_vacias_frase`.

### Recuperación (`recuperacion.js`)

Índice: raíces de título, resumen, tipo, etiquetas y `palabras_relacionadas`. Cada fragmento guarda sus raíces.

- `porId`: el ID si está en el catálogo; si no, null.
- `porContexto`: último material de la conversación.
- `porTerminos`: términos distintos presentes en la meta o en algún fragmento. Orden: cantidad descendente, ID ascendente. `mejorFragmento` es el fragmento con más términos, o null si el acierto fue solo por título.
- `porFrase`: solo si hay `terminosFrase`. Umbral `max(min(2, n), ceil(0.6 * n))`. Orden: k descendente, ID ascendente.
- `porFiltro`: solo si hay tipo, rango o año. Debe cumplir todos los que existan. El año vale si es el de ingreso o aparece en título o resumen. Orden: ingreso descendente, ID descendente.
- `relacionados`: base = `porId` o, si no hay, `porContexto`. Otros registros que comparten raíces de etiqueta. No usa el título.

### Puntaje del modelo simulado

`PESO_FUERTE = 3`, `PESO_CLAVE = 1`, `UMBRAL_INTENCION = 2`, `BONO_ID = 2` (solo `buscar_por_id` si hay ID), `BONO_TIMECODE = 4` (solo `fragmento_por_timecode` si hay tiempo).

Cada frase pesa `peso * cantidad de raíces`. Si la misma tupla de raíces se repite, se queda el peso máximo. Una raíz coincide por igualdad, o por distancia de edición ≤ 1 si token y raíz tienen 6 caracteres o más. Varias raíces tienen que ir juntas y en orden. En empate gana la primera clave del JSON. `puntajes` son las tres mayores. Cortesía gana solo si ninguna intención sustantiva llega al umbral y alguna subintención (saludo, despedida, agradecimiento) puntúa.

Las respuestas salen de `plantillas`. `{estado}` es la etiqueta («Completado», «En cola»), no la clave interna. Material procesado = `completado` o `pendiente_revision`. Un ID escrito que no está en el catálogo usa `id_inexistente` y no se recuerda como material.

### Validación y memoria

`gestorConversacion.js` guarda último material, fallos seguidos, turnos e historial de 4. `reiniciar()` lo vacía y también los contadores de cortesía.

`diagnostico` queda en la instancia: intención, tres puntajes, id, datos extraídos, registros solo como IDs, validación, modelo (`simulado` o `lmstudio`) y aviso si hubo fallback.

## Catálogo ficticio

Ocho fichas en `src/data/baseConocimiento.json`, clave `catalogo_demo`:

| ID | Tipo | Estado | Para qué sirve en las pruebas |
|---|---|---|---|
| NT20045 | conferencia de prensa | completado | Ficha, resumen, personas sin nombre, transcripción, frase de la tarifa |
| EN10388 | entrevista | completado | Inundaciones; Ricardo Salas; ingreso 2026-10-22 |
| NT20112 | ceremonia | pendiente_revision | Corregir una descripción |
| EN10391 | entrevista | completado | Laura Mendoza; ingreso 2026-10-24 |
| RB30077 | material en bruto | transcribiendo | Aún no hay personas |
| HI40015 | cinta histórica | analizando_video | Ingreso 2026-10-24; título con 1998 |
| NT20150 | cumbre | en_cola | Aún no se puede consultar por contenido |
| VV50003 | emisión en vivo | error | No debe citarse al preguntar quién ganó un partido |

Hay 14 intenciones de consulta más `cortesia` (saludo, despedida, agradecimiento). Con el respaldo son 16. El orden de las claves del JSON es el desempate. No reordenes intenciones ni cambies plantillas, textos del catálogo ni `casosPrueba.json`. Si un caso fallara por el stemmer, solo se puede añadir una frase más específica a la intención correcta y hay que documentarlo en el README.

## Interfaz

`App.js` monta el banner, el encabezado, el chat y el panel.

- `AvisoModoSimulado.jsx`: banner fijo.
- `Header.jsx`: título y «Reiniciar conversación».
- `MessageList.jsx`: `aria-live="polite"` y `white-space: pre-line` para los `\n` y las viñetas.
- `MessageInput.jsx`: Enter envía.
- `QuickReplies.jsx`: seis textos que se envían tal cual.
- `PanelFlujo.jsx`: `<details>` «Cómo respondió». Muestra datos extraídos, IDs por criterio, intención, tres puntajes, validación y modelo. Un clic automatizado a veces no abre el `<details>`; `summary.click()` desde la página sí.
- `ChatWindow.jsx` y `useChatbot.js` unen la lista, las sugerencias y el envío.
- Estilos en `src/App.css` (secciones comentadas) y un reset en `src/index.css`. Sin librería de UI. Foco visible con `:focus-visible`.

## Scripts y servicios

No hay backend ni API propia. Los únicos servicios son los de Docker Compose.

Desde `Catalogacion`, con Docker Desktop en ejecución:

```powershell
docker compose build
docker compose up web
docker compose run --rm test
docker compose run --rm web npm run build
```

- Servicio `web`: imagen del Dockerfile, puerto 3000, `HOST=0.0.0.0`, polling de archivos para Windows. Monta el código y deja `node_modules` en el volumen `web_node_modules`.
- Servicio `test`: la misma imagen, sin montar el código del host. Ejecuta `npm test -- --watchAll=false` con `CI=true`. Hay que reconstruir la imagen después de cambiar código si se prueba así.
- `Dockerfile`: `node:20-bookworm`. El entrypoint `docker-entrada.sh` se genera dentro de la imagen. Si el volumen no tiene `react-scripts`, hace `npm install` y luego ejecuta el comando. `CMD` es `npm start`.
- `CI=true` hace que el build falle si ESLint emite warnings. El código debe quedar sin warnings.

Scripts de `package.json`, pensados para correr dentro del contenedor:

- `npm start`: servidor de desarrollo en el puerto 3000.
- `npm test`: Jest. El archivo real es `src/tests/conversaciones.test.js`.
- `npm run build`: build de producción.
- `npm run eject`: no usarlo.

Prueba automática: 13 conversaciones y 15 turnos en `src/tests/casosPrueba.json`. Cada conversación crea un `Chatbot` nuevo. Comprueba `diagnostico.intencion`, fragmentos que deben aparecer y fragmentos que no deben aparecer. La comparación usa `normalizar` (minúsculas y sin acentos). Resultado ya obtenido: 13 pruebas pasaron. No se usa Vitest.

Evidencia visual, aparte de Jest: `evidencias/portal.html` y 14 capturas en `evidencias/capturas/`. Esas 14 conversaciones de la interfaz también coincidieron con la intención esperada. El portal se abre con doble clic; no está servido por React.

## Reglas para continuar

- Comentarios en español: cabecera de archivo (qué hace, qué recibe, qué devuelve, con qué se relaciona) y JSDoc en funciones, clases, hook y componentes. No escribas comentarios vacíos.
- No agregues credenciales, tokens, URLs internas ni datos reales. El catálogo sigue siendo el ficticio.
- No actives ni pruebes el adaptador de LM Studio mientras no haya hardware. Si se activa, un fallo debe volver al modelo simulado y avisarlo en el panel.
- No uses la fecha del sistema para los rangos. Parte siempre de `referencia.fechaReferencia`.
- No inventes intenciones, plantillas ni registros. Lo nuevo se agrega en `baseConocimiento.json` y, si cambia la redacción, en `modeloSimulado.js`.
- Para una intención nueva: clave en `intenciones` (el orden importa en un empate), frases `fuertes` y `claves` sin acentos, plantilla y una rama en `redactar`.
- Para un registro nuevo: ID de 2 o 3 letras y de 4 a 6 números, mismo esquema que las fichas actuales. `palabras_relacionadas` simula la búsqueda por significado y solo la llevan los materiales `completado` y `pendiente_revision`.
- El panel lista todos los criterios recuperados, no solo el que armó la respuesta. En «¿Quién ganó el partido de ayer?» el índice ve VV50003, pero la respuesta es el respaldo y no lo cita. No «corrijas» eso haciendo que el respaldo mencione la ficha.

## Límites conocidos

- Solo entiende lo descrito en el JSON. Una clave suelta pesa 1 y no pasa el umbral de 2.
- El panel muestra raíces (`inund`, `laur`) y, en el respaldo, dice «validación rechazada» aunque ese sea el comportamiento previsto.
- La frase extraída puede conservar el signo de interrogación final.
- No hay video, usuarios ni edición real de fichas. Reiniciar borra la memoria; recargar la página también.
- Intenciones implementadas y no fotografiadas en `evidencias/capturas`: lugares y elementos visuales, material relacionado, y cortesía suelta (saludo, despedida, agradecimiento). El saludo sí se usa como mensaje inicial.

## Siguiente etapa, si hay hardware

Cambiar `MODO_MODELO` a `lmstudio`, cargar Hermes en LM Studio (o un servidor con la misma API) en `http://localhost:1234/v1` y mantener `validarRespuesta` antes de mostrar el texto. No hace falta cambiar el orquestador: el adaptador ya cumple `generar(paquete)`.
