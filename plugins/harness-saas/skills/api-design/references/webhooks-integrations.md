# Webhooks e integraciones

## Webhooks entrantes (recibir eventos de un tercero)

1. **Verificar la firma** sobre el **cuerpo crudo** (antes de parsear JSON) con HMAC y comparación en tiempo constante; rechazar con 401/400 sin procesar. Cada proveedor define el esquema exacto: usar su documentación oficial.
2. **Tolerancia de tiempo** del timestamp firmado para frenar repeticiones (replay).
3. **Responder 2xx rápido** y procesar en segundo plano; el proveedor reintenta si tardás o fallás.
4. **Idempotencia por id de evento**: guardar los ids procesados (tabla con restricción `UNIQUE`) y descartar duplicados.
5. **Orden no garantizado**: no asumir secuencia; ante un evento, consultar al proveedor el estado actual del recurso antes de actuar (fuente de verdad), o comparar versión/timestamp.
6. **Importes y datos críticos** se validan contra tu registro, no solo contra lo que dice el evento.
7. Fallos persistentes van a una cola de errores (dead-letter) con alerta; los eventos pueden reprocesarse manualmente.
8. Rotación de secretos: aceptar dos secretos activos durante el cambio.

## Webhooks salientes (enviar eventos a clientes)

- Cargas firmadas (HMAC con secreto por endpoint) con id de evento, tipo, versión de esquema y timestamp.
- Reintentos con **backoff exponencial y jitter**, máximo de intentos, desactivar endpoints que fallan sostenidamente y avisar al cliente.
- Registro de entregas (estado, código, duración) consultable y con **reenvío** manual.
- URL de destino validadas contra **SSRF** (solo HTTPS; bloquear direcciones privadas, loopback y de metadatos de nube; resolver DNS y comprobar la IP final).

## Clientes de APIs de terceros

- Cliente aislado detrás de una interfaz propia (capa anticorrupción): el dominio no conoce el formato del tercero.
- **Timeouts** de conexión y lectura siempre; reintentos solo en operaciones idempotentes o con clave de idempotencia; backoff con tope; interruptor (circuit breaker) ante fallos continuos.
- Credenciales en variables de entorno; **solo sandbox o cuentas de prueba** en desarrollo y QA.
- Pruebas con dobles o respuestas grabadas (sin llamadas reales en CI); verificación periódica del contrato frente al sandbox.
- Registrar identificadores de correlación del tercero para soporte, sin guardar datos sensibles.

## Verificación

Pruebas con firma válida, firma inválida, timestamp vencido, evento duplicado, evento fuera de orden y destino lento o caído. Para pagos, la matriz G9 (`payments-review`).
