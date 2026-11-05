# Ejemplo real: corrida de `qa-explorer` sobre la app de prueba

Salida **real** del agente `qa-explorer` (auditoría autónoma a ciegas, sin acceso a la lista de defectos) sobre `plugins/harness-web/tests/fixtures/qa-app`, una tienda de ejemplo con 7 defectos sembrados deliberadamente (lista en `EXPECTED.md` de esa carpeta).

| Archivo | Qué es |
|---|---|
| `report.md` | Informe de la corrida (hallazgos con severidad, evidencia y cobertura) |
| `screenshots/` | 24 capturas tomadas por el agente |
| `regression/*.spec.ts` | Specs de Playwright que el agente escribió a partir de lo observado |

## Procedencia y límites (leer antes de citar resultados)

- La corrida del agente se hizo el 2026-10-31 con `harness-web` 0.10.0. Desde entonces la política de seguridad del agente se endureció (ADR-014); **no se repitió la auditoría completa con el agente actual**. Lo que sí es reproducible ahora es la parte determinista: los specs.
- Los specs originales fueron **adaptados** a mano para pasar la revisión estática actual de `qa-regression.mjs` (se reemplazaron concatenaciones y una desestructuración; las aserciones no cambiaron).
- El informe lo escribió el agente; contiene su evaluación (incluidos 3 hallazgos adicionales a los 7 sembrados). No es una verdad absoluta: es el resultado de una corrida.
- Un agente basado en un modelo no es determinista: otra corrida puede dar hallazgos distintos.

## Reproducir la parte determinista

Requiere Node 22+ y un runner con Playwright (una sola vez):

```bash
mkdir ~/.claude/harness/qa-runner && cd ~/.claude/harness/qa-runner
npm init -y && npm i @playwright/test && npx playwright install chromium
```

Luego, desde la raíz del repositorio:

```bash
npm run demo:qa
```

Levanta la app en `127.0.0.1:4317`, ejecuta los 18 specs dos veces con el runner confiable y verifica que: los 7 recorridos sanos pasan, los 11 specs de defectos fallan (porque aserciones correctas chocan con los defectos sembrados) y el resultado es idéntico en ambas corridas.

## Reproducir la exploración del agente

Con el plugin `harness-web` habilitado en un proyecto de prueba, levantar la app (`node plugins/harness-web/tests/fixtures/qa-app/server.mjs`) y pedir a Claude Code una auditoría QA de `http://127.0.0.1:4317` con el agente `harness-web:qa-explorer`. Comparar el informe con `EXPECTED.md` (criterio de aceptación documentado allí).
