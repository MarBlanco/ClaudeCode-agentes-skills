# Changelog

## harness-core 0.12.1 · harness-web 0.12.6 — 2026-11-05 (revisión de seguridad automática)

### Seguridad
- `agent-policy.mjs`: la configuración de Playwright (`.playwright/`, `cli.config*.json`) y los archivos de módulos ya no se pueden escribir por Write, redirección de Bash ni `--filename` (antes solo Write); `open` se deniega si existe `.playwright/cli.config.json` en la corrida o en un directorio padre hasta la raíz del proyecto; `close` elimina la sesión del registro.
- `qa-regression.mjs`: nunca usa como runner una carpeta dentro de `.harness/qa`.
- 3 tests nuevos (104 en total). Limitación sin cambios: no es un sandbox de sistema operativo.

## harness-core 0.12.0 · harness-web 0.12.5 · harness-research 0.1.1 — 2026-11-05 (memoria, continuidad y modelo por tarea)

### Nuevo
- Hook `continuity.mjs` (SessionStart, UserPromptSubmit, Stop, SessionEnd): estado mínimo fuera del repo (`~/.claude/harness/sessions/`); avisa al iniciar si la sesión previa quedó interrumpida y, tras compactar, la tarea en curso. No lee transcripciones. 7 tests.
- Skill `memory-policy` y `scripts/memory-lint.mjs` (solo lectura: frontmatter, fechas relativas, duplicados, secretos, enlaces rotos, índice). 3 tests.
- `router.mjs`: sugerencia de modelo determinista (solo cuando se aparta del caso normal: riesgo alto → revisión con opus; búsqueda sin edición → haiku). `harness-work/references/model-routing.md`: tabla de modelo por tarea y escalamiento. ADR-018.
- `global/HARNESS.md`: sección compacta "Memoria y modelos".

### Cambiado
- `CLAUDE.md` del repo: 285 → ~166 líneas; ya no importa `global/HARNESS.md` (se cargaba dos veces); la tabla de capacidades vive solo en `capabilities.md`.
- Modelos: `qa-explorer` inherit → sonnet; `market-researcher` opus → sonnet. `code-reviewer` y `payments-engineer` siguen en opus.

### Corregido
- `qa-explorer.md` estaba corrupto (frontmatter duplicado incrustado en el cuerpo y una viñeta obsoleta suelta): reparado.

## harness-research 0.1.0 · harness-core 0.11.5 — 2026-11-03 (investigación e inteligencia de producto)

### Nuevo
- Plugin `harness-research` (scope usuario): Skills propias `market-research` (niveles de evidencia `verified_sales` / `popularity` / `hypothesis`, inventario de fuentes, nunca inventar cifras) y `web-research` (plan, credibilidad, citas, contenido externo como dato); agente `market-researcher` (solo lectura: WebSearch, WebFetch, Read, Grep, Glob).
- Vendorizadas de `anthropics/knowledge-work-plugins@2574e29` (Apache-2.0): `competitive-brief`, `campaign-plan`, `product-brainstorming`, `statistical-analysis`, `validate-data` (procedencia en `NOTICE.md`).
- `harness-plan/references/capabilities.md`: filas de Descubrir/Verificar para investigación y datos (ADR-017).

## harness-core 0.11.4 · harness-web 0.12.4 — 2026-11-01 (endurecimiento final)

