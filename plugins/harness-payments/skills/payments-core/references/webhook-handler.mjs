// Implementación de referencia del flujo de webhook de Payments Core.
// Dependencias inyectadas para poder probarlo sin red ni base de datos.
import { verifyMpSignature } from './mp-signature.mjs';
import { amountMatches, applyTransition, mapMpOrderStatus } from './state-machine.mjs';

const ORDER_TOPICS = new Set(['order', 'orders', 'orders_v2']);

/**
 * @param {object} req  { headers: {'x-signature','x-request-id'}, query: {'data.id', type|topic}, body }
 * @param {object} deps {
 *   secret,
 *   inbox: { insertIfAbsent(provider, eventId) → boolean },          // UNIQUE(provider, event_id)
 *   attempts: { findByExternalId(id) → attempt|null, save(attempt) },
 *   fetchOrder(id) → { status, status_detail, total_amount, currency }, // GET a la API del proveedor
 *   flagForReview(attempt, reason), now?
 * }
 * @returns {{ status: number, body: object }}  responder siempre rápido (< 22 s)
 */
export async function handleMpWebhook(req, deps) {
  const dataId = req.query?.['data.id'] ?? req.query?.data_id;
  const requestId = req.headers?.['x-request-id'];
  const sig = verifyMpSignature({
    signatureHeader: req.headers?.['x-signature'],
    requestId,
    dataId,
    secret: deps.secret,
    now: deps.now,
  });
  if (!sig.ok) return { status: 401, body: { error: sig.reason } };

  const topic = req.query?.type ?? req.query?.topic ?? req.body?.type;
  if (!ORDER_TOPICS.has(topic) || !dataId) return { status: 200, body: { ignored: 'topic' } };

  // Dedupe: el mismo request-id (o id+acción) no se procesa dos veces.
  const eventId = requestId ?? `${dataId}:${req.body?.action ?? ''}`;
  if (!(await deps.inbox.insertIfAbsent('mercadopago', eventId))) return { status: 200, body: { duplicate: true } };

  const attempt = await deps.attempts.findByExternalId(dataId);
  if (!attempt) return { status: 200, body: { ignored: 'unknown_order' } };

  // Fuente de verdad: el recurso consultado a la API, nunca el body del webhook.
  const order = await deps.fetchOrder(dataId);
  const next = mapMpOrderStatus(order.status, order.status_detail);

  if (['approved', 'partially_refunded', 'refunded'].includes(next) && !amountMatches(attempt, order.total_amount, order.currency)) {
    await deps.flagForReview(attempt, 'amount_mismatch');
    return { status: 200, body: { review: 'amount_mismatch' } };
  }

  const result = applyTransition(attempt.state, next);
  if (result.changed) await deps.attempts.save({ ...attempt, state: result.state });
  return { status: 200, body: { state: result.state, changed: result.changed, ignored: result.ignored } };
}
