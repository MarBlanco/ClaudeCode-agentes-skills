---
name: harness-plan
description: Planificación estructurada de tareas para el Claude Code Harness. Define alcance, DoD, criterios de aceptación, riesgos, archivos afectados y estrategia de verificación antes de implementar.
---

# Harness Plan

Usar antes de tareas no triviales o cuando el alcance pueda afectar arquitectura, múltiples archivos o comportamiento existente.

## Objetivo

Convertir una solicitud en un contrato ejecutable para Claude Code.

## Proceso

1. ANALYZE
   - Inspeccionar estructura, CLAUDE.md, reglas y código relevante.
   - Identificar arquitectura y patrones existentes.
   - Buscar implementaciones existentes antes de crear nuevas.
   - Identificar cambios ya presentes en el working tree.

2. DEFINE SCOPE
   - Objetivo concreto.
   - Archivos/componentes potencialmente afectados.
   - Exclusiones explícitas.
   - Dependencias y riesgos.

3. DEFINE DoD
   Cada resultado debe tener criterios verificables.
   Ejemplos:
   - comportamiento esperado funciona;
   - tests relevantes pasan;
   - tipos/lint/build pasan cuando corresponda;
   - UI verificada cuando corresponda;
   - no existen regresiones conocidas.

4. PLAN
   - Orden mínimo de implementación.
   - Estrategia de verificación.
   - Estrategia de recuperación si falla.

5. DECIDE
   - Si el alcance es claro, continuar.
   - Preguntar únicamente cuando exista una ambigüedad real que pueda cambiar el resultado.
   - No pedir aprobación para decisiones normales ya cubiertas por las reglas del proyecto.

## Restricciones

- No implementar durante la planificación.
- No inventar arquitectura.
- No crear abstracciones innecesarias.
- Reutilizar antes de crear.
- No ampliar el scope.
- El plan debe poder ejecutarse sin volver a planificar desde cero.

## Salida

PLAN:
- Objective
- Scope
- Out of scope
- Acceptance criteria
- Risks
- Implementation steps
- Verification steps
- Max repair iterations: 3
