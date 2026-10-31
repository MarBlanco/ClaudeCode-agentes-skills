// Implementación de referencia: máquina de estados interna de Payments Core y
// mapeo desde Mercado Pago Orders API (estados verificados 31-10-2026 en
// docs/checkout-pro-orders/payment-management/status/order-status).

export const STATES = ['created', 'pending', 'authorized', 'approved', 'partially_refunded', 'refunded', 'rejected', 'cancelled', 'expired', 'charged_back', 'review'];

// Transiciones permitidas. Un evento fuera de orden nunca hace retroceder un estado terminal.
const TRANSITIONS = {
  created: ['pending', 'authorized', 'approved', 'rejected', 'cancelled', 'expired', 'review'],
  pending: ['authorized', 'approved', 'rejected', 'cancelled', 'expired', 'review'],
  authorized: ['approved', 'cancelled', 'expired', 'review'],
  approved: ['partially_refunded', 'refunded', 'charged_back'],
  partially_refunded: ['partially_refunded', 'refunded', 'charged_back'],
  rejected: [], // reintentar = nuevo payment_attempt, no transición
  cancelled: [],
  expired: [],
  refunded: [],
  charged_back: [],
  review: ['approved', 'rejected', 'cancelled'], // solo por resolución manual
};

export function canTransition(from, to) {
  return from === to || (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Aplica una transición de forma idempotente.
 * @returns {{ state: string, changed: boolean, ignored?: string }}
 */
export function applyTransition(current, next) {
  if (current === next && next !== 'partially_refunded') return { state: current, changed: false };
  if (!canTransition(current, next)) return { state: current, changed: false, ignored: `${current} → ${next} no permitido` };
  return { state: next, changed: true };
}

/** Orders API (status, status_detail) → estado interno. Desconocido → 'review' (nunca aprobar por defecto). */
export function mapMpOrderStatus(status, statusDetail) {
  switch (status) {
    case 'created': return 'created';
    case 'processing': return 'pending'; // in_process, pending_review_manual
    case 'action_required': return statusDetail === 'waiting_capture' ? 'authorized' : 'pending';
    case 'processed':
      if (statusDetail === 'accredited') return 'approved';
      if (statusDetail === 'partially_refunded') return 'partially_refunded';
      return 'review';
    case 'refunded': return 'refunded';
    case 'failed': return 'rejected';
    case 'canceled': return statusDetail === 'expired' ? 'expired' : 'cancelled';
    case 'expired': return 'expired';
    default: return 'review';
  }
}

/**
 * Valida el recurso consultado a la API del proveedor contra el intento persistido.
 * Importes en centavos enteros. Nunca usar el body del webhook como fuente de verdad.
 */
export function amountMatches(attempt, providerAmount, providerCurrency) {
  const cents = toCents(providerAmount);
  return Number.isInteger(attempt.amountCents) && cents === attempt.amountCents && providerCurrency === attempt.currency;
}

/** "1234.50" | 1234.5 → 123450. Rechaza más de 2 decimales y valores no numéricos. */
export function toCents(value) {
  const s = String(value).trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return NaN;
  const [int, dec = ''] = s.replace('-', '').split('.');
  const cents = Number(int) * 100 + Number(dec.padEnd(2, '0'));
  return s.startsWith('-') ? -cents : cents;
}
