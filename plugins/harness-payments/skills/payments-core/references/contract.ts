// Contrato de referencia de Payments Core. Extiende el existente del proyecto
// (Regalarte: PaymentProvider con initiate/getStatus/cancel) sin romperlo:
// los métodos nuevos se agregan; los existentes conservan su firma.

export type Currency = 'ARS' | 'USD';

/** Importe en centavos enteros. Nunca float. */
export interface Money {
  amountCents: number;
  currency: Currency;
}

export type PaymentState =
  | 'created' | 'pending' | 'authorized' | 'approved'
  | 'partially_refunded' | 'refunded'
  | 'rejected' | 'cancelled' | 'expired' | 'charged_back'
  | 'review';

export interface CheckoutInput {
  orderId: string;          // orden del backend; el total se recalcula desde la base
  attemptNumber: number;    // intento lógico → clave de idempotencia determinista
  amount: Money;            // calculado en servidor, nunca recibido del cliente
  payerEmail?: string;
  returnUrl: string;        // solo muestra "procesando"; no confirma nada
  cardToken?: string;       // Bricks: token generado en el cliente
}

export interface CheckoutResult {
  externalId: string;
  idempotencyKey: string;
  state: PaymentState;
  redirectUrl?: string;     // Checkout Pro
}

export interface ProviderPayment {
  externalId: string;
  state: PaymentState;      // ya mapeado con mapStatus
  amount: Money;
  raw: { status: string; statusDetail?: string };
}

export interface RefundInput {
  externalId: string;
  amount?: Money;           // ausente = reembolso total
  idempotencyKey: string;   // propia de cada reembolso
}

export interface VerifiedEvent {
  provider: string;
  eventId: string;          // dedupe: UNIQUE(provider, event_id)
  resourceId: string;       // se consulta al proveedor; el body no es fuente de verdad
  topic: string;
}

export interface RawRequest {
  headers: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  rawBody: string;
}

export interface PaymentsCoreProvider {
  readonly name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  getPayment(externalId: string): Promise<ProviderPayment>;
  refund(input: RefundInput): Promise<{ refundId: string; state: PaymentState }>;
  cancel(externalId: string): Promise<{ state: PaymentState }>;
  /** Lanza si la firma es inválida, falta o está fuera de la ventana anti-replay. */
  verifyWebhook(req: RawRequest): Promise<VerifiedEvent>;
  mapStatus(status: string, statusDetail?: string): PaymentState;
}
