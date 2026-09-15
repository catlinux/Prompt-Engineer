# Registro de cambios

Aquí se explica, en lenguaje sencillo, qué ha cambiado en cada versión de la aplicación.

El número de versión tiene tres partes (por ejemplo 0.2.0): la primera cambia cuando hay un cambio muy grande, la segunda cuando se añade algo nuevo o se mejora algo existente, y la tercera cuando se corrige un error pequeño.

## [0.16.2] - 2026-09-16

### Mejorado
- Cuando el proyecto va a usar claves o credenciales, el prompt final ahora recuerda expresamente comprobar que no se han subido al repositorio.
- El prompt final ahora menciona con la misma fuerza que la sección aparte la instrucción de crear y mantener documentación persistente (README, .env.example, decisiones técnicas), en vez de darla solo por implícita.

## [0.16.1] - 2026-09-16

### Añadido
- Botón "Nueva consulta" junto al campo de entrada, además del que ya existía en la barra lateral — visible cuando hay una conversación en curso o texto escrito.

## [0.16.0] - 2026-09-16

### Añadido
- Panel en la cabecera con el saldo disponible en DeepSeek y el consumo (tokens y coste estimado) de la última consulta realizada.

### Técnico
- El coste se calcula comparando el saldo real justo antes y justo después de cada consulta (no con una tabla de precios), porque DeepSeek no publica un precio único por token: varía según el modelo, la hora y si hay caché. El saldo que da la API solo tiene 2 decimales, así que una consulta muy barata puede mostrarse como "< 0.01" en vez de una cifra exacta.

## [0.15.0] - 2026-09-15

### Añadido
- Historial de conversaciones con barra lateral: cada consulta se puede guardar como un hilo con título, y desde la barra lateral se puede renombrar, eliminar o volver a abrir.
- Al copiar el prompt final por primera vez en una consulta nueva, se pregunta si quieres guardarla en el historial o descartarla.
- Si continúas una conversación guardada con una nueva petición relacionada, la aplicación recuerda el contexto de las peticiones anteriores del mismo hilo (como un chat), en vez de tratar cada petición como algo aislado.

### Técnico
- Se añade persistencia con SQLite (antes la aplicación no guardaba nada entre sesiones). Solo se usa para el historial de conversaciones.

## [0.14.0] - 2026-09-15

### Cambiado
- Cuando la petición parece un proyecto de software con envergadura real, la aplicación ahora pregunta primero si quieres usar Claude Code, **antes** de generar todo el análisis y el prompt — así no se gasta tiempo ni consumo en preparar un resultado completo que igual no querías. Si dices que no, se genera el prompt con la segunda mejor IA directamente, sin volver a ofrecerte Claude Code.
- Este primer paso ("triaje") es una llamada corta y rápida, separada de la llamada de análisis completo que ya existía.

## [0.13.0] - 2026-09-15

### Añadido
- Las decisiones importantes pendientes ahora indican quién debería tomarlas: tú, el agente directamente, o el agente después de investigar tu proyecto real (por ejemplo, "qué base de datos usar" depende de lo que ya haya en el proyecto). Se ve como una etiqueta junto a cada decisión.
- Cuando una decisión no bloquea el trabajo ahora pero sí necesitará tu confirmación antes de algo delicado (poner algo en producción, operar con dinero real, borrar datos), la aplicación lo indica claramente con un aviso, y esa condición también se conserva en el prompt final.

### Revisado (sin cambios de comportamiento)
- Revisión completa de coherencia y arquitectura: se confirmó que la recomendación de qué IA usar y la detección de contradicciones entre categorías de decisión ya funcionaban bien y no se han tocado.

## [0.12.0] - 2026-09-15

