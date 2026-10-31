---
name: payments-core
description: Diseñar o modificar integraciones de pago con un contrato agnóstico del proveedor, especializado en Mercado Pago (Checkout Pro, Checkout API/Orders, Bricks, suscripciones, marketplace/split, webhooks, reembolsos, conciliación). Usar en cualquier tarea que cree, cambie o revise checkout, cobros, webhooks de pago, reembolsos o estados de órdenes pagadas.
---

# Payments Core

## Invariantes (no negociables)

1. **El backend es la única autoridad** sobre importes y estados. Ningún endpoint acepta precio, total o estado desde el cliente: el total se recalcula desde la base.
2. **El redirect del navegador nunca confirma un pago.** Las páginas de retorno (`back_urls`) muestran "procesando" y consultan al backend.
3. **Confirmación = webhook verificado + GET al proveedor.** El body del webhook nunca es fuente de verdad.
4. **Idempotencia determinista:** clave = f(orden, nº de intento lógico), persistida *antes* de llamar al proveedor; un reintento HTTP reutiliza la misma clave.
5. **Importes en centavos enteros** con moneda explícita (ARS). Nunca floats.
6. **Solo credenciales y tarjetas de prueba.** Ninguna transacción real, cuenta productiva ni dato real sin autorización explícita del usuario.
7. **Secretos solo en servidor:** `MP_ACCESS_TOKEN` y el secreto de webhook nunca llegan al cliente (solo la public key). Test y producción separados por entorno.
8. **Logs sin PII ni tokens:** redactar payloads.

## Arquitectura

- **Contrato** (`references/contract.ts`): extiende el de cada proyecto si ya existe (Regalarte: `apps/web/src/lib/payment/types.ts`). No crear uno paralelo.
- **Persistencia** (`references/schema.sql`): `payment_attempts`, `payment_events` (inbox con `UNIQUE(provider, event_id)`), `refunds`.
- **Máquina de estados** (`references/state-machine.mjs`): created → pending → (authorized) → approved → partially_refunded/refunded; además rejected, cancelled, expired, charged_back y review. Un evento fuera de orden nunca hace retroceder un estado terminal. Estado desconocido del proveedor → `review`, nunca `approved`.
- **Webhook** (`references/webhook-handler.mjs` + `mp-signature.mjs`): verificar firma → dedupe en inbox → GET del recurso → validar importe y moneda → transición idempotente → 200 en < 22 s (trabajo pesado a cola/job).

Las implementaciones `.mjs` son referencias testeadas (`tests/payments.test.mjs` del plugin, 13 casos de la matriz G9). Portarlas al stack del proyecto conservando los mismos casos de test.

## Mercado Pago

Hechos verificados y fuentes en `references/mercadopago.md`. Lo específico de MP (scaffold, SDK, usuarios de prueba, revisión de calidad) se delega al plugin oficial `mercadopago@claude-plugins-official` (agente `mp-integration-expert`, comandos `/mp-integrate`, `/mp-review`, `/mp-test-cards`). Antes de escribir código contra un endpoint no detallado en `mercadopago.md` (p. ej. el body del reembolso parcial), consultarlo con el MCP de Mercado Pago (búsqueda de documentación) y citar la fuente.

## Procedimiento

1. Leer el contrato y adapters existentes del proyecto; identificar el producto MP en uso (Orders API vs Payments API legacy, Checkout Pro, Bricks).
2. Clasificar la tarea como **riesgo alto** (harness-plan). Presentar el plan.
3. Implementar respetando los invariantes. Tests con mocks y fixtures firmados; sin red en CI.
4. Verificación: `qa-verifier` corre G1, G2, G6 y **G9**. Revisión: `payments-review` + `code-reviewer` + `claude-security` (si está instalado).
5. Prueba manual asistida en sandbox solo con credenciales de prueba (tarjetas APRO, OTHE, CONT…).
