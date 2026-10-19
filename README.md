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
│
├── .claude/
│   ├── agents/
│   │   └── code-reviewer.md
│   │
│   └── skills/
│       ├── chrome-devtools/
│       ├── design-loop/
│       ├── frontend-design/
│       ├── playwright-cli/
│       ├── skill-development/
│       ├── systematic-debugging/
│       ├── vercel-composition-patterns/
│       ├── vercel-react-best-practices/
│       └── web-design-guidelines/
│
├── .playwright/
├── CLAUDE.md
├── README.md
└── .gitignore

Agents
code-reviewer
Agente especializado en revisión de código.
Analiza cambios buscando problemas de calidad, bugs, seguridad, performance, duplicación, manejo de errores, accesibilidad y cumplimiento de las reglas del proyecto.
Skills
chrome-devtools
Inspección y depuración de apps web en un Chrome real mediante el MCP `chrome-devtools` (DOM, consola, red, rendimiento, captura). Complementa a `playwright-cli`, que cubre automatización y tests.
design-loop
Sistema de iteración y verificación visual para interfaces.
Permite trabajar con un ciclo de referencia, implementación, evidencia, crítica, corrección y verificación.
frontend-design
Diseño y construcción de interfaces frontend con una dirección visual definida.
playwright-cli
Interacción y verificación de aplicaciones web mediante Playwright.
skill-development
Guía para desarrollar y mantener Skills de Claude Code.
systematic-debugging
Metodología estructurada para investigar, identificar y corregir problemas técnicos.
vercel-composition-patterns
Patrones de composición para aplicaciones React mantenibles y escalables.
vercel-react-best-practices
Buenas prácticas para React y aplicaciones del ecosistema Vercel.
web-design-guidelines
Criterios y guías para evaluar y mejorar interfaces web.
Incorporación de nuevas capacidades
Toda nueva Skill, Agent u otra capacidad debe evaluarse antes de incorporarse.
Se debe comprobar:
- Necesidad real.
- Existencia de capacidades similares.
- Duplicación.
- Soluciones oficiales disponibles.
- Soluciones externas maduras.
- Mantenimiento.
- Compatibilidad.
- Seguridad.
- Utilidad.
No se deben crear capacidades propias cuando exista una solución adecuada que pueda reutilizarse.
Estado actual
- Agents: 1
- Skills: 9
- Plugins propios: 0
- Workflows formales: 0
El repositorio se mantiene deliberadamente pequeño y evoluciona únicamente cuando una nueva capacidad aporta valor real.
```