### Cambiado
- Cuando la aplicación recomienda Claude Code, ya no genera siempre el contenido completo de CLAUDE.md y TODO.md dentro de la misma llamada (aunque luego respondas "No, solo el prompt"). Ahora ese contenido solo se genera cuando pulsas "Sí, prepáralo", en una segunda llamada más pequeña — la primera respuesta llega algo más rápido en el caso más común.
- Mientras la aplicación está generando el prompt (o el entorno de trabajo de Claude Code), ahora se ve un contador con el tiempo transcurrido y un aviso de que puede tardar 1-2 minutos, en vez de una pantalla sin ninguna indicación.

## [0.11.0] - 2026-09-15

### Añadido
- Nuevo aspecto visual de la aplicación: tipografía con más carácter (Fraunces para los títulos, Inter para el texto, JetBrains Mono para el prompt final y el contenido técnico), colores con más matiz, y cada bloque de la pantalla marcado con un color según su tipo (azul para lo relacionado con Claude Code, verde para recomendaciones y el prompt final, ámbar para decisiones importantes).
- Ahora se puede usar la aplicación desde fuera de tu red local a través de un túnel temporal (por ejemplo Cloudflare Tunnel), útil para probarla desde el móvil.

### Corregido
- Ajuste preventivo: se sube de nuevo el límite de longitud de respuesta (de 16384 a 24576) para reducir la probabilidad de que vuelva a aparecer el error "La respuesta de DeepSeek no es JSON válido" a medida que la aplicación crece.

## [0.10.2] - 2026-09-15

### Corregido
- La sección para Claude Code a veces listaba como "decisión relevante" algo que en realidad ya era una recomendación resuelta por la IA (por ejemplo, "reutilizar módulos existentes" o "seguir la estructura oficial"), dando la falsa impresión de que había que consultarlo o decidirlo cuando ya estaba resuelto. Ahora esa lista solo puede contener decisiones realmente pendientes (las que bloquean o las importantes-no-bloqueantes); las recomendaciones aplicables se incorporan como instrucciones de trabajo normales.
- Se añaden 9 tests automatizados nuevos que comprueban específicamente que no se mezclen categorías de decisión de forma contradictoria.

## [0.10.1] - 2026-09-15

### Cambiado
- Las etiquetas "IA complementaria" y "Alternativas" ahora dejan claro qué significan: una IA complementaria se usa junto a la principal (para otra parte del trabajo), mientras que una alternativa la sustituye por completo. Antes podían confundirse.
- Cuando la aplicación pregunta si quieres que prepare el entorno de trabajo para Claude Code, ya no muestra el resto del análisis debajo mientras esperas a responder — así la pregunta no queda enterrada entre más contenido. En cuanto respondes (sí o no), el resto de la pantalla aparece con normalidad.

## [0.10.0] - 2026-09-15

### Corregido
- A veces una misma decisión pendiente podía aparecer contada dos veces de forma contradictoria: por ejemplo, como algo que Claude Code puede decidir por su cuenta y, a la vez, como algo que debe consultarte obligatoriamente antes de continuar. Ahora cada decisión vive en un solo sitio y con un solo criterio, así que esa contradicción ya no puede pasar — si una decisión necesitará tu confirmación más adelante (por ejemplo, antes de poner algo en producción), la aplicación lo explica como parte de esa misma decisión, en vez de duplicarla.
- La aplicación ahora comprueba esto automáticamente antes de mostrarte el resultado: si detectara una contradicción de este tipo, rechaza esa respuesta y genera una nueva en vez de mostrarte algo inconsistente.

## [0.9.1] - 2026-09-15

### Corregido
- Volvía a aparecer el error "La respuesta de DeepSeek no es JSON válido". Con las últimas funciones añadidas (sobre todo el CLAUDE.md/TODO.md para Claude Code), las respuestas se habían vuelto más largas que el límite configurado, y se cortaban a medias otra vez. Se ha aumentado ese límite. Verificado con varias peticiones reales del caso que genera más contenido: sin errores.

## [0.9.0] - 2026-09-15

