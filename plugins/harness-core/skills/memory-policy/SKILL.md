---
name: memory-policy
description: Política de memoria persistente del harness - qué guardar, qué no, cómo evitar entradas obsoletas, duplicadas o contradictorias, y cómo auditar la memoria. Usar al guardar o revisar memorias (auto memory), cuando el usuario pida "recordar" algo, o al notar que la memoria acumula ruido.
---

# Memoria persistente

La memoria automática de Claude Code (`~/.claude/projects/<proyecto>/memory/`, índice `MEMORY.md`) ya existe; esta política decide **qué entra**. Otras capas: `CLAUDE.md` (reglas estables y revisadas), `docs/DECISIONS.md` (decisiones), `.harness/state.md` (fase de la tarea en curso).

## Guardar solo lo no derivable del repo
- **user:** rol, nivel, preferencias de trabajo y de respuesta.
- **feedback:** correcciones o confirmaciones del usuario sobre cómo trabajar, con el porqué y cuándo aplicarlo.
- **project:** restricciones, plazos y decisiones externas al código. Fechas absolutas (`2026-11-05`), nunca "ayer" o "la semana próxima".
- **reference:** dónde vive algo fuera del repo (panel, ticket, documento).

## No guardar
Estructura del código, historial de git, soluciones ya aplicadas, contenido de `CLAUDE.md`, estado efímero de la conversación, **secretos o datos personales**, salidas de comandos. Si lo piden igual, preguntar qué fue lo no obvio y guardar solo eso.

## Higiene
1. Un hecho por archivo, con frontmatter `name`, `description`, `metadata.type` y, si aplica, enlaces `[[otro-nombre]]`.
2. Antes de escribir, buscar una memoria existente del mismo tema: actualizarla en vez de duplicar.
3. Si una memoria contradice la realidad observada o a otra más nueva, corregirla o borrarla en el mismo turno.
4. Una línea por memoria en `MEMORY.md`; sin contenido en el índice; menos de 200 líneas.
5. Una memoria que nombra un archivo, función o flag se verifica antes de recomendarla.

## Auditoría
`memory-lint.mjs [directorio]` (en la carpeta de scripts del repo del harness, con `node`): frontmatter inválido, fechas relativas, duplicados, secretos probables, enlaces rotos, índice demasiado largo o desfasado. Solo informa; no modifica. Revisar sus hallazgos con el usuario antes de borrar.
