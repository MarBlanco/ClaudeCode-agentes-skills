---
name: payments-review
description: Revisión independiente (read-only) de cambios en pagos contra los invariantes de Payments Core y la matriz de pruebas G9. Usar después de cualquier cambio en checkout, webhooks de pago, reembolsos, estados de órdenes pagadas o credenciales de proveedores de pago, y antes de declarar la tarea terminada.
---

# Payments Review

Gate independiente. No modifica código. Complementa a `code-reviewer`, `/mp-review` del plugin oficial de Mercado Pago y `claude-security`; no los reemplaza.

## Reglas (cada una se verifica en el código, con archivo:línea)

| # | Regla | Cómo verificar |
|---|---|---|
| P1 | El importe viene del servidor | Ningún endpoint lee precio/total/estado del body del cliente; el total se recalcula desde la base |
| P2 | Idempotencia determinista | La clave depende de orden + intento lógico, se persiste antes de llamar al proveedor; un reintento HTTP reutiliza la misma. Claves con `Date.now()`/`random` por llamada → finding (salvo que cada llamada sea un intento lógico nuevo documentado) |
| P3 | El redirect no confirma | Las páginas de retorno no cambian estado; solo consultan al backend |
| P4 | Webhook firmado | HMAC verificado con comparación en tiempo constante, ventana anti-replay, respuesta 401/400 sin efectos si falla |
| P5 | Fuente de verdad | Tras el webhook se consulta el recurso al proveedor; el body no decide el estado |
| P6 | Dedupe | Inbox con unicidad (provider, event_id) o equivalente; un duplicado no produce un segundo efecto |
| P7 | Estados | Mapeo exhaustivo; desconocido → revisión, nunca aprobado; terminales no retroceden |
| P8 | Importe y moneda | Se comparan contra el intento persistido antes de aprobar; discrepancia → revisión manual |
| P9 | Credenciales | Access token y secreto de webhook solo en servidor; al cliente solo la public key; sin credenciales en código, tests ni logs |
| P10 | Logs | Sin PII, tokens ni payloads completos |
| P11 | Respuesta rápida | El webhook responde en < 22 s; trabajo pesado fuera del request |
| P12 | Sin dinero real | Tests con mocks/fixtures; sandbox solo con credenciales de prueba |

## Matriz G9 (debe existir como tests del proyecto)

| Escenario | Cómo | Esperado |
|---|---|---|
| Aprobado | sandbox APRO / mock | approved solo tras webhook verificado + GET |
| Rechazado | OTHE, FUND, SECU / mock | rejected con mensaje mapeado; orden reintentable |
| Pendiente | CONT, Rapipago, Pago Fácil / mock | pending; expiración manejada |
| Reembolso total y parcial | sandbox / mock | refunded o partially_refunded; solicitud repetida no duplica |
| Webhook duplicado o fuera de orden | fixtures firmados | un solo efecto; sin retroceso de terminal |
| Firma inválida | fixture alterado | 401/400 sin efectos |
| Importe manipulado | mock del recurso con otro importe | no aprueba; alerta de revisión |
| Doble submit | dos requests concurrentes | un solo intento activo |

Referencia ejecutable de la matriz: `harness-payments` → `tests/payments.test.mjs` (implementaciones en `payments-core/references/`).

## Salida

```
PAYMENTS REVIEW: APPROVE | REQUEST_CHANGES
| Regla | Estado (OK/FINDING/N/A) | Evidencia (archivo:línea) | Fix requerido |
G9: escenarios cubiertos n/8 — faltantes: ...
```

Cualquier FINDING en P1, P2, P4, P5, P8 o P9 → REQUEST_CHANGES.
