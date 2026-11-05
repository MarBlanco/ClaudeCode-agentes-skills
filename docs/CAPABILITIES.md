# Capacidades del Harness: matriz, fuentes y controles

Estado al 2026-11-01 · harness-core 0.11.4 · harness-web 0.12.4 · harness-saas 0.1.1 · harness-payments 0.9.1.

## 1. Arquitectura

```
~/.claude (usuario)                    Proyecto consumidor (SyncProject v2)
  HARNESS.md  ← global/HARNESS.md        .claude/settings.json  enabledPlugins por módulo
  plugin harness-core (siempre activo)   .claude/harness.manifest.json  perfil, gates, módulos
    método: product-spec · architecture-decisions · harness-plan/work/review
            systematic-debugging · ops-delivery · tech-docs · maintenance-upgrades
    agentes: code-reviewer (lectura) · qa-verifier (sin edición)
    hooks:  guard (secretos, lockfiles, migraciones, git, producción) + agent-policy
            session-start (perfil, gates, capacidades) · quality (typecheck, formato)
  plugins de módulo (instalados, deshabilitados; el proyecto los habilita):
    harness-web      frontend, diseño, QA web, qa-explorer, SEO, OWASP
    harness-saas     SaaS multi-tenant, APIs, datos y migraciones, PostgreSQL
    harness-payments pagos (Mercado Pago) + plugin oficial mercadopago
  herramientas: playwright-cli, @playwright/test (runner compartido), gitleaks, osv-scanner,
                actionlint, hadolint, chrome-devtools MCP, codebase-memory MCP (opcional)
```

Flujo: `product-spec → architecture-decisions → (capacidades de diseño) → harness-plan → harness-work (implementa → qa-verifier → code-reviewer → reparación ≤3) → ops-delivery / tech-docs`. Enrutador por fase: `plugins/harness-core/skills/harness-plan/references/capabilities.md`.

## 2. Matriz de las 22 capacidades

Leyenda de verificación: **R** registro (Claude Code 2.1.288 lista la skill/agente en una sesión headless) · **I** invocación real en una tarea · **T** tests automatizados · **H** herramienta ejecutada contra archivos reales · **E** heredado de versiones anteriores, no vuelto a probar en esta tarea.

