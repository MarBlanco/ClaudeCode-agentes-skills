# ClaudeCode-agentes-skills

Base reutilizable de **Claude Code** con Skills y Agents para utilizar en distintos proyectos de software.

El objetivo es mantener una base pequeña, modular y reutilizable que permita ampliar las capacidades de Claude Code sin duplicaciones ni sobreingeniería.

## Objetivo

Centralizar capacidades reutilizables para:

- Desarrollo de software.
- Diseño frontend.
- Debugging.
- Revisión de código.
- Verificación de interfaces.
- Buenas prácticas de React y Vercel.
- Desarrollo y mantenimiento de Skills.

La base debe evolucionar progresivamente según las necesidades reales de los proyectos.

## Filosofía

> **Evolucionar antes que reconstruir.**

Antes de incorporar una nueva capacidad:

1. Revisar si ya existe una solución adecuada.
2. Buscar primero una solución oficial.
3. Buscar posteriormente soluciones externas maduras.
4. Comparar alternativas.
5. Incorporar únicamente cuando exista una necesidad real.

Principios:

- Calidad > cantidad.
- Reutilización > duplicación.
- Soluciones simples > sobreingeniería.
- Capacidades útiles > acumulación de herramientas.
- No modificar lo que funciona.

## Estructura

```text
ClaudeCode-agentes-skills/
├── .claude/
│   ├── agents/
│   │   └── code-reviewer.md
│   └── skills/
│       ├── chrome-devtools/
│       ├── design-loop/
│       ├── frontend-design/
│       ├── harness-plan/
│       ├── harness-review/
│       ├── harness-work/
│       ├── playwright-cli/
│       ├── skill-creator/
│       ├── skill-development/
│       ├── systematic-debugging/
│       ├── vercel-composition-patterns/
│       ├── vercel-react-best-practices/
│       └── web-design-guidelines/
├── global/
│   └── HARNESS.md
├── scripts/
│   └── install-harness.ps1
├── CLAUDE.md
├── README.md
└── .gitignore
```

## Distribución (cómo llega todo a los proyectos)

Claude Code solo carga Skills y agentes de `.claude/` del proyecto abierto y de `~/.claude/`. Por eso este repo los distribuye con `scripts/install-harness.ps1`:

