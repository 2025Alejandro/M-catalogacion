# Catalogación

Maqueta web de un asistente conversacional para consultar un acervo histórico de noticias. Periodistas, editores y archivistas pueden preguntar por un material (su ficha, de qué trata, quién aparece, qué se dice y en qué minuto) o buscar por tema, frase, persona, fecha y tipo.

El catálogo es ficticio. La interfaz lo dice en un banner fijo.

## Por qué el modelo es simulado

El diseño real usa un modelo de lenguaje: recibe la pregunta junto con los registros recuperados, detecta la intención y redacta la respuesta. No es un chatbot de frases fijas elegidas a mano en la interfaz.

En esta etapa no hay hardware para desplegar un modelo. Por eso la capa del modelo es un reemplazo determinista, sin red y sin IA, con el mismo contrato de entrada y salida que tendría el modelo real. Así se puede ver y probar el flujo completo. El programa no debe presentarse como inteligencia artificial.

## Diseño teórico con LM Studio o Hermes

`src/config.js` exporta `CONFIG.MODO_MODELO`. El valor por defecto es `simulado`.

Si en el futuro hubiera un equipo capaz de cargar un modelo, se cambiaría a `lmstudio`. `src/chatbot/adaptadorLMStudio.js` enviaría un POST a `http://localhost:1234/v1/chat/completions` (API compatible con OpenAI). Hermes se usaría cargándolo en LM Studio o en otro servidor con esa misma API, sin cambiar el código del orquestador. La temperatura prevista es `0.1`.

Ese adaptador no está probado: no hay hardware para ejecutarlo y las pruebas automáticas no lo llaman. Si la petición fallara, el orquestador volvería al modelo simulado y lo avisaría en el panel «Cómo respondió».

## Instalación y ejecución

Hace falta Docker Desktop en ejecución. No hace falta Node en Windows: Create React App, las dependencias, Jest y el servidor corren dentro de la imagen `node:20-bookworm`.

El paquete npm se llama `catalogacion` en minúsculas porque npm no acepta mayúsculas en el nombre. La carpeta del proyecto es `Catalogacion`.

Desde esta carpeta:

```powershell
docker compose build
docker compose up web
```

La interfaz queda en http://localhost:3000.

Pruebas (13 conversaciones, 15 turnos) y build de producción:

```powershell
docker compose run --rm test
docker compose run --rm web npm run build
```

`test` equivale a `CI=true npm test -- --watchAll=false`.

## Estructura

```
Catalogacion/
  Dockerfile
  docker-compose.yml
  src/
    config.js
    data/baseConocimiento.json
    chatbot/
      textoUtils.js
      extraccionDatos.js
      recuperacion.js
      modeloSimulado.js
      adaptadorLMStudio.js
      validacion.js
      gestorConversacion.js
      chatbot.js
    components/
    hooks/useChatbot.js
    tests/
      conversaciones.test.js
      casosPrueba.json
    App.js
    App.css
    index.js
```

## Flujo de consulta

Cada mensaje pasa por `Chatbot.responder`:

1. `extraerDatos` saca ID, timecode, tipo, rango, año, términos y frase. Las fechas salen de `referencia.fechaReferencia` (`2026-10-25`), no del reloj.
2. `recuperar` busca en un índice de raíces: por ID, por el último material, por términos, por frase, por filtro y por etiquetas compartidas.
3. Se arma un paquete (mensaje, historial de 4 turnos, datos, registros, instrucciones, catálogo, estados, plantillas e intenciones) y se llama a `generar`.
4. El modelo simulado puntúa las frases del JSON (fuerte 3, clave 1, umbral 2, bono de ID 2, bono de timecode 4). En empate gana la primera intención del archivo. La respuesta sale solo de las plantillas.
5. `validarRespuesta` rechaza IDs o timecodes que no existan. Si no hay intención o la validación falla, se usa el texto de respaldo.
6. El diagnóstico queda en memoria para el panel «Cómo respondió». No hay `localStorage`.

## Cómo agregar una intención o un registro

Todo está en `src/data/baseConocimiento.json`.

Intención nueva: añadir una clave dentro de `intenciones`, antes de `cortesia` si debe poder ganar un empate por estar antes. `fuertes` y `claves` van sin acentos. Cada frase fuerte pesa `3 × cantidad de raíces` y cada clave `1 × cantidad de raíces`. Hace falta una plantilla en `plantillas` y un caso en `modeloSimulado.js` que la rellene. No inventar textos fuera de ese archivo.

Registro nuevo: una clave con forma de ID (2 o 3 letras y de 4 a 6 números) dentro de `catalogo_demo`, con el mismo esquema que los demás (título, tipo, estado, duración, ingreso, etiquetas, resumen, fragmentos, personas, lugares, elementos visuales y `palabras_relacionadas`). Esas palabras simulan la relación de significado que haría un modelo real. Solo los materiales ya analizados (`completado` y `pendiente_revision`) las llevan.

## Ajustes de palabras clave

No hubo. El stemmer de `snowball-stemmers` resolvió los 15 turnos sin cambiar `palabras_relacionadas`, las plantillas, el catálogo ni los casos de prueba.

## Limitaciones

El modelo simulado solo entiende lo que está descrito en el JSON. No es IA, no parafrasea con libertad y no consulta nada fuera del catálogo de demostración. El catálogo es ficticio. El adaptador de LM Studio queda escrito y desactivado.
