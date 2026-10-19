# HARNESS — Reglas globales de trabajo

Reglas reutilizables para cualquier proyecto. No asumen framework, lenguaje, base de datos, proveedor cloud, sistema operativo ni tipo de aplicación.

## Precedencia

Las reglas específicas del proyecto (su `CLAUDE.md`) complementan este archivo y prevalecen en su dominio específico. Este archivo cubre el método de trabajo; el proyecto define arquitectura, diseño, datos, zonas protegidas y estado. Antes de trabajar, leer y respetar las instrucciones del proyecto.

## Principios

- Entender e inspeccionar antes de asumir o modificar.
- Definir el alcance antes de cambiar: qué está dentro y qué está fuera.
- Cambios mínimos, controlados y reversibles. Sin mejoras no solicitadas.
- Reutilizar antes de crear: reutilizar → combinar → adaptar → incorporar → crear.
- Respetar convenciones y arquitectura existentes. No eliminar funcionalidades sin autorización.
- Mantener soluciones simples. No introducir complejidad, patrones, dependencias ni sistemas paralelos sin necesidad demostrable.
- No asumir que el repositorio está limpio o en el estado esperado. Preservar el trabajo existente y los cambios no relacionados; no sobrescribir lo que no se comprende.

## Flujo

1. **ANALYZE** — comprender estructura, arquitectura, tecnologías, reglas aplicables, requerimiento, restricciones, estado actual y riesgos. No modificar archivos salvo para obtener información.
2. **PLAN** — definir qué se modifica, archivos involucrados, fuera de alcance, riesgos, estrategia, capacidades reutilizables y cómo se verificará. Para cambios importantes, planificar antes de implementar.
3. **IMPLEMENT** — seguir el plan; modificar solo lo necesario; cambios pequeños y controlables.
4. **VERIFY** — comprobar según corresponda: errores, tipos, lint, tests, build, comportamiento afectado, seguridad y evidencia visual. Usar una comprobación objetiva cuando exista. Compilar o no ver errores no demuestra que la tarea esté resuelta.
5. **REPORT** — informar qué se hizo, qué se verificó y con qué resultado, problemas encontrados y pendientes. No afirmar como verificado lo que no se comprobó.

## Límites de iteración

- Ningún ciclo sin límite. Todo ciclo de implementar, evaluar, corregir o verificar define máximo de iteraciones.
- Todo workflow iterativo define: condición de éxito, condición de fallo, máximo de iteraciones, criterio de salida y reporte final si no se alcanza el objetivo.
- Estructura: `ANALYZE → IMPLEMENT → VERIFY → PASS → FINISH`, o `… → FAIL → CORRECT → VERIFY → MAX ITERATIONS → STOP + REPORT`.
- Priorizar correcciones de mayor impacto. No iterar por mejoras marginales ni sin evidencia de que aportará valor. No reiniciar desde cero sin razón técnica clara.
- La autonomía nunca prevalece sobre los límites de tiempo, iteraciones o alcance.

## Criterio de finalización

Una tarea está terminada solo cuando: el objetivo está implementado; los cambios están dentro del alcance; las verificaciones relevantes se hicieron; no hay errores conocidos que impidan considerarla funcional; el resultado cumple lo solicitado; los pendientes fueron informados. Si algo no puede comprobarse, decirlo explícitamente.

## Agents y skills

Usarlos solo cuando sean relevantes para la tarea, nunca por estar disponibles. Antes de incorporar o crear una capacidad nueva: revisar las existentes, preferir una solución oficial, luego una externa madura, comparar alternativas y crear una propia solo si no hay alternativa adecuada y la necesidad está justificada. Calidad y utilidad por encima de cantidad.

## Código

Priorizar claridad, mantenibilidad, modularidad, reutilización, tipado, seguridad y performance. No refactorizar código que funciona si no es necesario para el objetivo. No modificar la arquitectura sin razón técnica clara.

## Cambios sensibles

Antes de cambiar arquitectura, base de datos, autenticación, seguridad, infraestructura, dependencias principales o configuración de producción, analizar impacto, dependencias, compatibilidad, efectos secundarios y estrategia de reversión. Ejecutarlos de forma controlada y verificarlos después. No exponer secretos.

## Interfaces y experiencia visual

- Respetar el diseño y las convenciones existentes.
- Usar las capacidades de diseño disponibles cuando sean relevantes (por ejemplo `design-loop`).
- Verificar el resultado real y comprobar los estados relevantes; usar evidencia visual cuando la precisión importe.
- Para inspeccionar o depurar una app web en ejecución (consola, red, DOM, rendimiento) usar la skill `chrome-devtools`; para automatizar flujos o tests, `playwright-cli`. Solo si la tarea necesita navegador. Si falla, informarlo sin inventar resultados.
- Una interfaz no está terminada porque el código compile.
- Los ciclos visuales están sujetos a los límites de iteración. No iterar por mejoras visuales marginales.
