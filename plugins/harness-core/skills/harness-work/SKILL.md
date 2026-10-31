---
name: harness-work
description: Ejecuta tareas de extremo a extremo con implementación, verificación independiente (qa-verifier), revisión independiente (code-reviewer) y reparación automática limitada a 3 ciclos.
---

# Harness Work

Este es el flujo principal de ejecución del Harness.

## Contrato

Una tarea no está terminada porque el código fue escrito.

Está terminada únicamente cuando:
- el objetivo fue implementado;
- el DoD está satisfecho;
- `qa-verifier` aportó evidencia observada de los gates seleccionados;
- `code-reviewer` no encuentra bloqueantes;
- los problemas encontrados fueron reparados y reverificados;
- se alcanzó PASS o el límite de iteraciones.

El implementador nunca certifica su propio trabajo.

## Flujo obligatorio

ANALYZE → PLAN → IMPLEMENT → TEST → REVIEW → FIX → VERIFY → REPORT

Si TEST, REVIEW o VERIFY fallan: FIX (causa raíz con `systematic-debugging`) → VERIFY → REVIEW. Máximo: 3 ciclos de reparación.

## ANALYZE

Antes de modificar:
- leer instrucciones aplicables (CLAUDE.md del proyecto y sus zonas protegidas);
- leer `.claude/harness.manifest.json` si existe (perfil, módulos, comandos de gates);
- inspeccionar estructura y localizar implementación existente;
- revisar estado git y preservar cambios no relacionados.

## PLAN

Usar `harness-plan` para tareas no triviales. El plan fija el nivel de riesgo y los gates (ver `../harness-review/references/gates.md`). En riesgo alto, presentar el plan antes de implementar.

## IMPLEMENT

- Trabajar en una rama de tarea, nunca en `main`/`master` (el guard del harness bloquea commits ahí).
- Cambios mínimos necesarios; reutilizar componentes, servicios, patrones y utilidades existentes.
- No introducir dependencias innecesarias ni modificar archivos fuera del scope sin justificación.
- No borrar funcionalidad existente salvo autorización o necesidad demostrada.
- Checkpoint: tras cada paso verificado, commit local en la rama de tarea (`git commit`). Nunca push automático ni force push; el push siempre requiere confirmación del usuario.

## TEST

Invocar el agente `qa-verifier` con: id de tarea, archivos cambiados, nivel de riesgo y gates. Devuelve una tabla PASS/FAIL/BLOCKED/NOT_CONFIGURED con rutas de evidencia en `.harness/evidence/<tarea>/`.

Para frontend, `qa-verifier` usa la skill `chrome-devtools` cuando hay navegador y URL accesible (consola, red, captura), y Playwright para lo reproducible.

No declarar PASS por ausencia de errores evidentes. NOT_CONFIGURED no es PASS: se reporta como pendiente.

## REVIEW

Después de TEST, invocar `code-reviewer` (read-only) sobre el diff, indicándole la ruta de evidencia. Según el riesgo, sumar especialistas disponibles: `claude-security` si el diff toca auth, permisos, RLS, pagos o secretos; `harness-payments:payments-review` si toca pagos; revisores de `pr-review-toolkit` si están instalados (errores silenciosos, diseño de tipos, cobertura).

## FIX

Si TEST o REVIEW devuelven problemas:
1. clasificar por severidad;
2. causa raíz con evidencia antes de tocar código (`systematic-debugging`);
3. corregir únicamente los hallazgos relevantes;
4. VERIFY: `qa-verifier` repite los gates que fallaron + G1;
5. REVIEW de nuevo.

No ignorar findings críticos o importantes.

## Estado recuperable

Mantener `.harness/state.md` (gitignored) al cerrar cada fase: objetivo, plan, fase actual, gates y resultado, ciclo de reparación (n/3), próximos pasos. Permite reanudar tras compactar o con `--continue`.

## Límites

- Máximo 3 ciclos de reparación por tarea.
- No hacer iteraciones por mejoras marginales.
- Al tercer fallo: STOP. Reportar hipótesis, evidencia y qué quedó pendiente. Sin reintentos idénticos.
- Nunca reiniciar desde cero sin evidencia de que el enfoque actual es incorrecto.
- Operaciones de producción, datos reales, pagos reales, deploys y push: solo con autorización explícita del usuario.

## Reporte final

- Resultado: completado, parcial o bloqueado
- Cambios realizados (archivos)
- Gates ejecutados y resultado, con ruta de evidencia
- Resultado del Reviewer (y especialistas)
- Iteraciones de reparación utilizadas (n/3)
- Pendientes/limitaciones (incluye NOT_CONFIGURED y BLOCKED)
