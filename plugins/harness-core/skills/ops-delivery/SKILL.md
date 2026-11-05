---
name: ops-delivery
description: Llevar una aplicación a producción y operarla - contenedores Docker y compose, pipelines de CI/CD (GitHub Actions), entornos y configuración, estrategia de despliegue y reversión, logs, métricas, trazas, health checks y alertas. Usar al crear o modificar Dockerfiles, workflows, scripts de despliegue, variables de entorno, o al agregar observabilidad. Despliegues a producción y cambios de infraestructura real exigen autorización explícita del usuario.
---

# Entrega y operación

Qué se entrega y cómo se opera es parte del producto. Cada área tiene su referencia; leer solo la que la tarea necesita.

| Tarea | Referencia | Verificación ejecutable |
|---|---|---|
| Dockerfile, compose, imágenes | [references/docker.md](references/docker.md) | `hadolint --failure-threshold warning <Dockerfile>`; build local de la imagen |
| Workflows, pipeline, ramas | [references/ci-cd.md](references/ci-cd.md) | `actionlint` sobre `.github/workflows/*.yml` |
| Entornos, secretos, despliegue, rollback | [references/environments.md](references/environments.md) | smoke test tras el despliegue; plan de reversión escrito |
| Logs, métricas, trazas, alertas | [references/observability.md](references/observability.md) | evidencia de una línea de log estructurada con id de petición y de un health check |

`hadolint` y `actionlint` los instala `scripts/install-qa-tools.ps1` (binarios con SHA-256 verificado).

## Reglas

1. **Producción es de acción explícita.** Nunca desplegar, migrar datos reales, cambiar DNS o tocar secretos de producción sin autorización expresa del usuario en esa acción. El guard de `harness-core` pide confirmación en `vercel --prod`, `supabase db push`, `docker ... prune`, `gh release create` y similares; no se esquiva.
2. **Reproducible.** Todo se construye desde el repositorio con versiones fijadas y lockfiles. Nada depende de pasos manuales no documentados.
3. **Secretos fuera del repositorio.** Solo `.env.example` con valores ficticios; los reales viven en el gestor de secretos del proveedor. Nunca en imágenes, logs ni argumentos de build.
4. **Probar en aislamiento.** Validar contenedores y pipelines en local o en un entorno efímero antes de proponerlos.
5. **Reversible.** Cada despliegue tiene una forma de volver atrás conocida y probada antes de necesitarla.
6. **Sin infraestructura nueva sin necesidad.** Preferir lo que el proyecto ya usa (Vercel, Supabase, compose) antes de agregar orquestadores o servicios.

## Salida esperada

Archivos de configuración revisados por las herramientas anteriores, el comando exacto con su resultado como evidencia en `.harness/evidence/<tarea>/` (G1 para lint y build) y, si hay despliegue, el plan de reversión y el smoke test definidos.
