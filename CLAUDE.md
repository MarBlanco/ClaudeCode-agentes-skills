# CLAUDE.md — Repositorio del Harness

Las reglas globales (`global/HARNESS.md`) se cargan desde `~/.claude/CLAUDE.md` tras `scripts/install-harness.ps1`; no se importan aquí para no duplicarlas en el contexto.

## 1. Propósito

Este repositorio es la fuente de verdad del Harness de Claude Code: reglas globales, agentes y Skills reutilizables entre proyectos.

Su objetivo es conseguir un desarrollo consistente, seguro y verificable, utilizando las capacidades disponibles sin duplicar trabajo ni consumir recursos innecesariamente.

No contiene código de producto ni depende de proyectos consumidores concretos.

## 2. Estructura del repositorio

- `global/HARNESS.md`: reglas globales reutilizables. Se instala como `~/.claude/HARNESS.md`.
- `CLAUDE.md`: reglas de este repositorio. Importa `@global/HARNESS.md`.
- `.claude-plugin/marketplace.json`: catálogo del marketplace privado `harness`.
- `plugins/harness-core|harness-web|harness-saas|harness-payments/`: plugins (skills, agentes, hooks, tests).
- `docs/CAPABILITIES.md`: matriz de capacidades, inventario, fuentes, controles preventivos vs. de instrucciones y pruebas.
- `.claude/skills/`: Skills de mantenimiento del propio repo (`skill-creator`, `skill-development`); no se distribuyen.
- `templates/profiles/`: perfiles de stack y módulos. `templates/ci/`: archivos de CI gestionados.
- `scripts/`: `install-harness.ps1` (HARNESS.md, `-Marketplace`, `-CodebaseMemory`), `sync-project.mjs|.ps1` (SyncProject v2), `harness-update-check.mjs`, `install-qa-tools.ps1`, `check-skills.mjs` y sus tests.
- `harness.lock.json`: inventario versionado de todos los componentes.
- `docs/DECISIONS.md`, `CHANGELOG.md`, `README.md`: decisiones, historial y documentación.

### Inventario

| Plugin | Skills | Agentes |
|---|---|---|
| `harness-core` (usuario) | `harness-plan` (+ `references/capabilities.md`), `harness-work` (+ `references/model-routing.md`), `memory-policy`, `harness-review` (+ `references/gates.md`), `systematic-debugging`, `product-spec`, `architecture-decisions`, `ops-delivery`, `tech-docs`, `maintenance-upgrades` | `code-reviewer` (read-only), `qa-verifier` (sin edición) |
| `harness-web` (por proyecto) | `frontend-design`, `design-loop`, `web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns`, `playwright-cli`, `chrome-devtools`, `web-qa`, `qa-explore`, `seo`, `owasp-security` | `qa-explorer` (Write solo en la corrida; Bash solo `playwright-cli`; red del navegador limitada a localhost; no ejecuta specs — ADR-014) |
| `harness-saas` (por proyecto) | `saas-architecture`, `api-design`, `data-modeling-migrations`, `supabase-postgres-best-practices` | — |
| `harness-payments` (por proyecto) | `payments-core`, `payments-review` | `payments-engineer` |
| `harness-research` (usuario) | `market-research`, `web-research`, `competitive-brief`, `campaign-plan`, `product-brainstorming`, `statistical-analysis`, `validate-data` (las cinco últimas de Anthropic, Apache-2.0) | `market-researcher` (solo lectura, web) |

En sesión aparecen con prefijo de plugin (`harness-core:harness-work`). Hooks de `harness-core`: guard de secretos/lockfiles/migraciones/operaciones destructivas y política por agente (`qa-explorer`), anuncio de perfil y capacidades, enrutador de capacidades y sugerencia de modelo por pedido, continuidad de sesión, entregables de `qa-explorer` al terminar, typecheck en Stop y formato (según el manifiesto del proyecto).

Este inventario describe las capacidades esperadas del repositorio. Antes de utilizarlas, comprobar que la Skill o el agente correspondiente esté disponible en el contexto actual.

No inventar agentes, Skills, plugins, herramientas ni rutas.

## 3. Reglas globales y específicas