| Comando | Efecto |
|---|---|
| `.\scripts\install-harness.ps1` | Instala `global/HARNESS.md` como `~/.claude/HARNESS.md` (se carga desde `~/.claude/CLAUDE.md` con `@HARNESS.md`). |
| `... -SyncUser` | Copia Skills y agentes a `~/.claude/skills` y `~/.claude/agents`: quedan disponibles en todos los proyectos. |
| `... -SyncProject <ruta>[,<ruta>]` | Copia Skills y agentes a `<ruta>\.claude\` de cada proyecto. Un proyecto con copia propia tiene prioridad sobre la de usuario. |
| `... -DryRun` | Con los anteriores, solo informa qué haría. |

La sincronización es idempotente (compara contenido ignorando fin de línea), solo toca lo que existe en este repo y no borra nada ajeno (por ejemplo `~/.claude/skills/synced`). Si un destino difiere, guarda antes una copia en `~/.claude/backups/harness-sync-<fecha>`. Reglas que cargan siempre: `HARNESS.md`. Skills: se descubren por su descripción. Agentes: por invocación. MCP: configuración externa (ver abajo). Tras `-SyncUser`, reiniciar Claude Code para que liste las nuevas Skills.

## Agentes y Skills

**Agentes:** `code-reviewer` — revisión de código de solo lectura (calidad, bugs, seguridad, performance, reglas del proyecto).

**Skills:**

| Skill | Función |
|---|---|
| `harness-plan` | Planificación estructurada antes de implementar. |
| `harness-work` | Ciclo de implementación, verificación, revisión y reparación limitada. |
| `harness-review` | Quality gate independiente de código, scope y evidencia. |
| `chrome-devtools` | Inspección de apps web en Chrome real con el MCP `chrome-devtools`. |
| `playwright-cli` | Automatización y pruebas de navegador. |
| `design-loop` | Ciclo construir → criticar → corregir para interfaces. |
| `frontend-design` | Dirección visual y construcción de interfaces. |
| `web-design-guidelines` | Revisión de diseño, accesibilidad y usabilidad. |
| `vercel-composition-patterns` | Patrones de composición React. |
| `vercel-react-best-practices` | Rendimiento React/Next.js. |
| `systematic-debugging` | Investigación de causa raíz. |
| `skill-development` | Crear y mantener Skills. |
| `skill-creator` | Oficial de Anthropic ([anthropics/skills](https://github.com/anthropics/skills), commit `ca45fc4`, Apache 2.0). Crea Skills y las mide: evals, benchmark, optimización de la descripción. Copia del original con **un parche local de seguridad** en `eval-viewer/generate_review.py` (escapa `<`, `>`, `&` en el JSON incrustado; marcado con el comentario "LOCAL SECURITY PATCH"). Al actualizar desde la fuente, reaplicar el parche. |

## Incorporación de nuevas capacidades

Toda nueva Skill, agente u otra capacidad debe evaluarse antes de incorporarse: necesidad real, capacidades similares, duplicación, soluciones oficiales y externas maduras, mantenimiento, compatibilidad, seguridad y utilidad. No se crean capacidades propias cuando exista una solución adecuada reutilizable. Al incorporar una, actualizar este README y el inventario de `CLAUDE.md`, y volver a ejecutar `-SyncUser`.

## Estado actual

- Agentes: 1
- Skills: 12
- Plugins propios: 0
- Workflows formales: 0

El repositorio se mantiene deliberadamente pequeño y evoluciona únicamente cuando una nueva capacidad aporta valor real.

## Codebase Memory MCP (opcional)

Integración opcional de [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) (MIT): indexa el código en un grafo local (SQLite, tree-sitter) y expone herramientas MCP (`index_repository`, `index_status`, `search_graph`, `search_code`, `trace_path`, `get_architecture`, `detect_changes`, entre otras) para explorar estructura, dependencias e impacto de cambios. Todo corre en local, sin API key ni telemetría. No es una Skill ni un agente; las reglas de uso están en `global/HARNESS.md`.

**Requisitos:** Windows x86_64 o ARM64, PowerShell 5.1+, Claude Code (`claude` en PATH). No requiere compilador, Docker ni runtime. Si falla la descarga, Windows Defender/SmartScreen puede marcar el binario sin firmar como falso positivo (ver SECURITY.md del proyecto).

**Instalador (`scripts/install-harness.ps1`):** sin parámetros solo instala `HARNESS.md`. Con `-CodebaseMemory`:

| Valor | Efecto |
|---|---|
| `Status` | Informa si el binario existe y si el MCP está registrado. No modifica nada. |
| `Install` | Descarga el zip de la release oficial más reciente, verifica su SHA-256 contra `checksums.txt`, instala en `%LOCALAPPDATA%\codebase-memory-mcp\bin` y ejecuta `claude mcp add --scope user codebase-memory-mcp`. Si ya existe la entrada, no la toca. |
| `Update` | Igual que `Install`, reemplazando el binario. No cambia el registro existente. |
| `Remove` | `claude mcp remove --scope user codebase-memory-mcp` y borra el binario. Conserva los índices en `~/.cache/codebase-memory-mcp/`. |

No usa el `install.ps1` oficial (que configura varios agentes y puede escribir hooks/skills fuera de este alcance); solo toca `~/.claude.json` vía `claude mcp`. No modifica otros MCP.

**Verificación:** reiniciar Claude Code y ejecutar `/mcp`: debe aparecer `codebase-memory-mcp` conectado con sus herramientas. También `claude mcp list` y `codebase-memory-mcp --version`.

**Activación por proyecto:** el registro es de scope usuario (disponible, pero no impuesto). Cada proyecto decide si lo usa: en la sesión, pedir indexar el repositorio (`index_repository` con la ruta del proyecto) y comprobar con `index_status`. Para fijarlo solo en un proyecto, registrarlo allí con `claude mcp add --scope project` en lugar de `user`.

**Índice:** se guarda en `~/.cache/codebase-memory-mcp/`. Un watcher en segundo plano reindexa los proyectos de las sesiones abiertas (`auto_watch`, activo por defecto); `auto_index` (indexar proyectos nuevos al conectar) está desactivado por defecto. Si los resultados parecen obsoletos, reindexar con `index_repository`.

**Solución de problemas:** servidor no aparece → reiniciar Claude Code y revisar `claude mcp list`; "ya registrado" con ruta vieja → `-CodebaseMemory Remove` y luego `Install`; SHA-256 no coincide → no se instala nada, reintentar o revisar la red; binario bloqueado por antivirus → ver SECURITY.md del proyecto.

**Desinstalación:** `scripts\install-harness.ps1 -CodebaseMemory Remove`. Para borrar también los índices: eliminar `~/.cache/codebase-memory-mcp/`. Para desactivarlo sin desinstalar: `claude mcp remove --scope user codebase-memory-mcp`.
