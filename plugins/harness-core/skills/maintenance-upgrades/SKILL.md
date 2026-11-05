---
name: maintenance-upgrades
description: Mantener un proyecto vivo y sano - actualizar dependencias y runtimes de forma controlada, responder a vulnerabilidades, detectar versiones fuera de soporte, refactorizar sin cambiar comportamiento y gestionar deuda técnica. Usar al actualizar paquetes, atender alertas de seguridad o Dependabot, migrar una versión mayor de un framework, limpiar código muerto o reducir deuda. No usar para funcionalidades nuevas.
---

# Mantenimiento y actualizaciones

El mantenimiento es trabajo con riesgo: una cosa por vez, con red de seguridad de pruebas y vuelta atrás clara.

## Actualizar dependencias

1. **Inventario.** `npm outdated` / `pip list --outdated` / el gestor del proyecto, y `osv-scanner scan source -r .` para vulnerabilidades conocidas (herramienta de G6). Revisar PRs de Dependabot si existen.
2. **Clasificar** cada actualización: parche de seguridad (primero) · parche/menor · mayor · runtime o framework fuera de soporte. Comprobar fechas de fin de soporte en la fuente oficial (Node LTS, Python, PostgreSQL, Django LTS, Next.js); no de memoria.
3. **Una preocupación por rama.** Un mayor, o un grupo de parches, nunca varios mayores juntos. Rama de trabajo propia.
4. **Leer las notas de versión y la guía de migración** oficiales (`context7` o la documentación oficial cuando estén disponibles). Anotar cambios incompatibles y verificar si afectan al proyecto.
5. **Actualizar con el gestor de paquetes** (los lockfiles no se editan a mano; el guard lo impide). Ejecutar G1 (tipos, lint, build), G2, G3 si hay UI, y G6. Comparar contra la línea base previa.
6. **Si falla:** causa raíz antes de parchear; máximo 3 intentos; si persiste, revertir la rama y documentar el bloqueo.
7. **Registrar** en `CHANGELOG.md` (sección Seguridad si corresponde) y en el reporte qué se actualizó, qué se verificó y qué queda pendiente.

Un mayor de framework (Next, React, Django, PostgreSQL) es un cambio sensible: pasar por `harness-plan`, con `architecture-decisions` si altera estructura.

## Refactorizar

1. Definir el objetivo concreto y la frontera (qué no se toca). No mezclar refactor con funcionalidad.
2. Asegurar pruebas de caracterización del comportamiento actual antes de mover código; si no existen, escribirlas primero.
3. Pasos pequeños, verdes entre pasos; confirmar con G1+G2 (+G3 si hay UI) tras cada paso.
4. Código muerto: eliminar solo con evidencia (búsqueda de referencias, cobertura, `codebase-memory` si está disponible) y sin que sea API pública.
5. Cambios de comportamiento descubiertos en el camino se separan y se reportan, no se cuelan.

## Deuda técnica

Mantener un registro corto (`docs/tech-debt.md`): qué es, impacto, costo estimado, disparador para pagarla. Priorizar por riesgo (seguridad, datos, disponibilidad) antes que por estética. No pagar deuda por mejoras marginales.

## Reglas

- Sin actualizaciones masivas automáticas ni auto-merge.
- Dependencia nueva solo con necesidad demostrada; revisar licencia y mantenimiento.
- Operaciones sobre producción o datos reales requieren autorización explícita.