- `global/HARNESS.md` contiene exclusivamente reglas aplicables a cualquier proyecto.
- Este `CLAUDE.md` contiene las reglas operativas de este repositorio.
- Cada proyecto consumidor define sus particularidades en su propio `CLAUDE.md`.
- No introducir referencias a proyectos concretos en las reglas globales.
- No duplicar reglas cuando basta con importar o referenciar la fuente correspondiente.
- Ante instrucciones incompatibles, identificar el conflicto y aplicar las instrucciones de mayor prioridad según la jerarquía efectiva de Claude Code.
- Las reglas específicas pueden complementar las globales, pero no autorizan a ignorar instrucciones de mayor prioridad ni controles de seguridad obligatorios.

## 4. Selección y uso de capacidades

Antes de realizar una tarea no trivial, analizar el objetivo, el alcance y las comprobaciones necesarias. Seleccionar únicamente las Skills, agentes y herramientas que aporten valor real.

No cargar ni ejecutar todas las capacidades por defecto.

### 4.1 Planificación

Utilizar `harness-plan` cuando la tarea requiera planificación estructurada, tenga varias etapas, afecte a varias áreas o presente riesgos relevantes.

La planificación debe identificar:

- Objetivo y alcance.
- Archivos y componentes potencialmente afectados.
- Criterios de aceptación.
- Riesgos y dependencias.
- Estrategia de verificación.
- Condiciones de finalización.

Para cambios simples y localizados, evitar planificación extensa si no aporta valor.

### 4.2 Implementación y coordinación

Utilizar `harness-work` como coordinador del ciclo de trabajo para tareas no triviales.

Debe organizar la implementación, las verificaciones, la revisión y las correcciones necesarias conforme a las instrucciones de su propia Skill.

No sustituir sus instrucciones por una segunda implementación paralela del mismo flujo.

### 4.3 Selección de Skills especializadas

La tabla necesidad → capacidad vive en `plugins/harness-core/skills/harness-plan/references/capabilities.md` (única fuente; no duplicarla aquí). Es una guía, no una orden de activar cada Skill; combinar solo las necesarias sin repetir comprobaciones.

Mantenimiento de este repo: `skill-development` (crear/mantener Skills) y `skill-creator` (evals y optimización; oficial de Anthropic, commit `ca45fc4`; cambios locales: dos parches de seguridad en `eval-viewer/generate_review.py` — escape del JSON embebido y validación Host/Origin/Content-Type —, reaplicar al actualizar). Mercado Pago: plugin oficial `mercadopago` (`mp-integration-expert`).

### 4.4 Revisión independiente

Utilizar `harness-review` como control de calidad para tareas no triviales.

Invocar el agente `code-reviewer` (plugin `harness-core`) cuando corresponda una revisión independiente del código, y `qa-verifier` para la verificación ejecutable con evidencia.

El agente debe respetar su alcance de solo lectura: no implementar correcciones ni modificar archivos durante la revisión.

Distinguir entre:
- Revisión de código.
- Pruebas de funcionamiento.
- Inspección visual.
- Verificación de seguridad.

Una modalidad de revisión no sustituye automáticamente a las demás.

## 5. Uso de herramientas y MCP

Las Skills no garantizan que sus herramientas estén disponibles: comprobarlo en la sesión (`/mcp`) antes de depender de ellas, usarlas solo para las comprobaciones pertinentes y, si faltan, informar el bloqueo (no afirmar que se inspeccionó una página ni que la consola está limpia).

- `chrome-devtools`: inspeccionar la app real (URL correcta, consola, red, capturas, estados y tamaños); no para tareas sin navegador.
- `playwright-cli`: recorridos reproducibles y regresiones; no duplicar pruebas con varias herramientas sin evidencia adicional.
- Codebase Memory (opcional; ni Skill ni agente): reglas en `global/HARNESS.md`; se gestiona con `scripts/install-harness.ps1 -CodebaseMemory <Status|Install|Update|Remove>`; comprobar herramientas e índice antes de usarlo; en VERIFY no cuenta como evidencia; indexar un proyecto consumidor requiere autorización (índice en `~/.cache/codebase-memory-mcp/`).

## 6. Contrato de ejecución y reparaciones

