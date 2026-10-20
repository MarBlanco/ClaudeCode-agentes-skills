---
name: harness-work
description: Ejecuta tareas de extremo a extremo con implementación, verificación, revisión independiente y reparación automática limitada.
---

# Harness Work

Este es el flujo principal de ejecución del Harness.

## Contrato

Una tarea no está terminada porque el código fue escrito.

Está terminada únicamente cuando:
- el objetivo fue implementado;
- el DoD está satisfecho;
- la verificación aporta evidencia;
- el Reviewer independiente no encuentra bloqueantes;
- los problemas encontrados fueron reparados y reverificados;
- se alcanzó PASS o el límite de iteraciones.

## Flujo obligatorio

TASK
→ ANALYZE
→ PLAN
→ IMPLEMENT
→ VERIFY
→ REVIEW
→ PASS

Si VERIFY o REVIEW falla:

FAIL
→ IDENTIFY ROOT CAUSE
→ REPAIR
→ VERIFY
→ REVIEW

Máximo: 3 ciclos de reparación.

## ANALYZE

Antes de modificar:
- leer instrucciones aplicables;
- inspeccionar estructura;
- localizar implementación existente;
- revisar estado git;
- entender dependencias;
- preservar cambios no relacionados.

## IMPLEMENT

- Cambios mínimos necesarios.
- Reutilizar componentes, servicios, patrones y utilidades existentes.
- No introducir dependencias innecesarias.
- No modificar archivos fuera del scope sin justificación.
- No borrar funcionalidad existente salvo autorización o necesidad demostrada.

## VERIFY

Elegir evidencia apropiada al tipo de cambio:

Código:
- tests;
- typecheck;
- lint;
- build;
- ejecución real cuando corresponda.

Backend/API:
- tests;
- endpoints;
- contratos;
- errores y casos límite.

Frontend:
- build/typecheck;
- tests;
- ejecución;
- interacción real;
- estados relevantes;
- evidencia visual cuando corresponda (skill `chrome-devtools` si hay navegador y URL accesible: consola, red, captura).

Seguridad:
- revisar validación;
- autorización;
- secretos;
- exposición de datos;
- superficies afectadas.

No declarar PASS por ausencia de errores evidentes.

## REVIEW

Después de VERIFY, ejecutar el Reviewer disponible:
`code-reviewer`

El Reviewer es independiente y read-only.

Debe revisar:
- bugs;
- regresiones;
- seguridad;
- arquitectura;
- calidad;
- cumplimiento del scope;
- cumplimiento del DoD;
- evidencia de verificación.

## REPAIR

Si REVIEW devuelve problemas:
1. clasificar;
2. corregir únicamente los hallazgos relevantes;
3. repetir VERIFY;
4. repetir REVIEW.

No ignorar findings críticos o importantes.

## Límites

- Máximo 3 ciclos de reparación.
- No hacer iteraciones por mejoras marginales.
- Si después de 3 ciclos no se alcanza PASS, detenerse.
- Reportar exactamente qué quedó pendiente y por qué.
- Nunca reiniciar desde cero sin evidencia de que el enfoque actual es incorrecto.

## PASS

Solo emitir PASS cuando exista evidencia suficiente.

## Reporte final

- Objetivo
- Cambios realizados
- Verificaciones ejecutadas
- Resultado del Reviewer
- Iteraciones utilizadas
- Pendientes/limitaciones
