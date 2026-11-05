---
name: product-spec
description: Convertir una idea o pedido de producto en una especificación verificable - problema, usuarios, alcance y no-alcance, historias con criterios de aceptación numerados, requisitos no funcionales, riesgos y preguntas abiertas. Usar ANTES de harness-plan cuando el requerimiento es nuevo, vago o de producto (funcionalidad, módulo, SaaS, flujo de usuario). No usar para cambios técnicos ya definidos ni correcciones puntuales.
---

# Product spec

Convierte un pedido en un contrato que se pueda implementar y probar. Lo que no se puede verificar no es un requisito.

## Proceso

1. **Entender el contexto.** Leer `CLAUDE.md`, documentación y comportamiento actual del producto. Buscar si ya existe algo parecido (reutilizar antes de crear).
2. **Problema y usuarios.** Quién tiene el problema, qué intenta lograr, cómo lo resuelve hoy, qué métrica indica éxito (una, medible).
3. **Alcance.** Qué entra en esta entrega y qué queda explícitamente fuera (no-alcance). Recortar al incremento mínimo que entrega valor (esqueleto que funciona de punta a punta antes que módulos completos a medias).
4. **Historias y criterios de aceptación.** Por historia: "Como <rol> quiero <acción> para <resultado>" y criterios en formato Dado/Cuando/Entonces, cada uno con ID (`AC-1`, `AC-2`...). Cada criterio debe poder convertirse en una prueba (G2 unitaria o G3 E2E) o en una comprobación manual descrita. Incluir caminos de error y estados vacíos.
5. **Requisitos no funcionales** (marcar los que aplican, con valor medible): seguridad y roles (quién ve/hace qué), datos personales y retención, rendimiento (p. ej. p95 de respuesta, LCP), accesibilidad (WCAG 2.2 AA), responsive, idiomas, observabilidad (qué se registra), disponibilidad, compatibilidad de navegadores.
6. **Datos e integraciones.** Entidades nuevas o cambiadas, sistemas externos, webhooks, pagos. Señalar qué capacidades se activan: `saas-architecture` (tenants, roles, planes), `api-design`, `data-modeling-migrations`, `payments-core`.
7. **Riesgos, supuestos y preguntas abiertas.** Preguntar al usuario solo lo que cambia el resultado. El resto se declara como supuesto y se sigue.
8. **Entregar** el documento en `docs/specs/<slug>.md` (o donde el proyecto defina) con la plantilla de abajo y pasar a `harness-plan`, que toma los `AC-n` como criterios de aceptación y selecciona los gates.

## Plantilla

```markdown
# <Funcionalidad>
**Estado:** borrador | aprobada · **Fecha:** AAAA-MM-DD

## Problema y éxito
## Usuarios
## Alcance / No-alcance
## Historias y criterios
### H1 · <título>
- AC-1 Dado … cuando … entonces …
## Requisitos no funcionales
## Datos e integraciones
## Riesgos · Supuestos · Preguntas abiertas
## Plan de entrega (incrementos)
```

## Reglas

- Sin criterios verificables no se considera especificado.
- No decidir tecnología aquí salvo restricción real; eso es `architecture-decisions`.
- La spec describe comportamiento observable, no implementación.
- Al implementar, cada `AC-n` debe quedar cubierto por una prueba o evidencia citada por su ID; `harness-review` lo comprueba.