### Añadido
- Cuando la aplicación recomienda Claude Code como herramienta principal, ahora pregunta si quieres que prepare también el entorno de trabajo: un archivo `CLAUDE.md` con las instrucciones del proyecto y un `TODO.md` con las tareas y decisiones pendientes, listos para copiar y guardar en tu carpeta antes de abrir Claude Code. Si respondes que no, la aplicación sigue mostrando solo el prompt, como hasta ahora.

## [0.8.0] - 2026-09-15

### Cambiado
- Antes, si una pregunta era importante, la aplicación la trataba como si tuvieras que responderla obligatoriamente antes de continuar. Ahora distingue mejor: solo te pide respuesta cuando de verdad es imprescindible para seguir. Si una decisión es importante pero se puede avanzar sin ella, la aplicación asume una hipótesis razonable, sigue trabajando, y te explica qué podría cambiar si más adelante decides otra cosa.
- Nueva sección "Decisiones importantes pendientes" en la pantalla, separada de las preguntas que sí necesitan tu respuesta.
- Cuando solo una parte del proyecto necesita una respuesta tuya (por ejemplo, los métodos de pago de una tienda), la aplicación ya no detiene todo el proyecto: lo indica claramente y sigue avanzando con el resto.
- El prompt final ya no dice cosas como "debes responder esto antes de continuar" cuando en realidad se puede avanzar con una hipótesis — ahora lo explica de forma coherente.

## [0.7.0] - 2026-09-15

### Cambiado
- La recomendación de IA ya no sigue una regla fija ("si es código, siempre Claude"). Ahora la propia IA analiza la petición, identifica las tareas que contiene y decide con criterio qué herramienta (o combinación de herramientas) encaja mejor para cada una, comparando el catálogo real de herramientas disponibles.
- Puede recomendar una sola herramienta si basta con ella, o una principal más otras complementarias cuando distintas partes del trabajo necesiten cosas distintas (por ejemplo: una para programar, otra para los textos, otra para las imágenes).
- Distingue entre herramientas "de un solo chat" y herramientas "agente" que trabajan de forma autónoma sobre un proyecto real (por ejemplo, ya no confunde Claude.ai con Claude Code: son entradas distintas en el catálogo con capacidades distintas).
- Sin favoritismo hacia ningún proveedor: puede recomendar cualquier herramienta del catálogo, incluida DeepSeek, según lo que encaje mejor.
- Cuando el catálogo no tiene datos suficientes para decir que una herramienta es mejor que otra, la aplicación ya no inventa una diferencia: dice que son alternativas parecidas.

## [0.6.0] - 2026-09-15

### Añadido
- La recomendación de IA ya no se limita a "Claude o ChatGPT": ahora la aplicación reconoce 8 tipos de petición (texto, código/software, imagen, vídeo, música, resumen de documentos propios, transcripción de audio, investigación profunda) y recomienda la herramienta gratuita más adecuada para cada una: Leonardo AI para imágenes, Kling AI para vídeo, Suno para música, NotebookLM para resúmenes e investigación, Otter.ai para transcripción, además de Claude/ChatGPT/Gemini para texto y código.
- Tabla completa con todas las herramientas, categorías y límites en [docs/RECOMENDACIONES_IA.md](docs/RECOMENDACIONES_IA.md).

## [0.5.0] - 2026-09-15

### Añadido
- La aplicación ahora sugiere qué IA (Claude, ChatGPT o Gemini) conviene usar para cada prompt generado, indicando si tiene versión gratuita, qué incluye y sus límites principales. Es solo una sugerencia orientativa, no una obligación.
- Esos datos de precios y límites están documentados en [docs/RECOMENDACIONES_IA.md](docs/RECOMENDACIONES_IA.md), con la fecha de la última actualización siempre visible.
- Si esos datos tienen más de una semana, la aplicación lo avisa en pantalla, porque los precios y límites de las IA cambian con frecuencia.

