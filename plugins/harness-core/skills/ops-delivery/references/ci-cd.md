# CI/CD (GitHub Actions)

## Estructura del pipeline

`instalar → estático (tipos, lint) → unit → build → E2E → seguridad (gitleaks, osv-scanner) → desplegar`. Fallar rápido: lo barato primero; jobs independientes en paralelo; los que dependen, con `needs`.

## Seguridad del workflow

- **Permisos mínimos**: `permissions: contents: read` a nivel de workflow y elevar solo en el job que lo necesite.
- **Acciones de terceros fijadas por SHA de commit** (con el tag en un comentario), no por tag móvil. Las de `actions/*` también se fijan.
- **Eventos con código no confiable**: `pull_request` no recibe secretos de forks (correcto). No usar `pull_request_target` para ejecutar código del PR; si es imprescindible, no hacer checkout del código del PR con secretos disponibles.
- **Inyección de scripts**: no interpolar `${{ github.event.* }}` (título, rama, cuerpo) directamente en `run:`; pasarlo por `env:` y usar la variable del shell entre comillas.
- Secretos solo en `env:` del paso que los usa; nunca imprimirlos. Sin `ACTIONS_STEP_DEBUG` en producción.
- **Entornos con aprobación**: el despliegue a producción usa un `environment` con revisores requeridos; el despliegue automático solo a staging/preview.
- `concurrency` para cancelar ejecuciones obsoletas de PR (y no cancelar despliegues en curso), `timeout-minutes` en cada job.
- Cachés de dependencias con clave por lockfile (`actions/setup-node` con `cache`), artefactos con retención corta.

## Ramas y revisión

Protección de la rama principal: PR obligatorio, checks requeridos (G1, G2, G6 como mínimo), sin push directo, sin force push. Despliegue desde la rama principal o desde tags.

## Migraciones en el pipeline

Compatibles hacia atrás (expand/contract, ver `data-modeling-migrations`). Se aplican antes de que el código nuevo reciba tráfico; el pipeline no ejecuta operaciones destructivas contra producción sin la aprobación del entorno.

## Verificación

```bash
actionlint                      # revisa .github/workflows/*.yml (sintaxis, expresiones, shellcheck, acciones)
```

0 hallazgos es el criterio. Para probar el pipeline sin impacto: ejecutar en una rama de trabajo y, si existe, `act` en local (opcional; no es parte del harness).
