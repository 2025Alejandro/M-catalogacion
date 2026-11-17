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