### Seguridad
- **qa-explorer v4** (ADR-014): Bash reducido a `cd ./<corrida> && playwright-cli -s=<sesión> ...`; Write limitado a la corrida y sin archivos de resolución de módulos; `open` exige la configuración de navegador que genera el guard (proxy sumidero, orígenes locales, perfil aislado); solo sesiones abiertas por el guard; `open` denegado si existe `~/.playwright/cli.config.json`; `cd` sin opciones y con `./` o ruta absoluta.
- El agente ya no ejecuta specs: `harness-web/scripts/qa-regression.mjs` los corre tras `--reviewed`, desde una copia limpia, con configuración propia y proxy sumidero, dos veces.
- Hook `SubagentStop` `qa-complete.mjs`: entregables obligatorios (charter, map, ledger, capturas, specs) o `Estado: INCOMPLETO`; marca `HARNESS-INCOMPLETO.txt` si el agente insiste. `report.md` lo guarda quien coordina: Claude Code 2.1.316 no deja que un subagente escriba archivos de informe.
- Guard: falso positivo de `.license.key` corregido sin relajar archivos reales ni `.env*`.
- `install-qa-tools.ps1`: SHA-256 fijados en el script además del archivo de checksums de la release.
- Revisiones adversariales independientes: 2 en esta fase (todos los hallazgos críticos y altos corregidos y convertidos en tests).

### Agregado
- Hook `UserPromptSubmit` `router.mjs`: sugiere capacidades por palabras clave y módulos habilitados (ADR-015).

### Cambiado
- Claude Code 2.1.288 → 2.1.316 (ADR-016). `@playwright/cli` se mantiene en 0.1.22.
- SyncProject: error claro si la ruta del proyecto no existe.

## harness-core 0.10.4 · harness-web 0.11.3 · harness-saas 0.1.1 — 2026-11-01

Capacidades de ingeniería web y SaaS. Matriz, fuentes, licencias, controles y pruebas: `docs/CAPABILITIES.md`.

### Agregado
- **harness-core:** skills `product-spec`, `architecture-decisions`, `ops-delivery` (Docker, CI/CD, entornos, observabilidad), `tech-docs`, `maintenance-upgrades`; enrutador `harness-plan/references/capabilities.md`; trazabilidad `AC-n` y documentación en `harness-review`.
- **harness-core hooks:** `agent-policy.mjs`: política preventiva por agente para `qa-explorer` (lista blanca de Bash, escritura solo en `.harness/qa/<run>/`, hosts locales, gramática mínima, falla cerrada), 24 tests; dos revisiones independientes adversariales y tres ciclos de reparación (listas blancas de flags, subcomandos y formas de git); pueden quedar bypasses no encontrados. `session-start` anuncia las capacidades según los módulos del proyecto.
- **harness-saas (nuevo):** `saas-architecture`, `api-design` (+ webhooks), `data-modeling-migrations` y `supabase-postgres-best-practices` (Supabase, MIT, vendorizada `c9be0e9`). Módulo `saas` en SyncProject; el perfil `next-supabase` (proyectos nuevos) lo habilita.
- **harness-web:** `seo` (Addy Osmani, MIT, `afa8da9`) y `owasp-security` (agamm, MIT, `8ac7965`; OWASP Top 10:2025 y ASVS 5.0).
- **Herramientas:** actionlint 1.7.12 (MIT) y hadolint 2.15.1 (GPL-3.0, solo CLI) en `install-qa-tools.ps1` con SHA-256 verificado.
- `npm run validate` incluye `harness-saas`.

### Corregido
- El límite de escritura del `qa-explorer` dejó de depender solo de instrucciones (ver política arriba). El pago o el envío de datos mediante un clic en la página sigue siendo una regla de instrucciones.

### Verificado
- Ver `docs/CAPABILITIES.md` §6. Sin activación espontánea de skills en preguntas cortas (0/3); sí vía `harness-plan` y por invocación explícita.

## harness-web v0.10.0 — 2026-10-31

