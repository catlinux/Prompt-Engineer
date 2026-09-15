# CLAUDE.md

Instrucciones persistentes para trabajar en este proyecto. Lee también [docs/STATE.md](docs/STATE.md) (estado actual) y [docs/DECISIONS.md](docs/DECISIONS.md) (por qué se han tomado las decisiones técnicas) antes de hacer cambios importantes.

## Qué es

App web local (React + Vite + TS en el frontend, Express + TS en el backend) que transforma una petición en lenguaje natural en un prompt estructurado vía la API de DeepSeek. Si la petición es de software, genera también una sección específica para dar como instrucción a Claude Code.

## Reglas fijas (no cambiar sin confirmar con el usuario)

- La clave `DEEPSEEK_API_KEY` **solo** vive en el backend (`server/`), leída vía `.env`. Nunca debe exponerse en el frontend ni enviarse al navegador.
- El modelo de DeepSeek es configurable vía `DEEPSEEK_MODEL` en `.env` (por defecto `deepseek-flash`). No hardcodear el nombre del modelo en el código.
- El sistema no debe inventar requisitos ni restricciones que el usuario no haya dicho. Debe distinguir con rigor entre `confirmed_requirements` (lo que el usuario dijo), `necessary_decisions` (preguntas realmente bloqueantes — las únicas que se presentan como pregunta obligatoria), `important_pending_decisions` (importan pero no bloquean; se avanza con una hipótesis provisional explícita), `deferrable_decisions` (no bloquean, se posponen sin más) y `recommendations` (sugerencias de la IA, nunca obligaciones) — nunca mezclar estas categorías. Que una información sea importante NO la convierte automáticamente en bloqueante: solo es bloqueante si además no es razonable avanzar con una hipótesis. Ver [DECISIONS.md](docs/DECISIONS.md).
- Las recomendaciones de qué IA usar (`config/ai_recommendations.json`) se actualizan a mano, nunca automáticamente — ver [docs/ACTUALIZAR_RECOMENDACIONES_IA.md](docs/ACTUALIZAR_RECOMENDACIONES_IA.md) antes de tocar esos datos.
- La elección de qué herramienta de IA recomendar (`ai_tool_recommendation`) la hace DeepSeek con criterio, no una regla fija del backend — no reintroducir selección determinista por categoría. DeepSeek solo puede referenciar `tool_id`s que existan en el catálogo (validado en `server/schema.ts`); los datos de precio/cuota se resuelven siempre desde el catálogo, nunca los inventa la IA. Es un campo separado de `recommendations` (cómo resolver el proyecto) — no mezclarlos.
- El entorno de trabajo de Claude Code se genera en **dos llamadas separadas**, no en una: `POST /api/generate-prompt` solo devuelve `claude_code_workspace` como `ClaudeCodeWorkspaceOfferInfo` (oferta breve: `offer_message` + `suggested_folder_name`), y el contenido real de CLAUDE.md/TODO.md (`ClaudeCodeWorkspace`) solo se genera bajo demanda vía `POST /api/generate-workspace` cuando el usuario confirma que lo quiere — ver DECISIONS.md antes de volver a juntarlas. `claude_code_workspace` (la oferta) solo puede estar presente cuando `ai_tool_recommendation.primary.tool_id` es exactamente `"claude_code"` — el validador lo rechaza en cualquier otro caso. La app no tiene acceso al sistema de archivos del usuario: la entrega del contenido es por botón de copiar por archivo, no por escritura directa ni .zip.
- Una misma decisión (`question`/`topic`) solo puede vivir en una de las cuatro categorías (`necessary_decisions`/`important_pending_decisions`/`recommendations`/`deferrable_decisions`) — nunca duplicada con tratamiento distinto (verificado en `server/schema.ts` con `findDuplicateDecisionTopic`). `claude_code.decision_references` solo puede referenciar temas de `necessary_decisions` o `important_pending_decisions` (las únicas categorías que son decisiones realmente pendientes) — **nunca** de `recommendations` ni `deferrable_decisions`, ni redactar/reclasificar una decisión con texto propio (verificado con `collectPendingDecisionTopics`). Una recomendación que Claude Code deba aplicar va en `persistent_instructions`, no en `decision_references`. No reintroducir listas de texto libre paralelas al modelo de fases sin pasar por esta verificación.
- El contenido generado por DeepSeek responde en el mismo idioma en que el usuario escribe su petición (no forzar un idioma fijo ahí). La interfaz de la app y toda la documentación del repositorio están en castellano.
- V1 deliberadamente sencilla: sin base de datos, sin autenticación, sin despliegue. No añadir infraestructura que no sea necesaria para la funcionalidad actual.
- `vite.config.ts` tiene `allowedHosts: true` a propósito, para poder exponer el servidor de desarrollo vía un túnel temporal (Cloudflare Tunnel u otro) con hostname aleatorio — sin esto Vite devuelve 403 a cualquier `Host` que no reconozca. Solo afecta al servidor de desarrollo local; no hay despliegue en producción.
- El diseño visual (`src/index.css`, fuentes en `index.html`) usa tokens propios (acento índigo, tipografía Fraunces/Inter/JetBrains Mono) — antes de tocarlo, mantener el mismo sistema de tokens en vez de introducir colores/fuentes sueltos, y verificar que las clases usadas en los componentes React siguen definidas en el CSS.

## Cómo ejecutar y verificar

```bash
npm install
npm run dev        # frontend :5173 + backend :3001
npm run typecheck  # comprueba tipos cliente y servidor
npm run build      # build de producción del frontend
npm test           # tests del validador de esquema (server/schema.test.ts, node --test nativo)
```

Tests automatizados (16, en `server/schema.test.ts`): solo cubren `server/schema.ts` (validación de coherencia entre categorías de decisión y forma del JSON), con el runner nativo de Node (`node --test` vía `tsx`), sin dependencias nuevas. Incluyen casos representativos de las 4 categorías de decisión, confirmación en fase posterior, y la contradicción "puede decidir"/"debe consultar" sobre el mismo topic. El resto se verifica manualmente: arrancar `npm run dev`, probar al menos una petición de software y otra que no lo sea, y comprobar que `final_prompt` tiene sentido y que la sección Claude Code solo aparece cuando corresponde.

## Cómo actualizar la documentación

Después de cualquier cambio funcional o de decisión técnica: actualiza [docs/STATE.md](docs/STATE.md) (qué hay hecho/pendiente) y, si la decisión es nueva, añade una entrada a [docs/DECISIONS.md](docs/DECISIONS.md). No crees archivos de documentación nuevos sin que aporten información que no se pueda derivar leyendo el código.
