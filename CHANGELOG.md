# Registro de cambios

Aquí se explica, en lenguaje sencillo, qué ha cambiado en cada versión de la aplicación.

El número de versión tiene tres partes (por ejemplo 0.2.0): la primera cambia cuando hay un cambio muy grande, la segunda cuando se añade algo nuevo o se mejora algo existente, y la tercera cuando se corrige un error pequeño.

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
