# Prompt Engineer

Aplicación web local que convierte una petición en lenguaje natural en un prompt profesional y estructurado para IA, con una sección especial para Claude Code cuando la petición trata de crear software.

## Requisitos

- Node.js 20+
- Una clave de API de DeepSeek ([api-docs.deepseek.com](https://api-docs.deepseek.com))

## Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env` y añade tu clave:

```
DEEPSEEK_API_KEY=tu-clave
DEEPSEEK_MODEL=deepseek-flash
```

`DEEPSEEK_MODEL` es configurable sin tocar código (por ejemplo, para probar `deepseek-v4-pro`).

## Arranque

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). El frontend (Vite) hace proxy de `/api` hacia el backend (Express, puerto 3001), que es quien llama a DeepSeek con la clave — la clave nunca llega al navegador.

## Estructura

```
server/      backend Express (llama a DeepSeek, valida la respuesta)
src/         frontend React
docs/        estado y decisiones del proyecto
```

Consulta [docs/STATE.md](docs/STATE.md) para el estado actual y [docs/DECISIONS.md](docs/DECISIONS.md) para las decisiones técnicas tomadas.
