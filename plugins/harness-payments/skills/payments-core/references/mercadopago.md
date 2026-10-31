# Mercado Pago — hechos verificados (Argentina)

Verificado el 31-10-2026 en la documentación oficial. Antes de depender de un dato con más de 90 días, reverificarlo (el chequeo semanal del harness sigue el plugin oficial).

## Productos

| Producto | Estado AR | Notas |
|---|---|---|
| Checkout Pro | disponible | Redirección a MP. `marketplace_fee` en preferencias. Menor superficie PCI |
| Checkout API (Orders) | disponible | API actual; Payments API marcada como legacy. Tarjetas crédito/débito, Rapipago, Pago Fácil. Procesamiento automático o manual (autorización/captura) |
| Checkout Bricks | disponible | Payment, Card Payment, Wallet, Status Screen, Brand. El Card Payment Brick tokeniza en el cliente; `onSubmit` → backend → `POST /v1/orders` (doc Checkout API Orders AR). SDK `@mercadopago/sdk-react` (Apache-2.0) |
| Suscripciones | disponible | Con o sin plan. Topics `subscription_preapproval`, `subscription_authorized_payment`, `subscription_preapproval_plan` |
| Marketplace / split 1:1 | con límites | OAuth de cada vendedor; `marketplace_fee` (Pro) o `application_fee` (API); la doc AR indica solo dinero en cuenta MP. Topic `mp-connect`. Validar con MP antes de comprometer diseño |
| Reportes | disponible | "Liberaciones" y "Todas las transacciones", por panel o API, programables → conciliación diaria |

## Orders API — estados

Fuente: `docs/checkout-pro-orders/payment-management/status/order-status`.

| status | status_detail | Estado interno |
|---|---|---|
| created | created | created |
| processing | in_process, pending_review_manual | pending |
| action_required | waiting_capture | authorized |
| processed | accredited | approved |
| processed | partially_refunded | partially_refunded |
| refunded | refunded | refunded |
| failed | bad_filled_card_data, invalid_card_token, high_risk, rejected_by_issuer, required_call_for_authorize, max_attempts_exceeded, card_disabled, insufficient_amount, amount_limit_exceeded, invalid_installments, processing_error | rejected |
| canceled | canceled | cancelled (o expired) |
| otro | otro | review |

La doc indica esperar el webhook antes de acciones irreversibles (envío, acceso).

## Reembolsos y cancelaciones (Orders)

Fuente: `docs/checkout-api-orders/payment-management/refunds-cancellations`.

- Reembolso: `POST /v1/orders/{order_id}/refund`. Total: body vacío. Parcial: monto + id de transacción en el body (**esquema exacto: consultar el MCP de MP antes de implementar**; la referencia pública devolvió 404 al verificar). Plazo: 180 días desde la aprobación. Monto mayor al reembolsable → error `refund_amount_exceeds`. Se admiten varios parciales mientras el acumulado no supere lo pagado.
- Cancelación: `POST /v1/orders/{order_id}/cancel`, solo si el estado es `action_required`. Resultado `canceled` o `expired`. Vencido el plazo del medio de pago, cancelación automática.
- Cada reembolso lleva su propia clave de idempotencia en `refunds`.

## Webhooks

Fuente: `docs/your-integrations/notifications/webhooks`.

- Header `x-signature: ts=<ts>,v1=<hmac>`; `x-request-id`; `data.id` en el query string.
- Manifest `id:[data.id];request-id:[x-request-id];ts:[ts];` — `data.id` alfanumérico en minúsculas; si falta un valor, se elimina su segmento.
- HMAC-SHA256 en hex con el secreto de la aplicación. Comparación en tiempo constante.
- `ts`: la doc dice milisegundos pero su ejemplo tiene 10 dígitos → aceptar ambos. Ventana anti-replay: decisión nuestra (referencia: 5 min).
- Responder 200/201 en menos de 22 s. Reintentos cada 15 min; tras el tercero el intervalo se amplía pero continúan.
- Topic de Orders: `orders` en la doc de webhooks; la doc de estados menciona `orders_v2`. Aceptar ambos.

## Pruebas

- Hasta 15 cuentas de prueba por aplicación.
- Tarjetas AR de prueba; titular define el resultado: APRO (aprobado), OTHE (rechazo general), CONT (pendiente), FUND (fondos insuficientes), SECU (CVV), EXPI (vencida), DUPL (duplicado) y otros (lista completa: `/mp-test-cards`). Vencimiento 11/30, CVV 123 (Amex 1234).
- El plugin oficial (`/mp-test-cards`, skill `mp-test-setup`) gestiona usuarios y tarjetas de prueba.

## Herramientas oficiales

- Plugin `mercadopago@claude-plugins-official` 4.3.2 (Apache-2.0, repo `mercadopago/mercadopago-claude-marketplace`, commit `9815b7f`): agente `mp-integration-expert`; skills `mp-integrate`, `mp-webhooks`, `mp-test-setup`, `mp-review`; MCP remoto `https://mcp.mercadopago.com/mcp`; hook PreToolUse (`python3 validate_mp_credentials.py`) que bloquea lectura de `.env` y fugas de credenciales.
- SDK Node `mercadopago` (MIT). Opcional por proyecto: Regalarte integra Orders por HTTP sin SDK.
