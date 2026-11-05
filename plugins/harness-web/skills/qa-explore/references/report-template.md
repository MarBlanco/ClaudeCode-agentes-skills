# Plantilla de `report.md`

```markdown
# QA exploratoria — <app> · <run>

**Resultado:** <N> hallazgos (<blocker>/<major>/<minor>/<cosmetic>) · <M> escenarios: <PASS>/<FAIL>/<BLOCKED>/<NOT_EXECUTED>
**URL:** <base> · **Entorno:** local | staging · **Commit:** <git rev-parse --short HEAD o "n/d"> · **Navegador/viewports:** chromium 1280, 375
**Duración / límites alcanzados:** <min> · <ninguno | cuál>

## Resumen ejecutivo
<3–5 líneas: qué se probó, qué funciona, qué está roto y qué hacer primero.>

## Cobertura
| Recorrido | Prioridad | Escenarios | Estado |
|---|---|---|---|

Páginas descubiertas: <n> (ver map.md). No cubierto y por qué: <lista>.

## Hallazgos
### H1 · <título corto> — <severidad> · <clasificación>
- **Esperado:** …
- **Observado:** …
- **Evidencia:** screenshots/…, logs/…
- **Reproducción:** 1. … 2. … · spec: regression/<archivo>.spec.ts
- **Causa probable (hipótesis):** …
- **Próxima acción:** …

## Matriz de escenarios
| # | Recorrido | Escenario | Estado | Hallazgo | Evidencia |
|---|---|---|---|---|---|

## Consola y red
| Página | Errores de consola | Requests 4xx/5xx o fallidas |
|---|---|---|

## Regresión
| Spec | Tipo (recorrido verde / repro de defecto) | Corrida 1 | Corrida 2 |
|---|---|---|---|

Ejecución: pendiente; la hace quien coordina con `node <plugin harness-web>/scripts/qa-regression.mjs .harness/qa/<run> --base-url <url>` tras revisar los specs (resultado en `logs/regression-summary.md`).
Promover al suite del proyecto: pendiente de aprobación (ver skill `web-qa`).

## Lo que no funcionó / limitaciones de la corrida
<intentos fallidos de automatización, estados no alcanzados, supuestos.>
```

Respuesta final en chat, corta y en este orden: qué se probó · qué funciona · qué falló (con clasificación) · dónde está la evidencia · próximos pasos.
