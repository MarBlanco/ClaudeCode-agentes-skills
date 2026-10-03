# ClaudeCode-agentes-skills

Configuración reutilizable de **Claude Code** con Skills, agentes, plugins y flujos de trabajo orientados al desarrollo de aplicaciones web modernas.

El objetivo es construir una base modular que pueda reutilizarse en distintos proyectos, manteniendo buenas prácticas de desarrollo, revisión de código, debugging, testing, seguridad y diseño de interfaces.

---

## Objetivo

Este repositorio funciona como una **base de trabajo para Claude Code**.

En lugar de configurar las mismas herramientas en cada proyecto, se centralizan aquí los componentes que pueden reutilizarse en diferentes desarrollos.

La configuración está pensada para ser:

- Modular
- Reutilizable
- Mantenible
- Orientada a buenas prácticas
- Compatible con proyectos web modernos
- Fácil de extender

---

## Estructura

```text
ClaudeCode-agentes-skills/
│
├── .claude/
│   ├── agents/
│   │   └── code-reviewer.md
│   │
│   └── skills/
│       ├── frontend-design/
│       ├── playwright-cli/
│       ├── skill-development/
│       ├── systematic-debugging/
│       ├── vercel-composition-patterns/
│       ├── vercel-react-best-practices/
│       └── web-design-guidelines/
│
├── CLAUDE.md
├── README.md
└── .gitignore