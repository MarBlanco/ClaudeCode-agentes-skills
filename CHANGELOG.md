# Changelog

## repo — 2026-11-07 (skill find-skills y perfil next-drizzle)

### Agregado
- Skill `find-skills` de Vercel (`vercel-labs/skills`, MIT) instalada en `.claude/skills/find-skills` con `npx skills@1.7.6 add https://github.com/vercel-labs/skills --skill find-skills --agent claude-code --copy -y` (sin telemetría). **Sin modificar**: el archivo es idéntico al upstream (commit `d3701c1`, comprobado por hash). Registro en `skills-lock.json` (generado por el CLI), `harness.lock.json` (vigilada por `update-check`) y `NOTICE`. Es una skill de mantenimiento del repo: no se distribuye con los plugins. Sugiere instalar skills de terceros con `-g -y`; en este Harness esa acción sigue exigiendo necesidad justificada y tu autorización.
- Perfil `next-drizzle` (`templates/profiles/next-drizzle.json`): Next.js + Drizzle ORM sobre PostgreSQL local, módulos web y saas, gates G1–G6 y G8.
- `check-skills`: 37 skills.


## prompt-enhancer 0.1.0 — 2026-11-06 (Enhance que se ve en VS Code)

### Nuevo
- Plugin `prompt-enhancer` (scope usuario): el mod propio **Prompt Enhancer** creado en el proyecto del generador de cursos, con su nombre original (`prompt-enhancer`, botón **«Enhance (e)»**; allí se renombró después a `prompt`). Escribís tu idea en pocas palabras, pulsás el botón y se convierte en un prompt completo con **una llamada a Haiku** (esfuerzo bajo, respuesta de hasta 700 tokens); limpia comillas y bloques de código del resultado.
- Se dibuja **siempre** que no haya un turno en curso, sin esperar eventos de edición: por eso se ve en el panel de VS Code, donde el Enhancer oficial de terceros (que muestra el botón solo cuando detecta un borrador de 2 palabras y 10 caracteres a través de eventos de edición) no aparecía. Compone la banda de otros mods con `next(e)`, de modo que «Modelo justo» y «Enhance» se ven a la vez.
- 6 pruebas del motor (4 superficies, turno en curso, una sola llamada a Haiku, limpieza, prompt vacío, fallo del modelo); validación `--strict` y tipos.

### Convivencia con `cc-prompt-enhance-mod`
- Ambos usan el atajo «e»; en la instalación del autor el oficial queda **deshabilitado** (no desinstalado ni modificado) para evitar duplicados. Se vuelve a activar con `claude plugin enable cc-prompt-enhance-mod@harness --scope user`. ADR-020.

### Límites
- No probado en una sesión interactiva real, solo con el kit de pruebas del motor. Si `$.prompt.read` no entrega el borrador en algún panel, el botón avisa «Escribe una idea primero». Una llamada a Haiku por pulsación (consumo no medido).


## cc-prompt-enhance-mod 0.1.0 · harness-mods 0.6.0 — 2026-11-06 (mods de interfaz)

### Nuevo
- **`cc-prompt-enhance-mod` 0.1.0** (plugin de scope usuario): el Prompt Enhancer oficial de **Yigit Budak** ([yibudak/cc-prompt-enhance-mod](https://github.com/yibudak/cc-prompt-enhance-mod), MIT), **incorporado sin ninguna modificación** (commit `8c19505`; 17 archivos idénticos byte a byte al repositorio oficial, comprobado por hash). Botón «Enhance» sobre el prompt: Sonnet afina el borrador usando los últimos 10 mensajes de la conversación; «Revert» deshace; Ctrl+E es opcional y se configura aparte en `~/.claude/keybindings.json` (el Harness no toca ese archivo). Atribución en `NOTICE` y en el `LICENSE` del propio plugin; `.gitattributes` evita que Git normalice sus saltos de línea. Su `plugin validate --strict` y sus 8 pruebas propias pasan.
- **`harness-mods` 0.6.0** (scope usuario): contiene solo el mod de interfaz **«Modelo justo» (m)**, creado en el proyecto del generador de cursos: botón sobre el prompt que clasifica su dificultad y sugiere Haiku, Sonnet u Opus; intenta fijar el modelo si la versión de Claude Code lo permite desde un mod y, si no, muestra el `/model` sugerido. Reglas locales (`hooks/model-level.mjs`): **no llama a ningún modelo**. 4 pruebas del motor y 3 de las reglas.
- CI: la validación de plugins usa Claude Code 2.1.319, la versión con la que se validaron los mods.

### Retirado
- Las versiones propias de «Prompt» (la ampliada con descubrimiento del Harness y la copia adaptada del mod del generador de cursos) **no forman parte del Harness**; el Enhancer es el oficial de terceros. Ver ADR-020.

### Límites
- No probados en una sesión interactiva real, solo con el kit de pruebas del motor. «Modelo justo» puede no poder fijar el modelo según la versión de Claude Code.
- **Consumo del Enhancer oficial:** una llamada a Sonnet por pulsación con el borrador y hasta 12 000 caracteres de conversación (hasta 4096 tokens de salida); es bastante más que la versión simple con Haiku. No se midió aquí.
- **Convivencia de botones (no verificada):** la banda del Enhancer oficial no compone la de otros plugins; según el orden de carga puede ocultar el botón de «Modelo justo» mientras el suyo se muestra.
- ADR-019 y ADR-020.

## harness-core 0.12.2 · harness-payments 0.9.2 — 2026-11-05 (portabilidad, CI y demostraciones)

### Corregido
- **Linux:** el CI de GitHub fallaba en 3 tests de seguridad. `guard.mjs` usaba `path.basename` y `sync-project.mjs` `isAbsolute`, que en Linux no tratan `C:\\...` como ruta de Windows: un `.env` con ruta de Windows no se detectaba como secreto y `C:\\Windows\\x` se aceptaba como relativa. Ahora ambas plataformas separan por `/` y `\\` y rechazan rutas con unidad. Verificado en Windows 10 y Ubuntu (WSL2).
- `payments-engineer` no declaraba `tools` (heredaba todas): ahora lista explícita (Read, Grep, Glob, Edit, Write, Bash, Skill).
- Comentario con nombre de usuario en `agent-policy.mjs`; rutas de máquina eliminadas de scripts y documentación.

### Agregado
- CI: matriz Ubuntu + Windows, validación de plugins con Claude Code 2.1.316, `gitleaks` sobre todo el historial (SHA-256 fijado), `check:consistency` y `demo:sync`.
- `scripts/check-consistency.mjs` (versiones marketplace ↔ plugin ↔ lock ↔ CHANGELOG, hooks, permisos de agentes de solo lectura, rutas privadas, licencia) con 8 tests.
- Demostraciones: `npm run demo:sync` (SyncProject: dry-run, apply, idempotencia, conflicto, rollback) y `npm run demo:qa` (regresión sobre la app con 7 defectos sembrados) + `examples/qa-explorer-run` (informe, capturas y specs reales, con su procedencia).
- README reescrito para revisión técnica; `CAPABILITIES.md` actualizado (inventario, capacidades 23–25 y pruebas del 2026-11-05).

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
