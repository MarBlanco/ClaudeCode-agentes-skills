-- Esquema de referencia de Payments Core (PostgreSQL). Adaptar nombres y tipos
-- al ORM del proyecto (Payload, Prisma, Django, migraciones de Supabase).
-- Crear como migración NUEVA; nunca editar migraciones ya versionadas.

create table payment_attempts (
  id               uuid primary key default gen_random_uuid(),
  order_id         text        not null,
  attempt_number   integer     not null,
  provider         text        not null,
  external_id      text,
  idempotency_key  text        not null unique,     -- f(order_id, attempt_number), persistida antes de llamar al proveedor
  amount_cents     bigint      not null check (amount_cents > 0),
  currency         char(3)     not null,
  state            text        not null default 'created',
  review_reason    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (order_id, attempt_number),
  unique (provider, external_id)
);

-- Un solo intento activo por orden (evita doble submit concurrente)
create unique index payment_attempts_one_active
  on payment_attempts (order_id)
  where state in ('created', 'pending', 'authorized');

create table payment_events (
  id           bigserial primary key,
  provider     text        not null,
  event_id     text        not null,                 -- x-request-id o id+acción
  resource_id  text        not null,
  topic        text        not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)                        -- inbox: descarta duplicados
);

create table refunds (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid        not null references payment_attempts(id),
  idempotency_key  text        not null unique,
  amount_cents     bigint      not null check (amount_cents > 0),
  external_id      text,
  state            text        not null default 'requested',
  created_at       timestamptz not null default now()
);