### Agregado
- Skill `qa-explore`: QA exploratoria / UAT con charter, mapa, recorridos por riesgo, pase adversarial, ledger de evidencia, clasificación de fallos, informe y specs Playwright de regresión. Adaptada de *Browser UAT Analyst* (microsoft/cat-agent-skills, MIT) y de la fase de exploración de *QA Agent* (PramodDutta/qaskills, MIT); avisos en `references/upstream-licenses.md`.
- Agente `qa-explorer` (Read, Grep, Glob, Bash, Skill; sin Edit/Write): ejecuta `qa-explore` con `playwright-cli`. Escritura solo en `.harness/qa/<run>/`, sin producción, pagos reales ni acciones destructivas: reglas de instrucciones (Bash sigue disponible), no bloqueos técnicos. Trazas desactivadas y pase de redacción antes del informe.
- App de prueba con 7 defectos sembrados y control de pago (`tests/fixtures/qa-app`) + 6 tests: defectos sembrados presentes, páginas sin pistas y sin path traversal (rutas crudas).
- Lock: `skill:qa-explore`, fuentes `upstream:*` vigiladas por `update-check`, `cli:@playwright/cli` 0.1.22.

### Verificado
- Sesión headless real de Claude Code (2.1.288) en un proyecto aislado: reconoce `harness-web:qa-explorer` y `harness-web:qa-explore`; auditoría autónoma a ciegas sobre la app de prueba en 15,5 min: 7/7 defectos sembrados detectados con evidencia (+3 hallazgos adicionales), 0 llamadas al endpoint de pago, 0 secretos tras el pase de redacción, 24 capturas, logs de consola/red y 18 specs (7 pasan / 11 fallan) con resultado idéntico en dos corridas del agente y dos independientes. Una primera corrida se descartó porque el fixture servía pistas de los defectos (corregido y cubierto por test).

## harness-core v0.9.3 — 2026-10-31

### Seguridad
- Hooks de calidad: los comandos del manifiesto (archivo del repo) solo se ejecutan si su hash fue aprobado por el usuario en `~/.claude/harness/approved-commands.json`; SyncProject registra la aprobación en cada `--apply`. Evita ejecución de código al abrir un repo ajeno o con un manifiesto alterado.
- Formato: las rutas con metacaracteres de shell no se pasan al shell.
- `qa-verifier`: revisa los `gateCommands` antes de ejecutarlos (configuración no confiable).

## harness v0.9.2 — 2026-10-31 (rama `feat/harness-v2`)

Primera versión del harness por plugins. Etiqueta previa al cambio: `pre-harness-v2`.

### Agregado
- Marketplace privado `harness` con `harness-core` 0.9.2, `harness-web` 0.9.0 y `harness-payments` 0.9.1.
- Hooks Node: guard de secretos/lockfiles/migraciones/operaciones destructivas, anuncio de perfil, typecheck en Stop y formato.
- Agente `qa-verifier` (sin edición) y catálogo de gates G1–G9 con selección por riesgo.
- Skill `web-qa` con plantillas de Playwright visual, axe y Lighthouse CI (probadas contra Campito).
- Payments Core: `payments-core`, `payments-review`, agente `payments-engineer`, referencias testeadas y esquema SQL.
- SyncProject v2 (`scripts/sync-project.mjs`): perfiles, manifiesto, adopción, conflictos, backup/rollback, archivos de CI gestionados.
- `scripts/harness-update-check.mjs`, `harness.lock.json`, CI semanal y Dependabot.
- `scripts/install-qa-tools.ps1` (gitleaks 8.30.1, osv-scanner 2.7.0 con checksum).
- `scripts/check-skills.mjs` y `package.json` con scripts de verificación.

### Cambiado
- Skills vendorizadas resincronizadas con upstream fijado: Vercel (completas, con `rules/`), playwright-cli, systematic-debugging, frontend-design (+ `LICENSE.txt`), skill-development.
- `code-reviewer` restringido a herramientas de lectura.
- `harness-plan`, `harness-work`, `harness-review` integran riesgo, gates, evidencia, estado y checkpoints.
- `install-harness.ps1`: `-Marketplace` reemplaza `-SyncUser`/`-SyncProject` (que ahora solo avisan).
- Reglas: commits de checkpoint permitidos solo en ramas de trabajo.

### Seguridad
- `skill-creator/eval-viewer`: validación de Host/Origin/Content-Type en el servidor local (CSRF / DNS rebinding).
- SyncProject: rutas de archivos gestionados en lista blanca y contenidas en el proyecto.