| # | Capacidad | Componentes | Origen | Estado | Verificación y límites |
|---|---|---|---|---|---|
| 1 | Producto y requisitos | `product-spec` | original | Implementada | R. No se invocó en una sesión real (el modelo respondió de memoria); su método no se probó de punta a punta |
| 2 | Planificación y tareas | `harness-plan`, `harness-work`, `harness-review` | original (heredado) | Verificada | I: `harness-plan` invocada y enruta a skills SaaS (prueba 2026-11-01). Nuevo: criterios `AC-n` y trazabilidad |
| 3 | Arquitectura | `architecture-decisions` | original | Implementada | R. Mencionada en el plan de la prueba, no invocada directamente |
| 4 | UX/UI | `frontend-design`, `design-loop`, `web-design-guidelines` | Anthropic (Apache-2.0), devonbweaver (MIT), Vercel | Heredada | E |
| 5 | Frontend React/Next/TS/CSS | `vercel-react-best-practices`, `vercel-composition-patterns`, `typescript-lsp`, `next-devtools` MCP | Vercel, Anthropic | Heredada | E |
| 6 | Backend y APIs | `api-design` (+ `references/webhooks-integrations.md`) | original | Implementada | R. Contenido sin ejecutar contra un backend real |
| 7 | Bases de datos | `data-modeling-migrations`, `supabase-postgres-best-practices`, gate G8 | original + Supabase (MIT) | Implementada | R + I (la segunda aparece en el plan). Supabase MCP sigue como opcional no escrito |
| 8 | Autenticación y autorización | `saas-architecture`, plugin `security-guidance` | original; Anthropic | Verificada (invocación) | I: `saas-architecture` cargada por `harness-plan`; su respuesta coincide con el contenido de la skill |
| 9 | SaaS y multi-tenancy | `saas-architecture` | original | Verificada (invocación) | I. No se construyó un SaaS de prueba con tests de aislamiento (pendiente) |
| 10 | Suscripciones, facturación, pagos | `payments-core`, `payments-review`, `payments-engineer`, `mercadopago`, entitlements en `saas-architecture` | original, Mercado Pago (Apache-2.0) | Heredada + ampliada | E para pagos (matriz G9 con 13 tests). Stripe no incorporado (ver §4) |
| 11 | Integraciones y webhooks | `api-design/references`, `payments-core/references/webhook-handler.mjs` | original | Implementada | Referencia de webhook de pagos con tests (E); la guía genérica no se ejecutó |
| 12 | Seguridad y OWASP | `owasp-security`, `claude-security`, `security-guidance`, gitleaks, osv-scanner, G6 | agamm (MIT), Anthropic, Google/Gitleaks | Implementada | R. Autor individual de `owasp-security`: contenido revisado por muestreo, no auditado línea a línea |
| 13 | Testing unit/integración/E2E | `web-qa`, `qa-verifier`, G2/G3 | original + Playwright (Apache-2.0) | Heredada | E. Sin skill específica por framework: se usa el del proyecto |
| 14 | QA exploratorio | `qa-explore`, `qa-explorer` + política del guard | adaptada de Microsoft y qaskills (MIT) | **Verificada** | I (dos corridas a ciegas, 7/7 defectos, 0 llamadas de pago), T (política), prueba viva de bloqueo con el agente real |
| 15 | Accesibilidad y responsive | `web-design-guidelines`, axe (G5), `qa-explore` (375 px) | Vercel, Deque (MPL-2.0) | Heredada | E; revisión móvil verificada en la corrida de QA |
| 16 | Rendimiento | Lighthouse CI (G7), `chrome-devtools`, `vercel-react-best-practices` | Google, Vercel | Heredada | E |
| 17 | SEO | `seo` | Addy Osmani (MIT) | Implementada | R. No se ejecutó contra un sitio real |
| 18 | Docker y CI/CD | `ops-delivery` (docker.md, ci-cd.md), actionlint, hadolint | original; rhysd (MIT), hadolint (GPL-3.0, solo CLI) | Verificada (herramientas) | H: actionlint 0 hallazgos en los 2 workflows del repo y en el generado para un proyecto nuevo; hadolint detecta 6 problemas en un Dockerfile defectuoso |
| 19 | Despliegues y entornos | `ops-delivery/references/environments.md` | original | Implementada (solo guía) | Sin despliegue real por diseño (requiere autorización). Sin skill específica de proveedor |
| 20 | Observabilidad | `ops-delivery/references/observability.md` | original | Implementada (solo guía) | Sin herramienta ni prueba ejecutable; las skills de OpenTelemetry quedan como opción |
| 21 | Documentación técnica | `tech-docs` | original | Implementada | R |
| 22 | Mantenimiento | `maintenance-upgrades`, `harness-update-check`, Dependabot | original | Implementada | R; `update-check` verificado (lee las fuentes upstream y detecta Claude Code 2.1.316 y `@playwright/cli` 0.1.23 disponibles) |

## 3. Inventario

| Tipo | Elementos |
|---|---|
| Plugins del harness | `harness-core` 0.10.1 · `harness-web` 0.11.0 · `harness-saas` 0.1.0 · `harness-payments` 0.9.1 |
| Skills (28) | core: harness-plan, harness-work, harness-review, systematic-debugging, product-spec, architecture-decisions, ops-delivery, tech-docs, maintenance-upgrades · web: frontend-design, design-loop, web-design-guidelines, vercel-react-best-practices, vercel-composition-patterns, playwright-cli, chrome-devtools, web-qa, qa-explore, seo, owasp-security · saas: saas-architecture, api-design, data-modeling-migrations, supabase-postgres-best-practices · payments: payments-core, payments-review · repo: skill-creator, skill-development |
| Agentes | `code-reviewer`, `qa-verifier` (core) · `qa-explorer` (web) · `payments-engineer` (payments). No se agregaron más: las capacidades nuevas son metodología, no roles independientes |
| Hooks (harness-core) | `guard.mjs` (PreToolUse), `agent-policy.mjs` (llamado desde el guard), `session-start.mjs`, `quality.mjs` (PostToolUse formato; Stop typecheck) |
| MCP | chrome-devtools (usuario), codebase-memory (usuario, opcional), next-devtools (por perfil), mercadopago (proyecto), context7 (requiere autorización del usuario) |
| CLI | gitleaks 8.30.1, osv-scanner 2.7.0, actionlint 1.7.12, hadolint 2.15.1 (todos con SHA-256 verificado), `@playwright/cli` 0.1.22, Node ≥ 22 |

