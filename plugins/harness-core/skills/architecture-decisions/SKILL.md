---
name: architecture-decisions
description: Decidir y documentar arquitectura de software con criterio - contexto y restricciones, atributos de calidad priorizados, alternativas comparadas, fronteras de módulos, flujo de datos, modos de falla y registro de la decisión (ADR). Usar al diseñar un sistema o módulo nuevo, elegir tecnología o patrón, cambiar fronteras o integraciones, o ante un cambio que cruza varias partes. No usar para cambios locales que respetan la arquitectura existente.
---

# Decisiones de arquitectura

La arquitectura es el conjunto de decisiones caras de revertir. Se toman con alternativas comparadas y se registran.

## Proceso

1. **Contexto y restricciones.** Qué existe (código, datos, infraestructura), tamaño del equipo, escala esperada, presupuesto, plazos, normativa. En bases de código medianas o grandes usar `codebase-memory` si está disponible (estructura, dependencias, impacto); si no, lectura directa.
2. **Atributos de calidad.** Elegir y ordenar los 3 que mandan (seguridad, tiempo de entrega, costo, rendimiento, disponibilidad, mantenibilidad, simplicidad operativa). Sin orden no se puede comparar.
3. **Alternativas.** Mínimo dos reales, incluida la más simple y "no hacer nada". Para cada una: cómo encaja, qué complica, qué costo de cambio futuro tiene.
4. **Decidir con una tabla** alternativas × atributos y justificar la elección. Por defecto: lo más simple que cumple los atributos (monolito modular antes que microservicios; base relacional antes que varias tecnologías de datos) salvo evidencia medible en contra.
5. **Diseñar lo que la decisión implica:**
   - Fronteras de módulos y dirección de dependencias (el dominio no depende de infraestructura).
   - Dueño de cada dato; una sola escritura autoritativa.
   - Flujo de datos y de errores: qué pasa si el servicio X, la base o un proveedor externo no responde (timeouts, reintentos con límite, degradación).
   - Fronteras de seguridad y de tenants (ver `saas-architecture`).
   - Reversibilidad: qué haría falta para deshacer o migrar.
6. **Registrar el ADR** en `docs/adr/NNNN-titulo.md` con la plantilla. Una decisión que reemplaza a otra la marca como "Reemplazada por".
7. **Guardas.** Convertir las reglas clave en comprobaciones automáticas cuando sea posible (regla de dependencias en lint, tests de contrato, presupuesto de tamaño).

## Plantilla ADR

```markdown
# NNNN · <Decisión> (AAAA-MM-DD)
- **Estado:** propuesta | aceptada | reemplazada por NNNN
- **Contexto:** …
- **Decisión:** …
- **Alternativas consideradas:** … (por qué no)
- **Consecuencias:** positivas, negativas, riesgos, cómo se revierte
```

## Reglas

- Cambiar la arquitectura de un proyecto existente exige ADR y aprobación del usuario antes de implementar (regla de "cambios sensibles" del harness).
- No introducir tecnologías, patrones o dependencias sin necesidad demostrada en el ADR.
- No inventar requisitos de escala: pedir el dato o declarar el supuesto.
- La implementación sigue por `harness-plan` → `harness-work`.
