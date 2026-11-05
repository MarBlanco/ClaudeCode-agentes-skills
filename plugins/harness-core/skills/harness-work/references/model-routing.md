# Política de modelo por tarea

Objetivo: el modelo más barato que alcance, con escalamiento por evidencia. Un hook **no puede** cambiar el modelo; se aplica delegando con el parámetro `model` de la herramienta Agent (gana sobre el frontmatter del agente). Cambiar el modelo de la sesión invalida la caché del prompt: con contexto largo, delegar en vez de cambiar.

| Trabajo | Modelo | Cómo |
|---|---|---|
| Búsqueda, lectura amplia, inventarios, localizar símbolos | `haiku` | Agent `model=haiku` o `Explore`; devolver solo conclusiones |
| Implementación y reparación normal, verificación (`qa-verifier`) | `sonnet` | modelo de la sesión |
| Arquitectura, seguridad, pagos, esquema/migraciones, auth, revisión final (`code-reviewer`, `payments-engineer`) | `opus` | agente con `model: opus` en su frontmatter |
| Investigación web con fuentes (`market-researcher`), QA exploratoria (`qa-explorer`) | `sonnet` | frontmatter del agente |

## Escalamiento
- Dos fallos del **mismo** gate con el modelo actual → repetir la reparación con el nivel siguiente (haiku→sonnet→opus) delegando la reparación en un subagente con `model=` explícito.
- Tercer fallo: STOP y reporte (límite de 3 ciclos de `harness-work`; el escalamiento no lo amplía).
- Nunca bajar de modelo una tarea de riesgo alto para ahorrar.

## Señales (el hook `router.mjs` las evalúa sin llamar a ningún modelo)
Riesgo alto + verbo de edición → sugiere revisión con opus. Búsqueda sin edición y pedido corto → sugiere haiku. Pedidos largos o ambiguos: decide el modelo principal. Es una sugerencia, no una orden; con la duda, `sonnet`.

## Medición
`/usage` y el plugin oficial `session-report` muestran gasto por proyecto, subagente y skill. Revisar antes de ajustar esta tabla: sin medición no se cambia la política.
