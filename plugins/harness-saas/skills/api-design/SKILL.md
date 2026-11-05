---
name: api-design
description: Diseñar, implementar y revisar APIs HTTP y la lógica de servicio detrás de ellas - recursos y métodos, validación en el borde, errores estándar, paginación, idempotencia, versionado, autorización por endpoint, límites de uso, contrato OpenAPI y pruebas de contrato. También integraciones y webhooks entrantes y salientes. Usar al crear o cambiar endpoints, servicios de negocio o integraciones con terceros.
---

# Diseño de APIs y servicios

La API es un contrato público: se diseña, se valida en el borde y se prueba contra el contrato.

## Diseño

- **Recursos** como sustantivos en plural (`/projects/{id}/members`); los métodos HTTP conservan su semántica: `GET` seguro e idempotente, `PUT`/`DELETE` idempotentes, `POST` crea o ejecuta acciones, `PATCH` actualiza parcialmente.
- **Códigos**: 200/201/204 éxito; 400 entrada inválida; 401 sin autenticar; 403 sin permiso; 404 no existe (o no visible para ese tenant); 409 conflicto; 422 regla de negocio; 429 límite de uso con `Retry-After`; 5xx solo para fallos propios.
- **Errores** con un formato único: `application/problem+json` (RFC 9457: `type`, `title`, `status`, `detail`, `instance` más campos propios como `errors[]`). Sin trazas de pila ni mensajes internos hacia el cliente.
- **Paginación** por cursor para colecciones grandes o cambiantes; límite máximo del tamaño de página; filtros y orden solo sobre campos permitidos (lista blanca).
- **Idempotencia**: operaciones que cobran, crean o envían aceptan una clave de idempotencia (`Idempotency-Key`) y devuelven el mismo resultado al repetirse.
- **Concurrencia**: `ETag`/`If-Match` o columna de versión para evitar pisar cambios.
- **Formato**: fechas ISO 8601 en UTC; dinero en enteros de la unidad mínima con moneda explícita; identificadores opacos.
- **Versionado**: cambios aditivos compatibles; el cambio incompatible se versiona (`/v2`) y el retiro se anuncia (`Deprecation`/`Sunset`).

## Seguridad en cada endpoint

1. **Autenticación** y **autorización por objeto** en el servidor (ver `saas-architecture`); el tenant sale de la sesión.
2. **Validación de entrada con esquema** en el borde (zod, pydantic, serializers de DRF, etc.): tipos, rangos, longitudes, listas blancas. Salida con un modelo explícito: nunca serializar entidades de base de datos completas.
3. Límites de tamaño de cuerpo y de archivos (tipo, tamaño, almacenamiento con URL firmada), tiempos máximos y límite de frecuencia por usuario/tenant/IP.
4. CORS mínimo (orígenes explícitos), CSRF si se usan cookies, cabeceras de seguridad.
5. Registro con `request_id` sin datos sensibles (`ops-delivery` → observabilidad). Revisar con `owasp-security` (inyección, control de acceso, SSRF).

## Contrato y pruebas

- **OpenAPI** como fuente del contrato (generado del código o el código validado contra él); se versiona y se usa para documentación (`tech-docs`) y clientes.
- Pruebas de contrato: cada endpoint responde conforme al esquema, incluidos los errores. Pruebas negativas: sin autenticar, sin permiso, tenant ajeno, entrada inválida, repetición idempotente, concurrencia.
- G2 para lógica de servicio; G3 si hay flujos de punta a punta; G6 y revisión OWASP si cambia auth, entrada de archivos o consultas.

## Lógica de negocio

Reglas de negocio en servicios/casos de uso testeables sin HTTP; los controladores solo traducen. Transacciones explícitas para operaciones multi-paso; efectos externos (email, cobros) después del commit y de forma idempotente.

## Integraciones y webhooks

Entrantes (firma, repetición, orden), salientes (reintentos, entrega) y clientes de terceros (timeouts, aislamiento): [references/webhooks-integrations.md](references/webhooks-integrations.md). Pagos: `harness-payments:payments-core`.