## 4. Fuentes, licencias y selección

| Componente | Fuente y versión fijada | Licencia (verificada en el repositorio) | Por qué |
|---|---|---|---|
| `qa-explore` | microsoft/cat-agent-skills `3678d23`, PramodDutta/qaskills `6ea7d56` (adaptada) | MIT, MIT | ADR-011 |
| `supabase-postgres-best-practices` | supabase/agent-skills `c9be0e9` | MIT (Supabase) | Fuente oficial del proveedor, mantenida, solo texto; sirve para cualquier PostgreSQL |
| `seo` | addyosmani/web-quality-skills `afa8da9` | MIT | Ingeniero de Chrome; basada en Lighthouse y las guías de Google; evita prometer posicionamiento |
| `owasp-security` | agamm/claude-code-owasp `8ac7965` | MIT | Alineada con OWASP Top 10:2025 y ASVS 5.0 (versión de ASVS confirmada en owasp.org). Autor individual sin respaldo de OWASP |
| actionlint | rhysd/actionlint v1.7.12 | MIT | Linter de referencia de GitHub Actions |
| hadolint | hadolint/hadolint v2.15.1 | GPL-3.0 | Solo se ejecuta como CLI externo; no se redistribuye ni se copia |
| Skills originales (8: 5 core + 3 saas) | este repositorio | UNLICENSED (propio) | No hay fuente oficial adecuada para esa metodología |

Los componentes de terceros se revisaron antes de incorporarlos: sin ejecutables ni scripts, texto escaneado por patrones de ejecución remota o inyección (las únicas coincidencias son advertencias educativas de seguridad), commit fijado y registrado en `harness.lock.json` para que `update-check` avise de cambios.

**Descartados**
- **Stripe** (`stripe/ai`, MIT): específico de un proveedor; los proyectos usan Mercado Pago. Agregar por proyecto si algún día se usa Stripe.
- **OpenTelemetry de ollygarden** (Apache-2.0, 19 skills): mucha superficie para una capacidad que aquí es guía; queda como opción por proyecto.
- **`deploy-to-vercel`** (Vercel): acopla el flujo al despliegue en producción con token; `ops-delivery` define la política de autorización y cada proyecto añade su proveedor.
- **`webapp-testing` y Playwright Test Agents**: duplican `playwright-cli`/`qa-explorer` y su sanador edita tests.
- **`doc-coauthoring`, `mcp-builder`, `claude-api`** (anthropics/skills): no cubren una capacidad faltante.
- **Skills de pruebas por framework (Jest, Cypress, k6, pytest)**: repetirían documentación oficial; el proyecto ya define su herramienta y los gates la ejecutan.

## 5. Controles: preventivos frente a instrucciones

