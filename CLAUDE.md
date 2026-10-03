# CLAUDE.md — Base Global

## Propósito

Esta carpeta contiene una base reutilizable de configuración para Claude Code.

Está diseñada para trabajar en diferentes tipos de proyectos de software.

Las reglas específicas de cada proyecto deben definirse en el `CLAUDE.md` propio de ese proyecto.

---

## Principios de trabajo

- Analizar antes de modificar.
- Comprender la arquitectura existente antes de intervenir.
- Planificar cambios importantes antes de ejecutarlos.
- Realizar cambios mínimos y controlados.
- No modificar archivos innecesariamente.
- No eliminar funcionalidades sin autorización.
- Reutilizar código existente cuando sea apropiado.
- Mantener soluciones simples, claras y mantenibles.
- Evitar sobreingeniería.
- Respetar las convenciones existentes del proyecto.
- Verificar los cambios antes de finalizar.

---

## Flujo de trabajo

### 1. ANALYZE

Comprender:

- estructura del proyecto
- arquitectura
- tecnologías
- dependencias
- archivos relevantes
- problema o requerimiento

### 2. PLAN

Definir:

- qué se va a modificar
- qué archivos están involucrados
- posibles riesgos
- estrategia de implementación

### 3. IMPLEMENT

Realizar la implementación siguiendo el plan.

Evitar cambios fuera del alcance.

### 4. VERIFY

Comprobar:

- errores
- tests
- build
- lint
- tipos
- comportamiento afectado

### 5. REPORT

Informar brevemente:

- qué se hizo
- qué se verificó
- cualquier problema pendiente

---

## Código

Priorizar:

- claridad
- mantenibilidad
- modularidad
- reutilización
- tipado cuando corresponda
- buenas prácticas
- seguridad
- performance

No introducir patrones complejos sin necesidad.

---

## Cambios sensibles

Antes de realizar cambios importantes en:

- arquitectura
- base de datos
- autenticación
- seguridad
- infraestructura
- dependencias principales
- configuración de producción

analizar primero el impacto.

---

## Contexto del proyecto

Las reglas, tecnologías y decisiones específicas del proyecto tienen prioridad cuando estén definidas en el `CLAUDE.md` de ese proyecto.

Esta base no debe asumir:

- framework
- lenguaje
- base de datos
- proveedor cloud
- sistema operativo
- arquitectura
- tipo de aplicación

---

## Regla principal

Entender primero.

Planificar después.

Modificar únicamente lo necesario.

Verificar siempre.