# CLAUDE.md — Repositorio del Harness

@global/HARNESS.md

## 1. Propósito

Este repositorio es la fuente de verdad del Harness de Claude Code: reglas globales, agentes y Skills reutilizables entre proyectos.

Su objetivo es conseguir un desarrollo consistente, seguro y verificable, utilizando las capacidades disponibles sin duplicar trabajo ni consumir recursos innecesariamente.

No contiene código de producto ni depende de proyectos consumidores concretos.

## 2. Estructura del repositorio

- `global/HARNESS.md`: reglas globales reutilizables. Se instala como `~/.claude/HARNESS.md`.
- `CLAUDE.md`: reglas de este repositorio. Importa `@global/HARNESS.md`.
- `.claude/agents/`: agentes especializados compartidos.
- `.claude/skills/`: Skills compartidas.
- `scripts/install-harness.ps1`: instala o actualiza `HARNESS.md`.
- `README.md`: documentación e inventario del repositorio.

### Inventario de Skills

- `chrome-devtools`
- `design-loop`
- `frontend-design`
- `harness-plan`
- `harness-review`
- `harness-work`
- `playwright-cli`
- `skill-development`
- `systematic-debugging`
- `vercel-composition-patterns`
- `vercel-react-best-practices`
- `web-design-guidelines`

### Agentes compartidos

- `code-reviewer`: revisión independiente de código, de solo lectura.

Este inventario describe las capacidades esperadas del repositorio. Antes de utilizarlas, comprobar que la Skill o el agente correspondiente esté disponible en el contexto actual.

No inventar agentes, Skills, plugins, herramientas ni rutas.

## 3. Reglas globales y específicas

- `global/HARNESS.md` contiene exclusivamente reglas aplicables a cualquier proyecto.
- Este `CLAUDE.md` contiene las reglas operativas de este repositorio.
- Cada proyecto consumidor define sus particularidades en su propio `CLAUDE.md`.
- No introducir referencias a proyectos concretos en las reglas globales.
- No duplicar reglas cuando basta con importar o referenciar la fuente correspondiente.
- Ante instrucciones incompatibles, identificar el conflicto y aplicar las instrucciones de mayor prioridad según la jerarquía efectiva de Claude Code.
- Las reglas específicas pueden complementar las globales, pero no autorizan a ignorar instrucciones de mayor prioridad ni controles de seguridad obligatorios.

## 4. Selección y uso de capacidades

Antes de realizar una tarea no trivial, analizar el objetivo, el alcance y las comprobaciones necesarias. Seleccionar únicamente las Skills, agentes y herramientas que aporten valor real.

No cargar ni ejecutar todas las capacidades por defecto.

### 4.1 Planificación

Utilizar `harness-plan` cuando la tarea requiera planificación estructurada, tenga varias etapas, afecte a varias áreas o presente riesgos relevantes.

La planificación debe identificar:

- Objetivo y alcance.
- Archivos y componentes potencialmente afectados.
- Criterios de aceptación.
- Riesgos y dependencias.
- Estrategia de verificación.
- Condiciones de finalización.

Para cambios simples y localizados, evitar planificación extensa si no aporta valor.

### 4.2 Implementación y coordinación

Utilizar `harness-work` como coordinador del ciclo de trabajo para tareas no triviales.

Debe organizar la implementación, las verificaciones, la revisión y las correcciones necesarias conforme a las instrucciones de su propia Skill.

No sustituir sus instrucciones por una segunda implementación paralela del mismo flujo.

### 4.3 Selección de Skills especializadas

Elegir según la necesidad concreta:

| Necesidad | Capacidad principal |
|---|---|
| Crear o rediseñar interfaces | `frontend-design` |
| Iterar y perfeccionar un diseño | `design-loop` |
| Inspeccionar una web en Chrome real | `chrome-devtools` |
| Automatizar navegación y pruebas | `playwright-cli` |
| Investigar errores y su causa raíz | `systematic-debugging` |
| Revisar diseño, accesibilidad y usabilidad web | `web-design-guidelines` |
| Aplicar patrones de composición React | `vercel-composition-patterns` |
| Mejorar rendimiento de React y Next.js | `vercel-react-best-practices` |
| Crear o mantener Skills | `skill-development` |
| Planificar una tarea compleja | `harness-plan` |
| Coordinar implementación y verificación | `harness-work` |
| Revisar la calidad final | `harness-review` |

Esta tabla es una guía de selección, no una orden de activar automáticamente cada Skill.

Cuando una tarea abarque varias áreas, combinar las Skills necesarias sin repetir comprobaciones equivalentes.

### 4.4 Revisión independiente

Utilizar `harness-review` como control de calidad para tareas no triviales.

Invocar `.claude/agents/code-reviewer` cuando corresponda una revisión independiente del código.

El agente debe respetar su alcance de solo lectura: no implementar correcciones ni modificar archivos durante la revisión.

Distinguir entre:
- Revisión de código.
- Pruebas de funcionamiento.
- Inspección visual.
- Verificación de seguridad.

Una modalidad de revisión no sustituye automáticamente a las demás.

## 5. Uso de herramientas y MCP

Las Skills proporcionan instrucciones; no garantizan que sus herramientas externas estén disponibles.

Antes de depender de una herramienta necesaria:

1. Comprobar que está disponible en la sesión actual.
2. Consultar sus instrucciones de uso.
3. Utilizarla únicamente para las comprobaciones pertinentes.
4. Registrar los resultados observados.
5. Si no está disponible, informar el bloqueo y evaluar una alternativa compatible.

