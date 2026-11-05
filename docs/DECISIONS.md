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

- **Decisión:** backups, binarios de QA (gitleaks, osv-scanner) y el runner de QA viven en una carpeta fuera de `~/.claude` (en el equipo del autor, `F:\...\ClaudeHarness`; por defecto `~/.claude/harness/`). El prefijo global de npm y los navegadores de Playwright existentes no se movieron (instalaciones funcionales). La caché de npm ya estaba en F:.

## ADR-010 · Commits de checkpoint solo en ramas de trabajo (2026-10-31)

- **Decisión:** aprobado por el usuario (A7). Commits locales de checkpoint en ramas de tarea; nunca en `main/master`, nunca push automático ni force push. El guard lo hace cumplir (deny/ask).

## ADR-011 · QA exploratoria: metodología de Browser UAT Analyst sobre playwright-cli (2026-10-31)

- **Contexto:** faltaba explorar una app sin recorridos conocidos, simular clientes y dejar evidencia y regresión. Candidatas auditadas: *QA Agent* (PramodDutta/qaskills, MIT, autor individual; repo mayormente sitio/SEO; skill de solo prompt de ~120 líneas, sin tests; `name` con espacios inválido para Claude Code; incluye auto-reparación de tests) y *Browser UAT Analyst* (microsoft/cat-agent-skills, MIT; submission de la galería comunitaria, "example implementation" sin soporte de Microsoft, plataforma declarada Scout/Copilot Studio; solo prompt, sin tests; fuerte disciplina de evidencia).
- **Decisión:** base metodológica de Browser UAT Analyst (charter, ledger con "qué prueba", clasificación de fallos, `BLOCKED` ≠ `PASS`), más la fase explorar → recorridos por riesgo de QA Agent, adaptadas en `harness-web:qa-explore`. Ejecución con `playwright-cli` existente (consola, red, capturas, código generado); `chrome-devtools` queda para depuración y performance. Agente `qa-explorer` sin Edit/Write, para aislar el contexto pesado de la exploración y quitar las herramientas de edición. Conserva Bash (necesario para `playwright-cli`), así que "escribir solo en `.harness/qa/<run>/`", "no producción" y "no pagar" son reglas de instrucciones reforzadas por el guard de `harness-core`, no bloqueos técnicos. Trazas de Playwright desactivadas y pase de redacción obligatorio antes del informe. Specs en `.harness/qa/<run>/regression/`, ejecutadas con el `@playwright/test` del proyecto o el runner compartido (ADR-009) vía `NODE_PATH`; su promoción al suite E2E requiere aprobación.
- **Descartado:** auto-reparación de tests (modifica código); secciones de Copilot Studio y presentaciones; instalar Playwright MCP u otro navegador (redundante con `playwright-cli`); *webapp-testing* de anthropics/skills y Playwright Test Agents (planner/generator/healer) no se auditaron en profundidad: el primero duplica `playwright-cli` con scripts Python y el segundo escribe agentes y config MCP en cada proyecto y su healer edita tests.
- **Consecuencias:** aceptación medible con `tests/fixtures/qa-app/EXPECTED.md`. El límite de escritura pasó a ser preventivo con ADR-012. Las fuentes upstream se vigilan en el lock; los cambios se adaptan a mano.

## ADR-012 · Política preventiva por agente en el guard de harness-core (2026-11-01)

