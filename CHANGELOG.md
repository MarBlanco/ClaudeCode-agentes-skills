# Changelog

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
