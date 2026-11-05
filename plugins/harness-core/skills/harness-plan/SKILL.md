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
   - Perfil del proyecto (`.claude/harness.manifest.json`) y zonas protegidas de su CLAUDE.md.

   - Capacidades que aplican (producto, arquitectura, SaaS, datos, APIs, seguridad, entrega): ver [references/capabilities.md](references/capabilities.md). Si el requerimiento es vago o nuevo, empezar por `product-spec`; si existe una spec, usar sus criterios `AC-n` como criterios de aceptación.

3. CLASSIFY RISK
   - Bajo, medio o alto según la tabla de `../harness-review/references/gates.md`.
   - Seleccionar los gates (G1–G9) que exigirá la verificación.
   - Riesgo alto (auth, datos personales, migraciones, pagos, infraestructura): presentar el plan antes de implementar.

4. DEFINE DoD
   Cada resultado debe tener criterios verificables.
   Ejemplos:
   - comportamiento esperado funciona;
   - tests relevantes pasan;
   - tipos/lint/build pasan cuando corresponda;
   - UI verificada cuando corresponda;
   - no existen regresiones conocidas.

5. PLAN
   - Orden mínimo de implementación.
   - Estrategia de verificación.
   - Estrategia de recuperación si falla.

6. DECIDE
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
- Risk level and selected gates (G1–G9)
- Implementation steps
- Verification steps
- Max repair iterations: 3