- **Contexto:** el límite de escritura de `qa-explorer` dependía de instrucciones (la revisión independiente lo marcó como crítico). Los agentes de plugin no pueden declarar hooks propios, pero el hook PreToolUse recibe `agent_type` cuando el llamador es un subagente (comprobado en sesión real: `harness-web:qa-explorer`).
- **Decisión:** `hooks/agent-policy.mjs`, invocado desde `guard.mjs`, aplica a `qa-explorer` una lista blanca de comandos Bash con análisis consciente de comillas y heredocs, escritura solo en `.harness/qa/<run>/`, navegación solo a hosts locales (o `HARNESS_QA_ALLOWED_HOSTS`, del entorno del usuario, no del repositorio) y falla cerrada ante error interno.
- **Alternativas:** `permissions` por agente (no disponible en agentes de plugin); un hook en el frontmatter del agente (ignorado en plugins); confiar en instrucciones (descartado).
- **Consecuencias:** previene errores e instrucciones inyectadas por una página, no a un agente que ofusque comandos. La revisión independiente halló bypasses en la v1 (backslash, expansiones `${}`/` No es un sandbox: el runner de Playwright ejecuta specs que escribe el propio agente. Un clic en un botón de pago no es detectable por el hook. La lógica es mantenimiento propio: cualquier ampliación de comandos permitidos requiere test.

## ADR-013 · Capacidades de ingeniería SaaS: qué se incorpora y de dónde (2026-11-01)

- **Decisión:** metodología sin fuente oficial adecuada (producto, arquitectura, SaaS, APIs, datos, operación, documentación, mantenimiento) como skills originales y compactas en `harness-core` (universales) y `harness-saas` (módulo por proyecto); lo que tiene fuente buena se vendoriza con commit fijado: `supabase-postgres-best-practices`, `seo`, `owasp-security`. Linters ejecutables (actionlint, hadolint) como gates verificables en lugar de más prosa.
- **Criterios:** licencia leída en el repositorio, solo texto sin ejecutables, mantenimiento reciente, sin duplicar lo existente, sin imponer un stack. Un agente por rol solo si hay independencia que garantizar (`qa-explorer`, `qa-verifier`, `code-reviewer`, `payments-engineer`); las capacidades nuevas no agregan agentes.
- **Descartados y motivos:** `docs/CAPABILITIES.md` §4.
- **Consecuencias:** la activación de skills es asesoría del modelo; la vía fiable es `harness-plan` → `capabilities.md`. `owasp-security` tiene un único autor sin respaldo de OWASP.
`, heredoc dentro de comillas, `cd` condicional, llaves, `sort`/`uniq`/`git`/runner con opciones que ejecutan o escriben); la v2 reduce la gramática a lo mínimo (nada de `$ ` `  ( ) { } * ? [ ]` fuera de comillas simples, `cd` solo como primer comando con `&&` a un directorio existente, corridas `AAAAMMDD-...`, flags del runner en lista blanca). Segunda revisión: más bypasses (delimitadores de heredoc con sufijo, `<<-`, espacios Unicode, `rg --hostname-bin`, `git diff` fuera del repo, `attach`/`state-load`); se pasó de listas de denegación a **listas blancas** de flags (rg, grep, find, ls, cat, head, tail, wc), subcomandos de `playwright-cli` y formas de `git`. Se agotaron los 3 ciclos de reparación del harness: sin tercera revisión. Residual: navegación dentro de la página (`eval`, enlaces), specs escritos por el agente, clic en botones de pago. No es un sandbox: el runner de Playwright ejecuta specs que escribe el propio agente. Un clic en un botón de pago no es detectable por el hook. La lógica es mantenimiento propio: cualquier ampliación de comandos permitidos requiere test.

## ADR-013 · Capacidades de ingeniería SaaS: qué se incorpora y de dónde (2026-11-01)

- **Decisión:** metodología sin fuente oficial adecuada (producto, arquitectura, SaaS, APIs, datos, operación, documentación, mantenimiento) como skills originales y compactas en `harness-core` (universales) y `harness-saas` (módulo por proyecto); lo que tiene fuente buena se vendoriza con commit fijado: `supabase-postgres-best-practices`, `seo`, `owasp-security`. Linters ejecutables (actionlint, hadolint) como gates verificables en lugar de más prosa.
- **Criterios:** licencia leída en el repositorio, solo texto sin ejecutables, mantenimiento reciente, sin duplicar lo existente, sin imponer un stack. Un agente por rol solo si hay independencia que garantizar (`qa-explorer`, `qa-verifier`, `code-reviewer`, `payments-engineer`); las capacidades nuevas no agregan agentes.
- **Descartados y motivos:** `docs/CAPABILITIES.md` §4.
- **Consecuencias:** la activación de skills es asesoría del modelo; la vía fiable es `harness-plan` → `capabilities.md`. `owasp-security` tiene un único autor sin respaldo de OWASP.

## ADR-014 · qa-explorer v4: superficie mínima, red limitada en el navegador y ejecución de specs fuera del agente (2026-11-01)

- **Contexto:** con Bash general, cada revisión adversarial encontró nuevos bypasses del parser de shell; además el agente ejecutaba specs que él mismo escribía y la navegación interna (`eval`, enlaces, formularios) no pasaba por ningún filtro.
- **Decisión:**
  1. Bash del agente reducido a `cd ./<corrida> && playwright-cli -s=<sesión> ...` (solo `&&`, redirecciones de salida a la corrida); los archivos se escriben con la herramienta Write, limitada a la corrida y sin archivos de resolución de módulos (`node_modules`, `package.json`, `tsconfig*`, configs de Playwright/Babel).
  2. `playwright-cli open` exige una configuración que genera el guard fuera de la corrida: proxy sumidero (`http://127.0.0.1:9`) con bypass solo local, `allowedOrigins` locales, perfil aislado, sin acceso libre a archivos. Las sesiones solo se manejan si las abrió el guard con esa configuración; `open` se deniega si existe una config global de playwright-cli.
  3. El agente no ejecuta specs. `qa-regression.mjs` los corre tras `--reviewed`, desde una copia limpia en un temporal (con `tsconfig` vacío propio), con configuración propia y proxy sumidero, dos veces.
  4. Hook `SubagentStop` (`qa-complete.mjs`) exige entregables o la declaración `Estado: INCOMPLETO`.