No confundir un servidor configurado o conectado con herramientas funcionales y accesibles.

### 5.1 Verificación con Chrome DevTools

Utilizar `chrome-devtools` cuando sea necesario inspeccionar una aplicación web real, investigar errores del navegador o comprobar un cambio visual.

Cuando corresponda:
- Abrir la URL correcta del proyecto.
- Confirmar que se está inspeccionando la aplicación esperada.
- Capturar evidencia visual.
- Revisar los errores relevantes de consola y las peticiones de red.
- Comprobar los estados y tamaños de pantalla pertinentes.
- Repetir las comprobaciones tras corregir defectos.

No utilizar Chrome DevTools para tareas que no requieren navegador.

Si el MCP no está disponible, no afirmar que se inspeccionó la página ni que la consola está limpia.

### 5.2 Verificación con Playwright

Utilizar `playwright-cli` cuando se necesiten recorridos reproducibles, pruebas funcionales o automatización de interacciones.

Preferir comprobaciones automatizadas para flujos que deban repetirse.

No ejecutar las mismas pruebas con varias herramientas si ninguna aporta evidencia adicional.

## 6. Contrato de ejecución

Para tareas no triviales, seguir este ciclo:

`ANALYZE → PLAN → IMPLEMENT → VERIFY → REVIEW → PASS`

### ANALYZE
- Comprender el pedido y las restricciones.
- Inspeccionar el código y la documentación relevantes.
- Identificar las capacidades disponibles.
- Establecer el alcance sin modificar archivos innecesariamente.

### PLAN
- Seleccionar las Skills y agentes pertinentes.
- Definir los criterios de aceptación.
- Determinar qué pruebas y verificaciones se necesitan.

### IMPLEMENT
- Aplicar el cambio mínimo que resuelva el problema.
- Respetar la arquitectura, las convenciones y las reglas del proyecto.
- Evitar modificaciones ajenas al alcance.

### VERIFY
- Ejecutar las pruebas correspondientes al cambio.
- Comprobar lint, tipos y build cuando sean pertinentes.
- Verificar el comportamiento real de la aplicación cuando corresponda.
- Utilizar evidencia observable; no inferir resultados que no se comprobaron.

### REVIEW
- Revisar los cambios y los posibles efectos secundarios.
- Utilizar `harness-review` y el agente independiente cuando corresponda.
- Corregir los defectos encontrados y repetir las verificaciones afectadas.

### PASS
Aprobar únicamente cuando se hayan cumplido los criterios de aceptación y las verificaciones obligatorias.

Si alguna comprobación necesaria no pudo ejecutarse, informar el bloqueo y no presentar la tarea como completamente verificada.

## 7. Reparaciones y límites

Si una verificación o revisión falla:

`FAIL → ROOT CAUSE → REPAIR → VERIFY → REVIEW`

- Investigar la causa antes de aplicar una corrección.
- Corregir el problema concreto sin introducir cambios innecesarios.
- Repetir las pruebas afectadas.
- Límite máximo: tres ciclos de reparación.
- Si persiste el fallo, detenerse y documentar el bloqueo.

No repetir intentos idénticos sin nueva evidencia ni cambiar configuraciones globales para solucionar problemas locales sin justificación.

## 8. Evidencia y reporte final

Al finalizar una tarea no trivial, informar brevemente:

- **Resultado:** completado, parcial o bloqueado.
- **Cambios:** archivos y componentes modificados.
- **Skills utilizadas:** capacidades realmente consultadas y aplicadas.
- **Agentes utilizados:** agentes realmente ejecutados y su función.
- **Verificaciones:** pruebas ejecutadas y sus resultados.
- **Evidencia:** capturas, resultados de consola o salidas relevantes cuando existan.
- **Pendientes:** fallos, limitaciones o comprobaciones no ejecutadas.

No afirmar que una Skill fue utilizada únicamente porque estaba instalada o seleccionada.

No afirmar que una prueba pasó sin haberla ejecutado y observado su resultado.

No afirmar que una revisión independiente ocurrió si no se ejecutó realmente.

## 9. Seguridad y control de cambios

- Preservar los cambios existentes del usuario.
- No sobrescribir archivos ni descartar modificaciones ajenas a la tarea.
- No ejecutar operaciones destructivas sin autorización cuando esta sea necesaria.
- No exponer secretos, credenciales ni variables sensibles.
- No modificar configuraciones globales, permisos o integraciones fuera del alcance autorizado.
- No realizar commits ni pushes sin autorización explícita.
- No instalar dependencias, plugins, agentes o Skills sin una necesidad justificada.
- Ante incertidumbre con impacto relevante, detener la acción de riesgo y explicar el motivo.

## 10. Mantenimiento de la fuente de verdad

- Toda modificación de reglas globales se realiza en `global/HARNESS.md`.
- Después de editarlo, ejecutar `scripts/install-harness.ps1`.
- Mantener `HARNESS.md` compacto porque se carga en las sesiones consumidoras.
- Mantener actualizado el inventario del `README.md`.
- Mantener agentes y Skills genéricos y reutilizables.
- No agregar capacidades duplicadas sin demostrar su necesidad.
- Antes de cambiar la arquitectura, comprobar el estado actual y justificar la modificación.
- Verificar las modificaciones realizadas antes de informar que el mantenimiento finalizó.

## 11. Principio operativo

El objetivo no es utilizar la mayor cantidad de herramientas, sino seleccionar las capacidades correctas para resolver cada tarea con el menor trabajo necesario y evidencia suficiente.

Priorizar, en este orden:

1. Corre