Tareas no triviales: `ANALYZE → PLAN → IMPLEMENT → VERIFY → REVIEW → PASS` (detalle en `global/HARNESS.md` y `harness-work`). PASS solo con criterios de aceptación y verificaciones obligatorias cumplidos; si algo no pudo ejecutarse, informarlo y no presentar la tarea como totalmente verificada.

Si algo falla: `FAIL → ROOT CAUSE → REPAIR → VERIFY → REVIEW`, máximo tres ciclos; luego detenerse y documentar el bloqueo. No repetir intentos idénticos sin evidencia nueva ni cambiar configuración global por un problema local. Modelo por tarea y escalamiento: `harness-work/references/model-routing.md`.

## 7. Memoria y continuidad

- Memoria automática nativa (`~/.claude/projects/<proyecto>/memory/`): solo hechos no derivables del repo; política en la skill `harness-core:memory-policy`; auditoría con `node scripts/memory-lint.mjs`.
- Hooks `continuity.mjs`: estado mínimo fuera del repo (`~/.claude/harness/sessions/`); al iniciar avisan si la sesión previa quedó interrumpida y, tras compactar, recuerdan la tarea en curso. Ver ADR-018.

## 8. Evidencia y reporte final

Al finalizar una tarea no trivial, informar brevemente:

- **Resultado:** completado, parcial o bloqueado.
- **Cambios:** archivos y componentes modificados.
- **Skills utilizadas:** capacidades realmente consultadas y aplicadas.
- **Agentes utilizados:** agentes realmente ejecutados y su función.
- **Verificaciones:** pruebas ejecutadas y sus resultados.
- **Evidencia:** capturas, resultados de consola o salidas relevantes cuando existan.
- **Pendientes:** fallos, limitaciones o comprobaciones no ejecutadas.

No afirmar que una Skill fue utilizada únicamente porque estaba instalada o seleccionada.

No afirmar que una prueba pasó sin haberla ejecutado y observado su resultado.

No afirmar que una revisión independiente ocurrió si no se ejecutó realmente.

## 9. Seguridad y control de cambios

- Preservar los cambios existentes del usuario.
- No sobrescribir archivos ni descartar modificaciones ajenas a la tarea.
- No ejecutar operaciones destructivas sin autorización cuando esta sea necesaria.
- No exponer secretos, credenciales ni variables sensibles.
- No modificar configuraciones globales, permisos o integraciones fuera del alcance autorizado.
- Commits locales de checkpoint permitidos solo en ramas de trabajo. Nunca commits directos a `main`, push automático ni force push (el guard de `harness-core` lo hace cumplir). El push siempre requiere confirmación del usuario.
- No instalar dependencias, plugins, agentes o Skills sin una necesidad justificada.
- Ante incertidumbre con impacto relevante, detener la acción de riesgo y explicar el motivo.

## 10. Mantenimiento de la fuente de verdad

- Toda modificación de reglas globales se realiza en `global/HARNESS.md`.
- Después de editarlo, ejecutar `scripts/install-harness.ps1`.
- Después de cambiar un plugin: subir su `version` en `plugin.json`, `npm test`, `npm run check:skills`, `npm run validate`, actualizar `harness.lock.json` y ejecutar `scripts/install-harness.ps1 -Marketplace` (o `claude plugin marketplace update harness` + `claude plugin update <plugin>@harness`).
- Después de cambiar un perfil o SyncProject: `node scripts/sync-project.mjs --project <ruta>` (dry-run) en cada proyecto y luego `--apply`.
- Mantener `HARNESS.md` compacto porque se carga en las sesiones consumidoras.
- Mantener actualizados el inventario (`README.md`, `harness.lock.json`), `CHANGELOG.md` y `docs/DECISIONS.md`.
- Mantener agentes y Skills genéricos y reutilizables.
- No agregar capacidades duplicadas sin demostrar su necesidad.
- Antes de cambiar la arquitectura, comprobar el estado actual y justificar la modificación.
- Verificar las modificaciones realizadas antes de informar que el mantenimiento finalizó.

## 11. Principio operativo

El objetivo no es utilizar la mayor cantidad de herramientas, sino seleccionar las capacidades correctas para resolver cada tarea con el menor trabajo necesario y evidencia suficiente.