- **Aislamiento real (contenedor):** evaluado y no implementado. Docker Desktop está instalado pero apagado; arrancarlo puede reiniciar contenedores existentes de otros proyectos (políticas de reinicio que no se pueden inspeccionar sin el daemon). Queda como decisión del usuario. Node `--permission` no sirve porque Playwright necesita lanzar procesos hijos.
- **Consecuencias:** el filtro de shell se volvió una gramática pequeña (más fácil de razonar y probar); la restricción de red la aplica Chromium (verificada contra fetch, IP literal, WebSocket, formularios, enlaces). Residual documentado en `docs/CAPABILITIES.md` §5.

## ADR-015 · Enrutamiento de capacidades determinista y conservador (2026-11-01)

- **Contexto:** en preguntas breves el modelo no cargaba skills (0/3); vía `harness-plan` sí.
- **Decisión:** hook `UserPromptSubmit` (`router.mjs`) que, por palabras clave y solo para módulos habilitados, sugiere hasta tres skills; no fuerza la invocación. `harness-plan` + `references/capabilities.md` sigue siendo la vía determinista para tareas reales.
- **Medido:** la sugerencia llega al contexto (verificado en sesión real); activación en preguntas breves 1/3 con 0/2 falsos positivos en controles negativos.

## ADR-016 · Claude Code 2.1.316 (2026-11-01)

- **Motivo:** el changelog 2.1.289–2.1.316 corrige que `SubagentStop` se disparara cada ~30 s durante la ejecución del subagente (afectaba al hook de entregables) y un caso en Windows en que hooks `PreToolUse` dejaban pasar llamadas sin Git Bash.
- **Reversión:** `claude install 2.1.288` (la versión anterior queda en `~/.local/share/claude/versions`).
- `@playwright/cli` 0.1.23 no se actualizó: solo trae funciones nuevas y podría requerir otro build de Chromium.

## ADR-017 · harness-research: investigación con evidencia como capacidad general (2026-11-03)

- **Contexto:** proyectos de producto (p. ej. un generador de cursos comercializables) necesitan investigación de mercado, competencia, estrategia de producto y análisis de datos; el harness no tenía esas capacidades.
- **Auditoría y fuentes:** se priorizaron Anthropic, Microsoft, Vercel y repositorios MIT. Anthropic `knowledge-work-plugins` (Apache-2.0) cubre competencia, campañas, exploración de producto y análisis de datos. Microsoft no publica un repositorio equivalente (solo documentación de agent skills para SSMS); Vercel ya está incorporado vía `harness-web`. Las skills comunitarias de investigación de mercado revisadas tienen licencias no verificadas o autoría única: no se incorporan.
- **Decisión:** plugin `harness-research` de scope usuario (activo en todas las sesiones) con 5 skills vendorizadas sin cambios (commit fijado en `harness.lock.json` y `NOTICE.md`) y dos propias (`market-research`, `web-research`) que imponen niveles de evidencia y verificación de APIs; agente `market-researcher` de solo lectura. No se copian `data-visualization`/`build-dashboard` porque la sesión ya ofrece `dataviz`; no se instalan los `.mcp.json` de Anthropic (conectores comerciales con credenciales).
- **Especializaciones de dominio** (p. ej. diseño instruccional) viven en el proyecto que las necesita, no en el harness.
- **Consecuencias:** +7 skills en el contexto de todas las sesiones (solo descripciones); actualizar las vendorizadas copiando desde un commit nuevo y revisando el diff.


## ADR-018 · Memoria, continuidad y modelo por tarea sobre mecanismos nativos (2026-11-05)

- **Contexto:** gasto medido en 120 sesiones: $222.72 a precio de lista, dominado por lectura de caché en sesiones largas (Sonnet ≈ $91, Opus ≈ $75; dos sesiones = 57 %). La memoria nativa del repo estaba vacía. No había selección de modelo ni detección de sesiones interrumpidas.
- **Alternativas evaluadas (sin instalar):** claude-mem (nube por defecto, servicio local), cavemem (congelado), basic-memory (AGPL), mem0/graphiti/letta (servicios y bases), MCP server-memory (referencia), claude-code-router/LiteLLM/RouteLLM/claude-code-proxy (gateways: Anthropic no soporta modelos no-Claude vía gateway; riesgo con credenciales de suscripción; RouteLLM abandonado; proxy sin licencia).
- **Decisión:** capa propia delgada sobre lo nativo. Continuidad por hooks con estado local fuera del repo; política y linter de memoria; sugerencia de modelo por reglas deterministas (un hook no puede cambiar el modelo; se aplica delegando con `model=`); escalamiento por evidencia dentro del límite de 3 ciclos.
- **No adoptado:** el campo `memory:` en los subagentes, porque habilita Read/Write/Edit y rompería el solo-lectura de `code-reviewer`/`qa-verifier`. `PreModelSwitch` y `fallbackModel` (no cubre cuota agotada) quedan sin implementar hasta verificar su esquema.
- **Pendiente de medir:** efecto real sobre el gasto (comparar con `/usage`/`session-report`); origen del `advisorModel` visto en transcripciones; si `model:` en skills de plugin se respeta.
- **Reversión:** bajar la versión del plugin; borrar `~/.claude/harness/sessions/` elimina el estado.
