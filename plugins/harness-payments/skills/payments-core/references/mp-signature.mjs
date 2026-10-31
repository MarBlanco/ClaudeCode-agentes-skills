// Implementación de referencia: verificación de x-signature de webhooks de Mercado Pago.
// Fuente: developers/es/docs/your-integrations/notifications/webhooks (verificado 31-10-2026).
// Portar al lenguaje del proyecto conservando los casos de tests/payments.test.mjs.
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Parsea "ts=...,v1=..." → { ts, v1 } (orden y espacios indiferentes). */
export function parseSignatureHeader(header) {
  const out = {};
  for (const part of String(header ?? '').split(',')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/**
 * Manifest según la doc: "id:[data.id];request-id:[x-request-id];ts:[ts];".
 * - data.id viene del query string; si es alfanumérico se usa en minúsculas.
 * - Si data.id o x-request-id faltan, su segmento se elimina.
 */
export function buildManifest({ dataId, requestId, ts }) {
  let m = '';
  if (dataId) m += `id:${String(dataId).toLowerCase()};`;
  if (requestId) m += `request-id:${requestId};`;
  m += `ts:${ts};`;
  return m;
}

/** La doc dice milisegundos, pero su ejemplo tiene 10 dígitos: aceptar ambos. */
export function tsToMillis(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return NaN;
  return n < 1e12 ? n * 1000 : n;
}

/**
 * @returns {{ ok: true } | { ok: false, reason: 'missing_header'|'malformed'|'stale'|'bad_signature' }}
 * toleranceMs: ventana anti-replay (decisión nuestra; MP no la fija). 0 = desactivada.
 */
export function verifyMpSignature({ signatureHeader, requestId, dataId, secret, now = Date.now(), toleranceMs = 5 * 60 * 1000 }) {
  if (!signatureHeader) return { ok: false, reason: 'missing_header' };
  if (!secret) throw new Error('MP webhook secret no configurado');
  const { ts, v1 } = parseSignatureHeader(signatureHeader);
  if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return { ok: false, reason: 'malformed' };
  const tsMs = tsToMillis(ts);
  if (Number.isNaN(tsMs)) return { ok: false, reason: 'malformed' };
  if (toleranceMs > 0 && Math.abs(now - tsMs) > toleranceMs) return { ok: false, reason: 'stale' };

  const expected = createHmac('sha256', secret).update(buildManifest({ dataId, requestId, ts })).digest();
  const given = Buffer.from(v1, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'bad_signature' };
  return { ok: true };
}