### Limitación conocida
- Estos datos se actualizan a mano (con ayuda de un agente con acceso a internet, como Claude Code) cuando se pide explícitamente — la aplicación no los revisa sola. Quien descargue el proyecto sin un asistente así verá siempre la fecha de la última actualización que alguien subió. Detalles en [docs/ACTUALIZAR_RECOMENDACIONES_IA.md](docs/ACTUALIZAR_RECOMENDACIONES_IA.md).

## [0.4.1] - 2026-09-15

### Corregido
- A veces la aplicación mostraba el error "La respuesta de DeepSeek no es JSON válido". Pasaba porque el análisis más completo introducido en la versión anterior (0.4.0) generaba respuestas más largas, y el límite de longitud de respuesta era demasiado corto para ellas, cortándolas a medias. Se ha aumentado ese límite y además, si aun así ocurriera, la aplicación ahora lo vuelve a intentar automáticamente una vez antes de mostrar cualquier error.

## [0.4.0] - 2026-09-15

Cambio importante en cómo la aplicación analiza tu petición: ahora distingue mejor entre lo que has pedido de verdad, lo que hace falta preguntar sí o sí, lo que se puede decidir más adelante, y lo que son solo sugerencias.

### Añadido
- La aplicación ahora puede indicar, cuando aporta valor, qué "papel profesional" conviene que adopte la IA para tu tarea (por ejemplo, "arquitecto de software especializado en sistemas de trading"), junto con comportamientos concretos que debe seguir. No aparece en todas las peticiones, solo cuando tiene sentido.
- Se distingue entre "decisiones necesarias" (preguntas que hay que responder sí o sí para poder avanzar) y "decisiones que se pueden aplazar" (cosas que faltan pero no bloquean el trabajo, se pueden decidir más adelante). Antes todo se trataba igual.
- Las sugerencias de la aplicación ahora aparecen siempre etiquetadas como "Recomendación", nunca como si fueran algo que has pedido tú.

### Cambiado
- Los requisitos que se muestran ahora son solo los que tú has confirmado, sin mezclarlos con sugerencias de la IA.
- El prompt final ahora incluye el papel profesional (si lo hay) y solo las decisiones pendientes que de verdad son importantes, en un resumen más completo pero igual de directo que antes.
- La aplicación hace menos preguntas, pero las que hace son más relevantes: antes de preguntar algo, ahora se plantea si es realmente imprescindible o si se puede decidir sola o dejar para más adelante.

## [0.3.0] - 2026-09-15

### Añadido
- Cuando la aplicación hace preguntas para aclarar la petición, ahora puedes responderlas directamente en la pantalla (antes solo se podían leer). Al responder y pulsar "Volver a generar con estas respuestas", la aplicación vuelve a preparar el prompt teniendo en cuenta lo que has contestado, y esas preguntas ya no vuelven a aparecer como pendientes.

## [0.2.0] - 2026-09-15

### Añadido
- La pantalla principal ahora muestra la versión de la aplicación y la fecha de esa versión, junto al título.

### Cambiado
- El prompt final que genera la aplicación ahora es más corto. Antes repetía toda la información que ya se mostraba en las otras secciones de la pantalla; ahora es un resumen breve, directo y sin repeticiones, que sigue explicando cómo conviene abordar el trabajo y por qué.

## [0.1.0] - 2026-09-15

Primera versión funcional de la aplicación.

### Añadido
- Formulario para escribir una petición en lenguaje natural.
- La aplicación usa la IA de DeepSeek para convertir esa petición en un prompt profesional y estructurado (objetivo, contexto, requisitos, restricciones, información que falta, preguntas abiertas, propuestas sugeridas, criterios para comprobar que el resultado es correcto).
- Cuando la petición es sobre crear un programa o aplicación, se genera además una sección especial pensada para dársela a Claude Code.
- Botón para copiar el prompt final con un solo clic.
- Documentación inicial del proyecto (instrucciones de instalación y explicación de las decisiones tomadas).
