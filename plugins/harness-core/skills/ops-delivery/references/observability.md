# Observabilidad

Objetivo: poder responder "¿qué está pasando y por qué?" sin desplegar código nuevo.

## Logs

- **Estructurados** (JSON) con nivel, marca de tiempo UTC, mensaje, `request_id`/`trace_id`, ruta, estado y duración.
- Un id de correlación por petición, propagado a servicios y trabajos en segundo plano.
- **Nunca** registrar secretos, tokens, cabeceras `Authorization`, contraseñas, números de tarjeta ni datos personales innecesarios; redactar en origen.
- Niveles con criterio: `error` solo si alguien debe actuar; `warn` degradación; `info` eventos de negocio relevantes; `debug` desactivado en producción.
- En aplicaciones multi-tenant incluir el identificador interno del tenant (no su nombre ni datos de usuarios).

## Métricas

- Servicios: **RED** (tasa, errores, duración con percentiles p50/p95/p99). Recursos: **USE** (utilización, saturación, errores).
- Métricas de negocio mínimas (altas, cobros aprobados/rechazados, webhooks procesados) para detectar fallos que la infraestructura no ve.
- Cardinalidad acotada: no usar ids de usuario o URLs completas como etiqueta.

## Trazas

OpenTelemetry como estándar abierto: instrumentar entradas y salidas (HTTP, base de datos, colas), propagar el contexto `traceparent`. Muestreo para controlar costo.

## Salud

- **Liveness** (el proceso vive) y **readiness** (puede atender: base de datos y dependencias críticas accesibles) separadas; sin datos sensibles en la respuesta.

## Errores y alertas

- Captura de excepciones con agrupación (Sentry u otra herramienta que el proyecto ya use) con scrubbing de datos personales.
- Alertar por **síntomas** que afectan al usuario (tasa de error, latencia, fallos de pago, cola atascada), no por causas internas ruidosas. Cada alerta enlaza a su runbook (`tech-docs`).
- Definir objetivos (SLO) simples, p. ej. disponibilidad y latencia de la ruta crítica, y alertar por consumo del presupuesto de error.

## Verificación (evidencia)

1. Una petición real genera una línea de log estructurada con `request_id` y sin datos sensibles (mostrar la línea).
2. El health check responde 200 sano y falla (503) cuando una dependencia crítica cae (probarlo en local).
3. Una alerta de prueba llega al canal definido, o queda documentado como pendiente de configuración en el proveedor.
