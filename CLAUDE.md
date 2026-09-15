# CLAUDE.md

Instrucciones persistentes para trabajar en este proyecto. Lee también [docs/STATE.md](docs/STATE.md) (estado actual) y [docs/DECISIONS.md](docs/DECISIONS.md) (por qué se han tomado las decisiones técnicas) antes de hacer cambios importantes.

## Qué es

App web local (React + Vite + TS en el frontend, Express + TS en el backend) que transforma una petición en lenguaje natural en un prompt estructurado vía la API de DeepSeek. Si la petición es de software, genera también una sección específica para dar como instrucción a Claude Code.

## Reglas fijas (no cambiar sin confirmar con el usuario)

- La clave `DEEPSEEK_API_KEY` **solo** vive en el backend (`server/`), leída vía `.env`. Nunca debe exponerse en el frontend ni enviarse al navegador.
- El modelo de DeepSeek es configurable vía `DEEPSEEK_MODEL` en `.env` (por defecto `deepseek-flash`). No hardcodear el nombre del modelo en el código.
- El sistema no debe inventar requisitos ni restricciones que el usuario no haya dicho. Cuando falta información debe distinguir entre "preguntarlo al usuario" (`open_questions`) y "proponerlo marcado como propuesta" (`assumed_proposals`) — nunca mezclarlo como si fuera un hecho.
- El contenido generado por DeepSeek responde en el mismo idioma en que el usuario escribe su petición (no forzar un idioma fijo ahí). La interfaz de la app y toda la documentación del repositorio están en castellano.
- V1 deliberadamente sencilla: sin base de datos, sin autenticación, sin despliegue. No añadir infraestructura que no sea necesaria para la funcionalidad actual.

## Cómo ejecutar y verificar

```bash
npm install
npm run dev        # frontend :5173 + backend :3001
npm run typecheck  # comprueba tipos cliente y servidor
npm run build      # build de producción del frontend
```

No hay suite de tests automatizados todavía (v1). Verificar manualmente significa: arrancar `npm run dev`, probar al menos una petición de software y otra que no lo sea, y comprobar que `final_prompt` tiene sentido y que la sección Claude Code solo aparece cuando corresponde.

## Cómo actualizar la documentación

Después de cualquier cambio funcional o de decisión técnica: actualiza [docs/STATE.md](docs/STATE.md) (qué hay hecho/pendiente) y, si la decisión es nueva, añade una entrada a [docs/DECISIONS.md](docs/DECISIONS.md). No crees archivos de documentación nuevos sin que aporten información que no se pueda derivar leyendo el código.
