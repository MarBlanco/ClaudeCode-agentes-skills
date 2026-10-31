// Matriz G9 sobre las implementaciones de referencia (mocks, sin red).
// Ejecutar: node --test "plugins/harness-payments/tests/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { buildManifest, verifyMpSignature, tsToMillis } from '../skills/payments-core/references/mp-signature.mjs';
import { applyTransition, mapMpOrderStatus, toCents, amountMatches } from '../skills/payments-core/references/state-machine.mjs';
import { handleMpWebhook } from '../skills/payments-core/references/webhook-handler.mjs';

const SECRET = 'test-secret-not-real';
const NOW = 1_793_500_000_000;

function sign({ dataId, requestId, ts }) {
  return `ts=${ts},v1=${createHmac('sha256', SECRET).update(buildManifest({ dataId, requestId, ts })).digest('hex')}`;
}

test('manifest: formato, minúsculas y segmentos ausentes', () => {
  assert.equal(buildManifest({ dataId: 'ORD01ABC', requestId: 'r-1', ts: '1' }), 'id:ord01abc;request-id:r-1;ts:1;');
  assert.equal(buildManifest({ requestId: 'r-1', ts: '1' }), 'request-id:r-1;ts:1;');
  assert.equal(buildManifest({ dataId: '123', ts: '1' }), 'id:123;ts:1;');
});

test('ts en segundos o milisegundos', () => {
  assert.equal(tsToMillis('1704908010'), 1704908010000);
  assert.equal(tsToMillis('1704908010000'), 1704908010000);
  assert.ok(Number.isNaN(tsToMillis('abc')));
});

test('firma: válida, inválida, alterada, vencida, mal formada', () => {
  const ts = String(NOW);
  const base = { requestId: 'req-1', dataId: 'ORD1', secret: SECRET, now: NOW };
  assert.deepEqual(verifyMpSignature({ ...base, signatureHeader: sign({ dataId: 'ORD1', requestId: 'req-1', ts }) }), { ok: true });
  assert.equal(verifyMpSignature({ ...base, signatureHeader: sign({ dataId: 'ORD2', requestId: 'req-1', ts }) }).reason, 'bad_signature');
  assert.equal(verifyMpSignature({ ...base, signatureHeader: `ts=${ts},v1=${'0'.repeat(64)}` }).reason, 'bad_signature');
  const old = String(NOW - 10 * 60 * 1000);
  assert.equal(verifyMpSignature({ ...base, signatureHeader: sign({ dataId: 'ORD1', requestId: 'req-1', ts: old }) }).reason, 'stale');
  assert.equal(verifyMpSignature({ ...base, signatureHeader: 'v1=abc' }).reason, 'malformed');
  assert.equal(verifyMpSignature({ ...base, signatureHeader: undefined }).reason, 'missing_header');
  assert.throws(() => verifyMpSignature({ ...base, secret: '', signatureHeader: sign({ dataId: 'ORD1', requestId: 'req-1', ts }) }));
});

test('mapeo Orders API → estado interno (desconocido nunca aprueba)', () => {
  assert.equal(mapMpOrderStatus('processed', 'accredited'), 'approved');
  assert.equal(mapMpOrderStatus('processed', 'partially_refunded'), 'partially_refunded');
  assert.equal(mapMpOrderStatus('refunded', 'refunded'), 'refunded');
  assert.equal(mapMpOrderStatus('processing', 'in_process'), 'pending');
  assert.equal(mapMpOrderStatus('action_required', 'waiting_capture'), 'authorized');
  assert.equal(mapMpOrderStatus('failed', 'rejected_by_issuer'), 'rejected');
  assert.equal(mapMpOrderStatus('canceled', 'canceled'), 'cancelled');
  assert.equal(mapMpOrderStatus('processed', 'algo_nuevo'), 'review');
  assert.equal(mapMpOrderStatus('estado_nuevo', 'x'), 'review');
});

test('máquina de estados: terminales no retroceden, idempotencia', () => {
  assert.equal(applyTransition('pending', 'approved').changed, true);
  assert.equal(applyTransition('approved', 'approved').changed, false);
  assert.equal(applyTransition('approved', 'pending').changed, false);
  assert.ok(applyTransition('refunded', 'approved').ignored);
  assert.equal(applyTransition('rejected', 'approved').changed, false);
  assert.equal(applyTransition('approved', 'refunded').changed, true);
});

test('importes en centavos enteros', () => {
  assert.equal(toCents('1234.50'), 123450);
  assert.equal(toCents(1234.5), 123450);
  assert.equal(toCents('10'), 1000);
  assert.ok(Number.isNaN(toCents('1.005')));
  assert.ok(Number.isNaN(toCents('abc')));
  assert.equal(amountMatches({ amountCents: 123450, currency: 'ARS' }, '1234.50', 'ARS'), true);
  assert.equal(amountMatches({ amountCents: 123450, currency: 'ARS' }, '1.00', 'ARS'), false);
  assert.equal(amountMatches({ amountCents: 123450, currency: 'ARS' }, '1234.50', 'USD'), false);
});

