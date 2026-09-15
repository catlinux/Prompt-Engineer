# Decisiones técnicas

## Motor de análisis: DeepSeek API, no heurísticas locales

El usuario tiene crédito ya disponible en DeepSeek y quiere que la IA sea el motor principal de v1, no un sistema de reglas JavaScript. Las reglas locales (`server/schema.ts`) solo se usan para validar el input y la forma de la respuesta, no para interpretar el contenido.

## Sin integración con ChatGPT

La propuesta inicial consideraba abrir ChatGPT gratuito con el prompt generado. Se descartó: el usuario decidió simplificar la v1 a "generar el prompt + instrucciones de cómo enviarlo", sin automatizar ningún envío a ninguna IA de destino. Se puede añadir en una versión futura si hace falta.

## Backend mínimo (Express) en lugar de todo en el navegador

La clave de DeepSeek no se puede exponer en el frontend (se vería en el código fuente/DevTools). Un backend Express minimal es la complejidad mínima necesaria para hacer la llamada de forma segura. No se ha añadido ninguna otra responsabilidad al backend más allá de este endpoint.

## Nombre del modelo configurable vía `.env`

DeepSeek ha cambiado nombres de modelo varias veces (ej: `deepseek-chat`/`deepseek-reasoner` → `deepseek-flash`/`deepseek-v4-pro`). Para evitar tener que tocar código cada vez, `DEEPSEEK_MODEL` se lee del entorno con `deepseek-flash` como valor por defecto. **Verificar el nombre actual en la documentación oficial de DeepSeek antes de confiar en él ciegamente** — este tipo de nombre cambia a menudo.

## Formato de respuesta: JSON estructurado validado

Se pide a DeepSeek `response_format: json_object` con un esquema fijo (`src/types.ts` / `server/schema.ts`). Si la respuesta no cumple el esquema se rechaza con error claro en lugar de mostrar datos a medio formar en el frontend. Evita "inventar" contenido cuando el modelo se equivoca de formato.

## Sin base de datos ni persistencia en v1

No hay manera de guardar el historial de peticiones todavía. Deliberado: el objetivo de la v1 es validar si el concepto aporta valor, no construir infraestructura de persistencia por adelantado.

## Idioma: interfaz y documentación en castellano, contenido generado sigue el idioma del usuario

La app se publicará en GitHub con vocación de alcance más amplio, por lo que la interfaz, los textos fijos del código y toda la documentación del repositorio están en castellano. El contenido que genera DeepSeek (objetivo, requisitos, prompt final...) sigue respondiendo en el idioma en que el usuario escriba su petición — no se fuerza un idioma fijo ahí, ya que limitaría la utilidad para quien escriba en otro idioma.
