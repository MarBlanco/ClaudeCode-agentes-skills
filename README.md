# ClaudeCode-agentes-skills — Harness de ingeniería web

Fuente de verdad del harness de Claude Code: reglas globales, un **marketplace privado de plugins** (`harness-core`, `harness-web`, `harness-payments`), perfiles de stack y **SyncProject v2** para aplicarlos a cada proyecto sin pisar su configuración propia.

Objetivo: desarrollo consistente, seguro y verificable. Quien implementa nunca certifica su propio trabajo: verifica `qa-verifier` (sin edición) y revisa `code-reviewer` (solo lectura), con evidencia observada.

## Arquitectura

| Capa | Dónde | Qué |
|---|---|---|
| 1 · Core | plugin `harness-core` (scope usuario) | Método (plan, work, review, systematic-debugging), agentes `code-reviewer` y `qa-verifier`, gates G1–G9, hooks de protección y calidad |
| 2 · Módulos | plugins `harness-web`, `harness-payments` (por proyecto) | Skills web y de pagos; se activan con `enabledPlugins` del proyecto |
| 3 · Perfiles | `templates/profiles/*.json` | Componen módulos, MCP, permisos, comandos de gates, typecheck y archivos de CI |
| 4 · Proyecto | `<proyecto>/` | `CLAUDE.md`, `settings.local.json`, skills propias, `.claude/harness.project.json` (overrides). El harness nunca los escribe |

```text
.claude-plugin/marketplace.json     catálogo "harness"
plugins/harness-core/               skills/, agents/, hooks/ (Node .mjs), tests/
plugins/harness-web/                skills/ (incl. web-qa con plantillas Playwright/axe/LHCI)
plugins/harness-payments/           skills/payments-core (referencias testeadas), payments-review, agents/
templates/profiles/                 vite-supabase, next-payload, django-react, next-supabase, modules.json
templates/ci/                       harness-security.yml (G6 en CI)
scripts/                            install-harness.ps1, sync-project.mjs|.ps1, harness-update-check.mjs,
                                    install-qa-tools.ps1, check-skills.mjs, tests/
harness.lock.json                   inventario versionado de cada componente
global/HARNESS.md                   reglas globales (→ ~/.claude/HARNESS.md)
docs/DECISIONS.md · CHANGELOG.md
```

## Instalación (máquina nueva)

```powershell
.\scripts\install-harness.ps1 -Marketplace       # HARNESS.md + marketplace "harness" + harness-core (usuario)
.\scripts\install-qa-tools.ps1                   # gitleaks y osv-scanner (checksum verificado) en F:\Programacion\ClaudeHarness\bin
npm i -g typescript-language-server@6.0.2 typescript@6.0.3   # LSP (TS 7 no trae tsserver)
claude plugin install typescript-lsp@claude-plugins-official --scope user   # + context7, pr-review-toolkit, claude-security
# Módulos de proyecto: instalarlos deshabilitados a nivel usuario; cada proyecto los habilita
claude plugin install harness-web@harness --scope user;      claude plugin disable harness-web --scope user
claude plugin install harness-payments@harness --scope user; claude plugin disable harness-payments --scope user
claude plugin install mercadopago@claude-plugins-official --scope user; claude plugin disable mercadopago --scope user
```

`~/.claude/settings.json` lleva además `permissions.deny` de `Read/Edit` sobre `.env`, `.env.local`, `.env.*.local`, `.env.development|production|test|staging`. El guard de `harness-core` cubre el resto (otros `.env*`, claves privadas, comandos de shell que los citen).

## Aplicar el harness a un proyecto (SyncProject v2)

```powershell
node scripts/sync-project.mjs --project <ruta> --profile next-payload --modules payments --retire-legacy   # dry-run
node scripts/sync-project.mjs --project <ruta> --apply                                                     # backup + escritura
node scripts/sync-project.mjs --project <ruta> --rollback [<timestamp>]                                    # restaura byte a byte
```

(`scripts/sync-project.ps1` es un envoltorio con los mismos parámetros.)

- Solo toca lo que registró en `.claude/harness.manifest.json`: entradas de `enabledPlugins`, reglas de `permissions`, `mcpServers` de `.mcp.json`, un bloque delimitado de `.gitignore` y archivos de CI de una lista blanca.
- Una entrada que el proyecto ya tenía igual se **adopta** y nunca se retira. Una entrada o archivo gestionado editado o borrado a mano es **conflicto**: no escribe nada y lo reporta.
- Si el proyecto ya tiene su `dependabot.yml` o un workflow con gitleaks/osv-scanner, no se agregan los del harness.
- `--retire-legacy` mueve al backup las copias viejas de skills/agentes del harness en `.claude/`; las skills propias quedan intactas.
- Overrides del proyecto (comandos de gates, typecheck): `.claude/harness.project.json`.

| Proyecto | Perfil | Módulos | Notas |
|---|---|---|---|
| Campito | `vite-supabase` | web | dos apps (overrides); Supabase MCP opcional, no escrito |
| Regalarte | `next-payload` | web, payments | Next DevTools MCP; plugin oficial de Mercado Pago |
| Sentri | `django-react` | web | gates Python vía `backend/.venv` (overrides) |
| Nuevos | `next-supabase` | a elección | base con CI, tests, axe y LHCI |