| Control | Tipo | Cómo se comprobó |
|---|---|---|
| Lectura/edición de archivos de secretos (`.env*`, claves) por herramientas y por Bash | **Preventivo** (hook, bloquea) | Tests; el guard bloqueó comandos reales de esta sesión |
| Edición de lockfiles y migraciones versionadas | Preventivo | Tests |
| Commit en `main`/`master`; force push | Preventivo | Tests y sesión headless real (1 solo commit tras el intento) |
| Push, reset duro, DROP/TRUNCATE, `supabase db push`, `vercel --prod`, publicar | Confirmación del usuario (hook `ask`) | Tests |
| Comandos del manifiesto (typecheck, formato) | Preventivo: solo con hash aprobado por el usuario fuera del repo | Tests |
| `qa-explorer` (v4): Write solo dentro de `.harness/qa/<AAAAMMDD-...>/`; Bash solo `cd ./<corrida> && playwright-cli -s=<sesión> ...`; sesiones solo las abiertas por el guard con su configuración; `cd` sin opciones ni CDPATH | **Preventivo** (política del guard, falla cerrada). No es un sandbox del sistema | 13 tests de política (cada bypass hallado en cuatro revisiones es un caso de regresión) y prueba end-to-end en Claude Code 2.1.316 real con un agente doble: 15 de 17 intentos hostiles bloqueados, los 2 legítimos permitidos, verificado en disco |
| Red del navegador del `qa-explorer`: proxy sumidero, `allowedOrigins` locales, perfil aislado | **Preventivo en el navegador** (lo aplica Chromium, no instrucciones) | Prueba real: `fetch` a dominio e IP, WebSocket, imagen, POST de formulario, `goto` y enlace por JS hacia hosts externos, todos bloqueados; app local 200. Service worker: el registro no se bloquea, su tráfico externo sí (proxy) |
| `qa-explorer`: no hacer clic en "pagar", no enviar datos reales, redactar secretos | **Solo instrucciones** (el navegador no alcanza proveedores reales, pero el backend de la app sí) | Tres corridas a ciegas: 0 llamadas a `/api/pay` |
| Specs escritos por el agente | **No ejecutados por el agente**. Los corre `qa-regression.mjs` con config propia, solo tras `--reviewed`. El filtro estático NO es un control (una revisión lo esquivó con metaprogramación) | 2 corridas reales reproducibles; tests del runner |
| Entregables del `qa-explorer` | **Preventivo** (hook `SubagentStop`: bloquea una vez si faltan y no se declaró INCOMPLETO; si insiste, marca la corrida) | Tests + observado en vivo |
| Activación de skills y uso del enrutador de capacidades | Asesoría (el modelo decide) | Ver §6 |

Residual del `qa-explorer` (fase final): el código de los specs corre con los permisos del usuario cuando se ejecuta `qa-regression.mjs` (la revisión humana es el control); un clic en un botón de pago llega al backend de la app (control de entorno: credenciales sandbox); el registro de service workers no se bloquea; WebSocket a otros puertos locales no pasa por `allowedOrigins`; una sesión registrada que luego se reabra por fuera del harness podría manejarse. **El aislamiento real del sistema (contenedor) no está implementado**: Docker Desktop está instalado pero apagado, y arrancarlo puede reiniciar contenedores existentes de otros proyectos, por lo que queda como decisión del usuario.

Límites que el hook no cubre: en Windows nativo no hay sandbox; nombres de archivo ofuscados (`cat .e""nv`), scripts que abren archivos por su cuenta y specs de Playwright que el propio agente escribe y el runner ejecuta pueden esquivar los controles. La política del `qa-explorer` previene errores e instrucciones inyectadas por una página; no contiene a un agente deliberadamente hostil. El guard falla abierto ante errores internos (salvo para `qa-explorer`).

Falso positivo de `.license.key`: corregido. Una palabra con forma de ruta de propiedades solo se exceptúa si viene dentro de una expresión (precedida por `(` o `(`) y no existe ese archivo; `cat .tls.key`, `cd certs && cat .tls.key` y `--jq .license.key` (sin paréntesis) siguen bloqueados.

## 6. Pruebas ejecutadas (2026-11-01)

