# Gates de calidad del harness

Nueve gates independientes. Los ejecuta `qa-verifier` (sin permisos de edición); la evidencia queda en `.harness/evidence/<tarea>/`. Los comandos concretos de cada proyecto están en `.claude/harness.manifest.json` → `gateCommands`.

## Catálogo

| Gate | Comprobación | Evidencia | Criterio PASS |
|---|---|---|---|
| G1 Estático | build, typecheck (`tsc --noEmit`), lint; en Python `ruff check` (+ mypy si existe) | log de consola | 0 errores. Warnings sin aumento respecto de la base |
| G2 Unit/integración | Vitest/Jest o pytest sobre lo afectado; suite completa en riesgo medio/alto | log + cobertura del diff si existe | 0 fallos. Lógica nueva con tests nuevos |
| G3 E2E | Playwright Test de los flujos afectados | reporte HTML / trace | flujos críticos verdes |
| G4 Visual y responsive | `toHaveScreenshot` a 375, 768 y 1280 px + revisión en Chrome real (skill `chrome-devtools`) | capturas y diffs | sin diffs no aprobados, sin overflow horizontal |
| G5 Accesibilidad | `@axe-core/playwright` en E2E + Lighthouse a11y | violaciones axe y puntaje | 0 violaciones serious/critical. a11y ≥ 90 |
| G6 Seguridad | gitleaks, osv-scanner; `claude-security` si el diff toca auth, RLS, permisos, pagos o secretos | reportes | 0 secretos. 0 vulnerabilidades high/critical sin excepción documentada |
| G7 Performance | Lighthouse CI con presupuestos + traza de `chrome-devtools` | JSON de LHCI | dentro del presupuesto del perfil (LCP, CLS, peso JS) |
| G8 Base de datos | migración aplicada en base local/efímera, tests de RLS/políticas, advisors de Supabase (solo lectura) | log de migración y resultados | migración reversible o con plan de rollback; RLS sin regresiones |
| G9 Pagos | matriz de `harness-payments:payments-review` con mocks y sandbox | resultado por escenario | todos los estados cubiertos; duplicados e importes manipulados rechazados |

## Selección por riesgo

| Riesgo | Cuándo | Gates |
|---|---|---|
| Bajo | docs, copy, estilos aislados, refactor trivial con tests existentes | G1 (+ G2 si hay lógica) |
| Medio | lógica de negocio, componentes UI, endpoints no sensibles | G1, G2, G6 + G3/G4/G5 si toca UI o API |
| Alto | auth, permisos, datos personales, migraciones, pagos, infraestructura, rutas públicas críticas | todos los aplicables: G1–G6 + G7 en rutas públicas + G8 si hay esquema + G9 si hay pagos |

Reglas:
- G1 corre siempre. G6 (gitleaks) corre en todo cambio que se vaya a commitear.
- Cambios de UI → G4 y G5 obligatorios.
- Cambios de esquema → G8 obligatorio. Cambios de pagos → G9 obligatorio y riesgo alto.
- Tras una reparación: repetir los gates que fallaron + G1.

## Estados

- `PASS`: comando ejecutado en esta sesión, salida guardada, criterio cumplido.
- `FAIL`: comando ejecutado, criterio no cumplido.
- `BLOCKED`: no se puede ejecutar sin una acción fuera de autoridad (producción, credenciales reales, servicio caído).
- `NOT_CONFIGURED`: el proyecto no tiene la herramienta. No cuenta como PASS; se reporta como pendiente.