function harness(order, attemptState = 'pending') {
  const seen = new Set();
  const store = { attempt: { id: 'a1', externalId: 'ORD1', state: attemptState, amountCents: 150000, currency: 'ARS' } };
  const flagged = [];
  let fetches = 0;
  const deps = {
    secret: SECRET,
    now: NOW,
    inbox: { insertIfAbsent: async (p, id) => (seen.has(`${p}:${id}`) ? false : (seen.add(`${p}:${id}`), true)) },
    attempts: {
      findByExternalId: async (id) => (id.toLowerCase() === 'ord1' ? store.attempt : null),
      save: async (a) => { store.attempt = a; },
    },
    fetchOrder: async () => { fetches++; return order; },
    flagForReview: async (a, reason) => { flagged.push(reason); },
  };
  return { deps, store, flagged, fetches: () => fetches };
}

function req(requestId, dataId = 'ORD1', extra = {}) {
  return {
    headers: { 'x-signature': sign({ dataId, requestId, ts: String(NOW) }), 'x-request-id': requestId },
    query: { 'data.id': dataId, type: 'order' },
    body: { action: 'order.processed' },
    ...extra,
  };
}

const APPROVED = { status: 'processed', status_detail: 'accredited', total_amount: '1500.00', currency: 'ARS' };

test('G9 aprobado: solo tras firma válida y GET al proveedor', async () => {
  const h = harness(APPROVED);
  const r = await handleMpWebhook(req('r1'), h.deps);
  assert.equal(r.status, 200);
  assert.equal(h.store.attempt.state, 'approved');
  assert.equal(h.fetches(), 1);
});

test('G9 webhook duplicado: un solo efecto', async () => {
  const h = harness(APPROVED);
  await handleMpWebhook(req('r1'), h.deps);
  const dup = await handleMpWebhook(req('r1'), h.deps);
  assert.equal(dup.body.duplicate, true);
  assert.equal(h.fetches(), 1);
});

test('G9 fuera de orden: un evento "pending" tardío no retrocede un aprobado', async () => {
  const h = harness({ status: 'processing', status_detail: 'in_process', total_amount: '1500.00', currency: 'ARS' }, 'approved');
  const r = await handleMpWebhook(req('r2'), h.deps);
  assert.equal(h.store.attempt.state, 'approved');
  assert.ok(r.body.ignored);
});

test('G9 firma inválida: 401 sin efectos ni consultas', async () => {
  const h = harness(APPROVED);
  const bad = req('r3');
  bad.headers['x-signature'] = `ts=${NOW},v1=${'a'.repeat(64)}`;
  const r = await handleMpWebhook(bad, h.deps);
  assert.equal(r.status, 401);
  assert.equal(h.store.attempt.state, 'pending');
  assert.equal(h.fetches(), 0);
});

test('G9 importe manipulado: no aprueba y marca revisión', async () => {
  const h = harness({ ...APPROVED, total_amount: '1.00' });
  const r = await handleMpWebhook(req('r4'), h.deps);
  assert.equal(r.body.review, 'amount_mismatch');
  assert.equal(h.store.attempt.state, 'pending');
  assert.deepEqual(h.flagged, ['amount_mismatch']);
});

test('G9 rechazado y reembolsos', async () => {
  const rej = harness({ status: 'failed', status_detail: 'rejected_by_issuer', total_amount: '1500.00', currency: 'ARS' });
  await handleMpWebhook(req('r5'), rej.deps);
  assert.equal(rej.store.attempt.state, 'rejected');
  const part = harness({ status: 'processed', status_detail: 'partially_refunded', total_amount: '1500.00', currency: 'ARS' }, 'approved');
  await handleMpWebhook(req('r6'), part.deps);
  assert.equal(part.store.attempt.state, 'partially_refunded');
  const full = harness({ status: 'refunded', status_detail: 'refunded', total_amount: '1500.00', currency: 'ARS' }, 'partially_refunded');
  await handleMpWebhook(req('r7'), full.deps);
  assert.equal(full.store.attempt.state, 'refunded');
});

test('G9 topic ajeno u orden desconocida: 200 sin efectos', async () => {
  const h = harness(APPROVED);
  const other = req('r8');
  other.query.type = 'payment';
  assert.equal((await handleMpWebhook(other, h.deps)).body.ignored, 'topic');
  assert.equal((await handleMpWebhook(req('r9', 'ORD999'), h.deps)).body.ignored, 'unknown_order');
  assert.equal(h.store.attempt.state, 'pending');
});
