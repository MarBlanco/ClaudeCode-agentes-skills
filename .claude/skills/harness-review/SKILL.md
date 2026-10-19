---
name: harness-review
description: Revisión independiente de código, plan, scope y evidencia de verificación. Actúa como quality gate del Harness.
---

# Harness Review

Revisión read-only posterior a la implementación.

## Principio

El agente que implementó no debe ser la única fuente de confianza sobre su propio trabajo.

Usar el Agent existente:
`code-reviewer`

## Gate

Revisar:

### Correctness
- lógica;
- edge cases;
- null/undefined;
- estados inválidos;
- errores;
- concurrencia cuando aplique.

### Regression
- comportamiento existente;
- contratos;
- APIs;
- componentes relacionados;
- configuración.

### Architecture
- coherencia con arquitectura existente;
- duplicación;
- abstracciones innecesarias;
- responsabilidades.

### Security
- autenticación/autorización;
- validación;
- secretos;
- exposición de información;
- inputs externos.

### Quality
- mantenibilidad;
- legibilidad;
- manejo de errores;
- tests relevantes.

### Scope
- cambios fuera del objetivo;
- archivos modificados innecesariamente;
- features no solicitadas.

### Evidence
- DoD verificable;
- comandos ejecutados;
- resultados reales;
- evidencia visual cuando corresponda.

## Verdict

`APPROVE`
cuando:
- no existen findings críticos/importantes;
- el DoD está satisfecho;
- la evidencia es suficiente.

`REQUEST_CHANGES`
cuando existe un finding crítico/importante o falta evidencia necesaria.

Los findings menores pueden quedar como observaciones si no afectan el DoD.

## Independencia

- Read-only.
- No modificar código.
- No aprobar basándose únicamente en "build pasó".
- No asumir que la intención del implementador equivale al requisito.

## Repair loop

Cuando el verdict sea REQUEST_CHANGES:

1. devolver findings concretos;
2. permitir al implementador reparar;
3. ejecutar VERIFY nuevamente;
4. volver a revisar.

Máximo total: 3 ciclos de reparación.

Si se alcanza el máximo sin APPROVE:
`BLOCKED — MAX ITERATIONS REACHED`

## Salida

VERDICT: APPROVE | REQUEST_CHANGES | BLOCKED

FINDINGS:
- severity
- file
- line
- problem
- evidence
- required fix

EVIDENCE:
- tests
- build/typecheck/lint
- runtime/UI verification

SCOPE:
- compliant | scope_violation

SUMMARY:
- breve conclusión.
