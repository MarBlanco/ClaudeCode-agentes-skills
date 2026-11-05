# Capacidades por fase del ciclo de ingeniería

Seleccionar solo las que la tarea necesita. Una skill de un plugin no activado en el proyecto no está disponible: comprobar en la lista de skills de la sesión y, si falta, informarlo y seguir con las disponibles.

| Fase | Necesidad | Capacidad | Plugin |
|---|---|---|---|
| Descubrir | Requisitos vagos, funcionalidad nueva, SaaS | `product-spec` → documento con criterios `AC-n` | core |
| Descubrir | Mercado, demanda, competencia, oportunidades con evidencia | `market-research`, `competitive-brief`, `web-research`, agente `market-researcher` | research |
| Descubrir | Estrategia de producto y lanzamiento | `product-brainstorming`, `campaign-plan` | research |
| Verificar | Análisis de datos y su validación | `statistical-analysis`, `validate-data`; gráficos con `dataviz` | research |
| Diseñar | Arquitectura, tecnología, fronteras, ADR | `architecture-decisions` | core |
| Diseñar | Tenants, auth, roles, planes | `saas-architecture` | saas |
| Diseñar | Modelo de datos, migraciones | `data-modeling-migrations` + `supabase-postgres-best-practices` | saas |
| Diseñar | APIs, servicios, webhooks | `api-design` | saas |
| Mantener | Crear o mantener Skills; evals de una Skill | `skill-development` / `skill-creator` | repo |
| Diseñar | Interfaz y experiencia | `frontend-design`, `design-loop`, `web-design-guidelines` | web |
| Planificar | Alcance, riesgo, gates | `harness-plan` | core |
| Implementar | Coordinar y reparar | `harness-work` | core |
| Implementar | React/Next | `vercel-react-best-practices`, `vercel-composition-patterns` | web |
| Implementar | Pagos y suscripciones (proveedor) | `payments-core`, agente `payments-engineer` | payments |
| Verificar | Gates G1–G9 con evidencia | agente `qa-verifier` | core |
| Verificar | E2E, visual, a11y, performance | `web-qa`; automatizar navegador: `playwright-cli` | web |
| Verificar | Exploración autónoma como cliente | agente `qa-explorer` + `qa-explore` | web |
| Verificar | Seguridad (OWASP) | `owasp-security`; `claude-security` si toca auth, permisos, pagos o secretos | web / oficial |
| Verificar | Defecto con causa desconocida | `systematic-debugging`, `chrome-devtools` | core / web |
| Revisar | Revisión independiente | `harness-review`, agente `code-reviewer`, `payments-review` | core / payments |
| Publicar | SEO técnico | `seo` | web |
| Publicar | Docker, CI/CD, entornos, observabilidad | `ops-delivery` | core |
| Operar | Documentación y runbooks | `tech-docs` | core |
| Mantener | Dependencias, vulnerabilidades, refactor, deuda | `maintenance-upgrades` | core |

Cadena típica de una funcionalidad nueva: `product-spec` → `architecture-decisions` (si hay decisión de estructura) → capacidades de diseño → `harness-plan` → `harness-work` (implementa, `qa-verifier`, `code-reviewer`) → `ops-delivery` si cambia entrega u operación → `tech-docs`.

Cambios de autenticación, permisos, esquema, pagos o infraestructura son riesgo **alto**: plan presentado antes de implementar.
