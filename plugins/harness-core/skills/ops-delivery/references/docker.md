# Docker y compose

## Dockerfile

- Imagen base con **etiqueta fija** (`node:22.11.0-alpine3.20`), nunca `latest`; para mayor reproducibilidad, fijar también el digest.
- **Multi-stage**: etapa de build con herramientas, etapa final mínima con solo artefactos y dependencias de ejecución.
- **Usuario sin privilegios**: `USER` numérico (p. ej. `USER 10001`) o el usuario de la imagen; sin `sudo`.
- `COPY` en lugar de `ADD` (salvo extraer un tar local a propósito). `.dockerignore` con `.git`, `node_modules`, `.env*`, artefactos de test y evidencia (`.harness/`).
- **Capas con caché**: copiar primero los archivos de dependencias (`package*.json`, `requirements*.txt`), instalar, y luego el código.
- Instalaciones reproducibles: `npm ci --omit=dev`, `pip install --no-cache-dir -r requirements.txt`, lockfile presente.
- Paquetes del sistema: `apt-get install -y --no-install-recommends ...` y limpiar listas (`rm -rf /var/lib/apt/lists/*`) en la misma capa.
- **Sin secretos en la imagen**: ni `ENV`, ni `ARG`, ni archivos copiados. Para secretos de build usar BuildKit (`RUN --mount=type=secret`).
- `HEALTHCHECK` o, en compose, `healthcheck`; un proceso por contenedor; `CMD`/`ENTRYPOINT` en forma exec (`["node","server.js"]`) para recibir señales.
- Escuchar en `0.0.0.0` dentro del contenedor; publicar solo los puertos necesarios.

## Compose

- Sin `latest`; volúmenes con nombre para datos; `healthcheck` y `depends_on: { condition: service_healthy }` para el orden de arranque.
- Variables desde `env_file` no versionado o del entorno; nunca valores reales en `docker-compose.yml`.
- Bases de datos de desarrollo con credenciales de prueba y puerto ligado a `127.0.0.1`.
- Límites de recursos en entornos compartidos.

## Verificación

```bash
hadolint --failure-threshold warning Dockerfile     # 0 = sin warnings/errores
docker build -t app:test .                           # construye
docker run --rm app:test <comando de prueba>        # arranca y responde al health check
docker compose config -q                            # compose válido
```

Reglas de `hadolint` útiles: DL3007 (usar `latest`), DL3008/DL3015/DL3009 (apt), DL3020 (`ADD`), DL3025 (forma JSON de `CMD`). Una excepción se documenta con `# hadolint ignore=DLxxxx` y motivo.
