# Entornos, configuración y despliegue

## Entornos

| Entorno | Para qué | Datos |
|---|---|---|
| local | desarrollo | semilla ficticia |
| preview/efímero | revisar un PR | semilla ficticia; nunca datos de producción |
| staging | ensayo previo, QA exploratoria, pagos en sandbox | datos de prueba |
| producción | usuarios reales | reales; acceso mínimo y auditado |

Staging se parece a producción (mismas versiones de runtime y base de datos, mismas variables salvo valores).

## Configuración y secretos

- Toda diferencia entre entornos va en **variables de entorno** (una sola imagen/build para todos).
- `.env.example` versionado con nombres y valores ficticios; los reales, en el gestor de secretos del proveedor (Vercel, Supabase, GitHub Environments, etc.).
- Rotación documentada; si un secreto se expuso, se rota (no basta con borrarlo del historial).
- Claves de servicio con privilegios solo en servidor; el cliente recibe únicamente claves públicas.

## Despliegue

1. Construir **un artefacto inmutable** y promoverlo (staging → producción); no reconstruir por entorno.
2. Orden: migración compatible hacia atrás → código nuevo → limpieza en un despliegue posterior.
3. **Smoke test** automático tras desplegar (ruta principal, health check, una operación de lectura). Si falla, reversión.
4. Estrategias: continuo con aprobación para apps simples; gradual (canary o flags) cuando el riesgo lo justifique. Elegir la más simple que cubra el riesgo.
5. **Reversión definida antes de desplegar**: redeploy del artefacto anterior, flag apagado y esquema compatible con ambas versiones. Los datos migrados no se "des-migran": por eso expand/contract.

## Autorización

Desplegar a producción, aplicar migraciones sobre datos reales, rotar secretos o cambiar DNS requiere autorización explícita del usuario en esa acción. El agente prepara, verifica en staging o local y presenta el plan; no ejecuta lo irreversible por su cuenta.

## Verificación

Evidencia de: build reproducible desde un clon limpio, `.env.example` completo respecto a las variables leídas por el código (comparar), smoke test pasando y plan de reversión escrito.
