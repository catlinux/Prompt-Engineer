# Estado del proyecto

Última actualización: 2026-09-15

## Hecho

- Estructura del proyecto (frontend React+Vite+TS, backend Express+TS)
- Endpoint `POST /api/generate-prompt`: recibe una petición en lenguaje natural, llama a DeepSeek con un system prompt que exige estructura (objetivo, contexto, requisitos, restricciones, información ausente, preguntas abiertas, propuestas asumidas, criterios de verificación, resultado esperado, y sección Claude Code cuando corresponde) y devuelve JSON validado
- Frontend: formulario de entrada + vista estructurada del resultado + botón de copiar el prompt final
- Validación de forma de la respuesta de DeepSeek (`server/schema.ts`) para evitar mostrar datos corruptos
- Verificado: `npm run typecheck` sin errores, `npm run build` genera `dist/` correctamente
- **Verificado end-to-end con clave real de DeepSeek (modelo `deepseek-flash`)**, varias pruebas:
  - Petición de software ("app móvil de gastos"): `is_software_request: true`, `claude_code` relleno con contenido concreto y no genérico; distingue bien preguntas abiertas (plataforma, sincronización) de propuestas asumidas (almacenamiento local, categorías por defecto), marcadas como tales.
  - Petición no-software ("correo para pedir aumento de sueldo"): `is_software_request: false`, `claude_code: null` como se esperaba; no inventa datos (nombres, cifras) y los marca como placeholders o preguntas abiertas.
  - Petición real de software del usuario ("bot de trading en Python con Claude Code"): resultado de buena calidad — distingue preguntas personales (mercado, dinero real, estrategia) de propuestas convencionales (estructura modular, modo simulación por defecto, pytest); la restricción de seguridad "no operar con dinero real sin confirmación" aparece consistentemente en restricciones, propuestas e instrucciones persistentes.
  - **Observación:** en una llamada puntual con la petición de la app de gastos, la respuesta incumplió el esquema (`claude_code` mal formado) y el backend lo rechazó correctamente con error 502 en lugar de mostrar datos corruptos — el comportamiento de validación funciona, pero confirma que hay que contar con fallos ocasionales de formato del modelo.
- Interfaz de la app, textos fijos del código y documentación del repositorio traducidos a castellano (2026-09-15). El contenido generado por DeepSeek sigue respondiendo en el idioma en que el usuario escriba su petición — ver [DECISIONS.md](DECISIONS.md).
- Documentación base: README, CLAUDE.md, este archivo, DECISIONS.md

## Pendiente / no hecho todavía

- Considerar un reintento automático (1 retry) cuando la respuesta de DeepSeek no cumple el esquema, ya que se ha observado que pasa ocasionalmente. De momento el backend simplemente devuelve error 502 y hay que repetir la petición manualmente.
- Posible mejora del system prompt (detectada revisando la respuesta del caso "bot de trading"): el `final_prompt` no siempre repite con la misma fuerza que `claude_code.documentation_to_create` la instrucción de crear documentación persistente (CLAUDE.md/docs/), y los criterios de verificación no siempre incluyen comprobar que no se han subido credenciales a git pese a que las instrucciones persistentes sí lo piden. Ajuste menor, no bloqueante.
- Sin tests automatizados
- Sin persistencia/historial de peticiones (deliberadamente fuera de v1, ver DECISIONS.md)
- Sin gestión de rate-limiting ni de peticiones concurrentes en el backend

## Decisión pendiente abierta

Validar con uso real y continuado si este concepto aporta suficiente valor respecto a escribir el prompt directamente. Las pruebas realizadas son prometedoras (detecta vacíos reales, no inventa datos, refuerza restricciones de seguridad de forma consistente), pero conviene seguir probando con más casos de uso del usuario.

## Cómo continuar en una sesión futura

1. Lee este archivo y [DECISIONS.md](DECISIONS.md).
2. Confirma que `.env` tiene una clave válida (`npm run dev` y prueba una petición).
3. Revisa la lista "Pendiente" antes de añadir funcionalidad nueva.
