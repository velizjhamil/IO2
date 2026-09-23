# AGENTS.md — IO2

Repo para una herramienta web de Investigación Operativa (teoría de colas M/M/1 y simulación Montecarlo), construida en Next.js. Trabajo desde `frontend/`.

## Layout

- `IO2/` es un monorepo de **un solo paquete activo**: `frontend/`.
- La raíz no tiene código propio (el `README.md` raíz está vacío). Todo el código, dependencias y comandos viven dentro de `frontend/`.
- No hay workspaces de npm/pnpm ni `package.json` raíz. Cambiá al directorio `frontend/` antes de correr cualquier comando.

## Stack y comandos (cwd = `frontend/`)

- **Next.js 16.3.6** + **React 19.2.8** + **TypeScript 5** + **Tailwind v4** (PostCSS).
- Package manager: usar `npm` (hay `package-lock.json`, no hay `pnpm-lock.yaml` ni `yarn.lock`).
- Scripts en `package.json`:
  - `npm run dev` — `next dev` (regenera el bloque de Next.js al final de este archivo, ver abajo).
  - `npm run build` — `next build`.
  - `npm start` — `next start`.
  - `npm run lint` — `eslint` (usa `eslint.config.mjs` con `eslint-config-next/core-web-vitals` + `typescript`).
- **No hay script de test.** Para typecheck: `npx tsc --noEmit`. No hay Jest/Vitest configurados.
- Path alias: `@/*` → `./*` (resuelve relativo a `frontend/`). Ej. `import { ... } from "@/lib/queueSimulation"`.

## Dominio

- El código de dominio vive en `frontend/src/lib/queueSimulation.ts`. Ahí están las funciones puras de M/M/1 (tasas λ/μ, ρ, L, Lq, W, Wq, distribución Pn) y la simulación Montecarlo.
- Datos de muestra en la constante `SAMPLE_FIELD_DATA` del mismo archivo (observación del Surtidor UAGRM, 08:00–08:35).
- UI actual: scaffold de `create-next-app` sin personalizar — `src/app/page.tsx` es la página de bienvenida por defecto. Si vas a tocar UI, partí de ahí.

## Convenciones del repo

- **Idioma**: el código de dominio y los comentarios están en **español**. Mantener ese registro (UI copy, comentarios, strings) salvo que el usuario pida otra cosa.
- **No** agregar `Co-Authored-By` ni atribución de IA a los commits (convention del orchestrator). Commits convencionales.
- Estilo de commits: el orquestador planifica work units; si vas a commitear, leé `frontend/.git/hooks` y la convención del repo primero.

## Lo que todavía no existe (no inventar)

- No hay CI, ni GitHub Actions, ni pre-commit / husky.
- No hay tests automatizados — `npm test` falla.
- No hay backend, API routes, ni server actions en uso todavía.

## Verificación rápida

Antes de pedir review o commitear, en `frontend/`:

```bash
npx tsc --noEmit    # typecheck (no hay script para esto)
npm run lint        # ESLint con config de Next
npm run build       # opcional, valida build de producción
```

## Importante: el bloque siguiente es manejado por Next.js

El bloque delimitado por `<!-- BEGIN:nextjs-agent-rules -->` / `<!-- END:nextjs-agent-rules -->` lo escribe y reescribe `next dev` automáticamente (verificado en `node_modules/next/dist/server/lib/generate-agent-files.js`, presente en `next@16.3.6`). **No lo elimines del diff al commitear** — Next lo va a volver a agregar y eso ensucia el árbol. Si querés moverlo, dejalo al final del archivo.

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