## Ciclo de trabajo y gates

`ANALYZE → PLAN → IMPLEMENT → TEST → REVIEW → FIX → VERIFY → REPORT`, coordinado por `harness-work`. Máximo 3 ciclos de reparación; al agotarse: STOP con reporte.

| Gate | Qué | Herramienta |
|---|---|---|
| G1 | build, tipos, lint | scripts del proyecto, ruff |
| G2 | unit/integración | Vitest, pytest |
| G3 | E2E | Playwright Test |
| G4 | visual y responsive (375/768/1280) | `toHaveScreenshot` + `chrome-devtools` |
| G5 | accesibilidad | `@axe-core/playwright`, Lighthouse |
| G6 | seguridad | gitleaks, osv-scanner, bandit/pip-audit, `claude-security` |
| G7 | performance | Lighthouse CI |
| G8 | base de datos | migraciones en base local/efímera |
| G9 | pagos | matriz de `payments-review` |

Selección por riesgo y criterios PASS: `plugins/harness-core/skills/harness-review/references/gates.md`. Evidencia en `.harness/evidence/<tarea>/` (gitignored). Estados: PASS, FAIL, BLOCKED (fuera de autoridad), NOT_CONFIGURED (no cuenta como PASS).

## Hooks de `harness-core`

| Evento | Acción |
|---|---|
| PreToolUse | **deniega** lectura/edición de secretos (`.env*` salvo `.example/.sample/.template`, claves privadas, `.credentials.json`) también por Bash/Grep/Glob; edición manual de lockfiles; edición de migraciones ya versionadas; `push --force`; `commit` en `main/master`. **Pide confirmación** en push, reset/clean, rebase, `supabase db push/reset`, `vercel --prod`, `vercel env`, prune de Docker, DROP/TRUNCATE, publish |
| SessionStart | anuncia perfil, módulos, gates y typecheck del manifiesto |
| Stop | typecheck si cambiaron archivos relevantes (con caché; bloquea una vez por cadena) |
| PostToolUse | formateador del proyecto si el manifiesto lo define |

Límite conocido: en Windows nativo no hay sandbox; un script que abra archivos por su cuenta no lo detectan ni `deny` ni el guard.

## Pagos (harness-payments)

`payments-core` define los invariantes (backend como autoridad, el redirect no confirma, webhook verificado + GET al proveedor, idempotencia determinista, centavos enteros, solo credenciales de prueba) y trae implementaciones de referencia testeadas: verificación `x-signature` de Mercado Pago, máquina de estados con los estados reales de la Orders API, flujo de webhook con dedupe y validación de importe, esquema SQL (probado en Postgres 18) y la matriz G9 (13 tests). Lo específico de Mercado Pago se delega al plugin oficial `mercadopago` (4.3.2, Apache-2.0).

## Actualización continua

- `node scripts/harness-update-check.mjs [--offline] [--json] [--out archivo]`: compara `harness.lock.json` con el upstream (releases, commits por ruta, npm, marketplaces) y detecta deriva de versiones en los `CLAUDE.md` de los proyectos. Solo lectura.
- CI (`.github/workflows/harness-ci.yml`): tests, skills y validación en cada push/PR; chequeo semanal que abre o actualiza el issue "Harness update check". Sin despliegues ni auto-merge; acciones fijadas por SHA; 10 min por job.
- Dependabot: GitHub Actions en este repo; en los proyectos, `dependabot.yml` generado si no tienen uno propio. Merge siempre manual.
- Política: componentes críticos (hooks, permisos, payments, core) nunca se actualizan solos; validar en rama, probar y actualizar el lock.

## Backups y rollback

| Qué | Backup | Rollback |
|---|---|---|
| Repo del harness | git, tags `harness-v*` | `git checkout <tag>` + `install-harness.ps1 -Marketplace` |
| `~/.claude` | `F:\Programacion\ClaudeHarness\backups\user-claude-<ts>\` con `SHA256SUMS` | restaurar archivos y `/reload-plugins` |
| Proyecto | `.claude/.harness-backup/<ts>/` en cada `--apply` | `sync-project.mjs --rollback` |
| Plugins | versión en `plugin.json` y en el lock | volver a la versión anterior |

## Verificación del propio harness

```powershell
npm test               # hooks, payments, SyncProject, update-check
npm run check:skills   # frontmatter, nombres únicos, referencias existentes
npm run validate       # claude plugin validate --strict (marketplace y plugins)
```

## Codebase Memory MCP (opcional)

Integración opcional de [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) (MIT), grafo local del código. `scripts\install-harness.ps1 -CodebaseMemory <Status|Install|Update|Remove>`: descarga la release oficial, verifica SHA-256 contra `checksums.txt`, instala en `%LOCALAPPDATA%\codebase-memory-mcp\bin` y registra el MCP con `claude mcp add --scope user`. Índices en `~/.cache/codebase-memory-mcp/`. Reglas de uso en `global/HARNESS.md`. Verificación: `/mcp` o `claude mcp list`.
