# Decisiones de arquitectura

Registro breve de decisiones del harness (formato ADR). Una decisión nueva que reemplace a otra la marca como "Reemplazada por".

## ADR-001 · Distribuir el núcleo como marketplace privado de plugins (2026-10-31)

- **Contexto:** las skills se copiaban a `~/.claude` y a cada proyecto. Aparecían duplicadas en sesión y derivaban sin control (playwright-cli tenía un typo propio; systematic-debugging, una versión vieja con ejemplos que imprimían secretos).
- **Decisión:** este repo es el marketplace `harness` con tres plugins: `harness-core` (usuario), `harness-web` y `harness-payments` (por proyecto, vía `enabledPlugins`).
- **Consecuencias:** versión por plugin, `claude plugin validate`, activación selectiva, sin duplicados (verificado en sesión real de Campito). Las skills aparecen con prefijo de plugin.

## ADR-002 · Módulos instalados a nivel usuario pero deshabilitados (2026-10-31)

- **Contexto:** `enabledPlugins` del proyecto activa un plugin solo si está en la caché.
- **Decisión:** `harness-web`, `harness-payments` y `mercadopago` se instalan con scope usuario y se deshabilitan ahí; el `settings.json` del proyecto los habilita (precedencia proyecto > usuario).
- **Consecuencias:** sin escribir el plugin en cada proyecto; fuera de los proyectos que los habilitan no aparecen.

## ADR-003 · Hooks del harness en Node (.mjs) (2026-10-31)

- **Contexto:** Windows nativo; `bash` del PATH es el lanzador de WSL; sin sandbox.
- **Decisión:** hooks propios en Node 24 con tests (`node:test`). Fail-open ante error interno del hook (un guard roto que bloquea todo es peor que la red de `permissions.deny`).
- **Consecuencias:** portables; 13 tests de hooks. Los hooks de terceros que usan `bash`/`python3` se probaron en Windows (security-guidance, mercadopago).

## ADR-004 · SyncProject v2 con manifiesto y propiedad explícita (2026-10-31)

- **Decisión:** el harness solo modifica entradas y archivos que registró en `.claude/harness.manifest.json`. Lo preexistente igual se adopta; lo gestionado editado o borrado a mano es conflicto (STOP). Backup y rollback byte a byte en cada `--apply`. Overrides del proyecto en `.claude/harness.project.json`, que el harness nunca escribe. Lógica en Node (testeable); `.ps1` como envoltorio.
- **Seguridad:** rutas de archivos gestionados solo de una lista blanca y contenidas en el proyecto (el manifiesto es editable por PR).

## ADR-005 · Gates como listas de comandos independientes (2026-10-31)

- **Contexto:** en el piloto, `cmd1 && cmd2` ocultó resultados (un lint fallido impidió correr el resto).
- **Decisión:** `gateCommands` acepta un arreglo; `qa-verifier` ejecuta cada elemento aunque falle uno anterior.

## ADR-006 · MCP con acceso a cuentas reales: opcionales, no escritos (2026-10-31)

- **Decisión:** Supabase MCP (Campito) y Vercel MCP (Regalarte) se documentan en el perfil como `optionalMcp` pero SyncProject no los escribe. Conectarlos da acceso a datos reales y requiere autorización explícita del usuario. Next DevTools (local) sí se escribe.

## ADR-007 · TypeScript LSP con TypeScript 6 global (2026-10-31)

- **Contexto:** TypeScript 7.0 (port nativo) solo trae `tsc`, sin `tsserver`.
- **Decisión:** `typescript-language-server@6.0.2` + `typescript@6.0.3` global como respaldo; cada proyecto usa su TypeScript local. El lock fija `majorCap: 6`.

## ADR-008 · Payments Core sobre el contrato existente y referencias testeadas (2026-10-31)

- **Decisión:** no imponer un contrato nuevo; extender el de cada proyecto (Regalarte). Entregar implementaciones de referencia (`mp-signature`, máquina de estados con estados verificados de Orders API, flujo de webhook) con la matriz G9 como tests. Lo específico de Mercado Pago se delega al plugin oficial.
- **Datos no verificables públicamente** (esquema del body de reembolso parcial): consultar el MCP de Mercado Pago antes de implementar.

## ADR-009 · Herramientas y cachés en F: sin mover instalaciones funcionales (2026-10-31)

- **Decisión:** backups, binarios de QA (gitleaks, osv-scanner) y el runner de QA viven en `F:\Programacion\ClaudeHarness\`. El prefijo global de npm y los navegadores de Playwright existentes no se movieron (instalaciones funcionales). La caché de npm ya estaba en F:.

## ADR-010 · Commits de checkpoint solo en ramas de trabajo (2026-10-31)

- **Decisión:** aprobado por el usuario (A7). Commits locales de checkpoint en ramas de tarea; nunca en `main/master`, nunca push automático ni force push. El guard lo hace cumplir (deny/ask).
