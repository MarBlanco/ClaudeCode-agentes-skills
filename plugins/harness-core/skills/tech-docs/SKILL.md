---
name: tech-docs
description: Escribir y mantener documentación técnica verificada - README con inicio rápido probado, descripción de arquitectura, referencia de API, variables de entorno, runbooks operativos, CHANGELOG y guía de contribución. Usar al crear un proyecto, al cerrar una funcionalidad que cambia el uso o la operación, o cuando la documentación esté desactualizada. No duplicar CLAUDE.md ni repetir lo que el código ya expresa.
---

# Documentación técnica

Documentación que miente es peor que la falta de documentación. Todo lo que se documenta se comprueba.

## Qué documentar y dónde

| Documento | Para quién | Contenido mínimo |
|---|---|---|
| `README.md` | quien llega al repo | qué es, requisitos, instalación y arranque en pocos comandos, cómo correr los tests, estructura |
| `docs/architecture.md` | quien modifica | mapa de módulos, flujo de datos, decisiones clave (enlaces a `docs/adr/`) |
| Referencia de API | integradores | contrato OpenAPI como fuente, ejemplos reales, errores, autenticación |
| Variables de entorno | quien despliega | tabla: nombre, propósito, obligatoria, valor de ejemplo ficticio. Sin secretos reales (`.env.example`) |
| Runbooks `docs/runbooks/` | quien opera | síntoma → diagnóstico → acción → verificación → escalamiento |
| `CHANGELOG.md` | usuarios y equipo | cambios por versión (Agregado, Cambiado, Corregido, Seguridad) |
| `CONTRIBUTING.md` | colaboradores | ramas, commits, revisión, gates de calidad |

## Procedimiento

1. Identificar quién lee y qué tarea quiere completar con el documento.
2. Escribir los pasos como comandos copiables; **ejecutarlos** en un entorno limpio o aislado antes de darlos por buenos. Lo que no se pudo ejecutar se marca como no verificado.
3. Poner versiones y requisitos reales (leer `package.json`, `pyproject.toml`, `.nvmrc`), no de memoria.
4. Enlazar en vez de copiar: una sola fuente por dato. Diagramas como texto (Mermaid) para que se puedan revisar en diff.
5. Actualizar la documentación en el mismo cambio que modifica el comportamiento; `harness-review` lo exige cuando cambian comandos, variables o contratos.
6. Revisar: ¿alguien nuevo puede completar la tarea solo con esto? ¿hay secretos, rutas locales o datos personales? ¿hay afirmaciones sin comprobar?

## Reglas

- No inventar funcionalidades, versiones ni resultados de pruebas.
- Sin "TODO" ni secciones vacías en lo que se entrega.
- Reglas para agentes van en `CLAUDE.md`; esta skill cubre documentación para personas.
- Una referencia de API generada del contrato (OpenAPI) es preferible a una escrita a mano que pueda divergir.