| Prueba | Resultado |
|---|---|
| `npm test` (hooks, política, SyncProject, update-check, fixture QA) | 77 pasan, 0 fallan |
| `npm run check:skills` | 28 skills, nombres únicos, referencias existentes |
| `npm run validate` (marketplace + 4 plugins, `--strict`) | 5/5 |
| Caché de plugins vs fuente (`diff -r`) | idéntica en core, web y saas |
| Sesión headless en proyecto nuevo (perfil `next-supabase`) | 11 skills nuevas y 3 agentes registrados |
| Activación espontánea (3 preguntas cortas, con anuncio de capacidades en SessionStart) | **0/3**: el modelo respondió sin cargar skills |
| `harness-plan` en tarea real (organizaciones, roles y planes) | invoca `harness-plan` y `saas-architecture`; el plan enruta a ADR, `data-modeling-migrations` y `supabase-postgres-best-practices` |
| Invocación explícita de `saas-architecture` | carga la skill; la respuesta coincide con su contenido |
| SyncProject con `next-supabase` en proyecto aislado | aplica web+saas, backup, idempotente |
| actionlint (3 workflows) / hadolint (Dockerfile malo y bueno) | 0 hallazgos / 6 hallazgos en el defectuoso |
| Política del `qa-explorer` con el agente real (v1, antes de la reescritura) | 5 de 6 bloqueados con el motivo exacto, el permitido ejecutó; sin archivos fuera de la corrida. Repetida con las políticas v2 y v3: ver más abajo |
| Instalador de herramientas (4 binarios) | SHA-256 verificado, `-Status` correcto |

**Conclusión sobre activación:** las skills se cargan de forma fiable cuando una tarea pasa por `harness-plan`/`harness-work` o se invocan por nombre; en preguntas cortas el modelo puede no usarlas. El anuncio de SessionStart lo recuerda pero no lo garantiza.

## 7. Fase final de endurecimiento (2026-11-01)

| Área | Estado anterior | Trabajo realizado | Prueba ejecutada | Resultado |
|---|---|---|---|---|
| Bash del `qa-explorer` | Filtro de shell amplio con bypasses recurrentes | Superficie mínima: `cd ./<corrida> && playwright-cli -s=` (ADR-014) | 13 tests de política; e2e real 18/20 bloqueados | Verificado con revisión independiente (2) |
| Escritura del `qa-explorer` | Vía redirecciones/heredoc de shell | Herramienta Write limitada a la corrida, sin archivos de módulos | Tests + e2e real | Verificado con revisión independiente |
| Red del navegador | Solo filtro de URL en `open/goto` | Config del guard: proxy sumidero, orígenes locales, sesiones registradas, sin config global | Prueba real de 8 vías de salida | Verificado funcionalmente; SW se registra (tráfico bloqueado) |
| Specs del agente | Los ejecutaba el propio agente | `qa-regression.mjs --reviewed`, copia limpia, config propia, 2 corridas | Ejecución real + ataques de módulos | Verificado; el filtro estático **no** es un control |
| Entregables | Solo instrucciones | Hook `SubagentStop` | Tests + observado en vivo | Verificado; `report.md` lo guarda quien coordina (restricción de Claude Code) |
| Botón de pago | Solo instrucciones | Navegador sin acceso a proveedores reales | 4 auditorías: 0 llamadas a `/api/pay` | **No garantizado** (el backend de la app puede cobrar: requiere credenciales sandbox) |
| Aislamiento de sistema | Ninguno | Evaluado (Docker, WSL, `--permission`) | — | **Pendiente / no garantizado**: requiere decisión del usuario (Docker) |
| Guard `.license.key` | Falso positivo | Excepción solo dentro de expresiones | Tests (incl. bypasses de revisión) | Verificado con revisión independiente |
| Activación de skills | 0/3 espontánea | Enrutador `UserPromptSubmit` | 5 sesiones reales | Implementado; mejora parcial (1/3), sin falsos positivos |
| Claude Code | 2.1.288 | 2.1.316 (corrige `SubagentStop` y hooks en Windows) | Todas las pruebas vivas sobre 2.1.316 | Verificado; reversión `claude install 2.1.288` |
| `@playwright/cli` | 0.1.22 | Sin cambio (0.1.23 sin correcciones relevantes) | — | Decisión documentada |
| Instalador de herramientas | Checksum de la misma release | SHA-256 fijado en el script | Reinstalación real | Verificado con revisión independiente |
| SyncProject | Error engañoso con ruta inexistente | Mensaje claro | Test + dry-run real | Verificado |
