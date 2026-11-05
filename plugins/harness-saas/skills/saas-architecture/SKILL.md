---
name: saas-architecture
description: Diseñar y revisar el núcleo de un SaaS - multi-tenancy y aislamiento de datos, autenticación, autorización con roles y permisos, invitaciones, planes y entitlements ligados a la suscripción, ciclo de vida del tenant (alta, baja, exportación, borrado). Usar al crear un SaaS, al agregar organizaciones, roles, planes o límites de uso, o al revisar fugas entre tenants y permisos. Pagos concretos van por payments-core.
---

# Arquitectura SaaS

Un SaaS falla de forma grave cuando un cliente ve datos de otro o accede a lo que no pagó. Este núcleo se diseña primero y se prueba con casos de aislamiento.

## 1. Modelo de tenancy

| Modelo | Aislamiento | Costo/operación | Úsalo cuando |
|---|---|---|---|
| **Compartido** (una base, `tenant_id` + RLS) | lógico | bajo; una migración para todos | B2B pequeño/mediano, muchos tenants chicos (por defecto) |
| Esquema por tenant | medio | migraciones por esquema | pocos tenants con necesidades distintas |
| Base por tenant | físico | alto | requisitos regulatorios o contractuales de aislamiento fuerte |

Decidirlo con `architecture-decisions` y dejar un ADR. Con el modelo compartido:

- `tenant_id NOT NULL` en toda tabla de negocio; índices que **empiezan por `tenant_id`**; unicidad por tenant (`UNIQUE (tenant_id, slug)`).
- Claves foráneas que incluyan el tenant (`FOREIGN KEY (tenant_id, parent_id)`) para impedir referencias cruzadas.
- **El tenant sale de la sesión autenticada** (membresía del usuario), nunca de un parámetro que el cliente pueda falsificar.
- **RLS como defensa en profundidad**, además del filtro en la capa de aplicación; las políticas se prueban (ver skill `supabase-postgres-best-practices`, reglas de RLS). Las claves de servicio que saltean RLS solo en servidor y con el tenant explícito.
- Trabajos en segundo plano, colas, cachés, búsqueda, archivos y logs llevan el tenant en su clave o contexto.

## 2. Autenticación

- Usar la solución probada del stack (proveedor gestionado, Auth.js, el sistema de autenticación de Django). No implementar criptografía ni gestión de sesiones propias.
- Contraseñas con argon2id o bcrypt; verificación de email; restablecimiento con token de un solo uso, hasheado, con expiración corta; respuestas que no revelan si la cuenta existe; límite de intentos.
- Cookies de sesión `HttpOnly`, `Secure`, `SameSite`; protección CSRF cuando haya cookies; tokens de acceso de vida corta con rotación del refresh; OAuth/OIDC con PKCE; MFA para roles privilegiados.

## 3. Autorización

- **Denegar por defecto**, en el servidor y en cada petición; la interfaz solo oculta, no protege.
- Roles por organización (p. ej. propietario, administrador, miembro, lector) que se traducen en **permisos** `recurso:acción`; los endpoints verifican permisos, no nombres de rol.
- **Comprobación a nivel de objeto**: cada recurso se carga dentro del tenant del usuario y se verifica que el actor puede operarlo (evita IDOR).
- Personal de la plataforma separado de los roles de tenant; la suplantación (impersonation) queda auditada y limitada.
- Invitaciones con token de un solo uso y expiración; proteger la baja o el cambio del último propietario.

## 4. Planes y entitlements

- Del **plan** salen **entitlements** (funciones habilitadas y límites: asientos, proyectos, uso mensual). Se evalúan en el servidor, con una función única `can(tenant, feature)` / `withinLimit(tenant, metric)`.
- Estados de la suscripción mapeados a acceso (`trialing`, `active`, `past_due` con periodo de gracia, `canceled`, `unpaid`). La fuente de verdad del estado es el evento verificado del proveedor de pagos (webhook idempotente), no el redirect del navegador. Integración y estados de pago: `harness-payments:payments-core`.
- Medición de uso idempotente y auditable; bajas de plan que respetan datos existentes.

## 5. Ciclo de vida y datos

Alta de tenant (provisión mínima y atómica), baja con **exportación** y **borrado** en plazo definido, copias de seguridad con restauración probada, y cumplimiento de la normativa de protección de datos que aplique (p. ej. GDPR; en Argentina, Ley 25.326): validarlo con asesoría legal, no suponerlo.

## 6. Pruebas obligatorias (evidencia para G2/G3/G8)

1. **Aislamiento**: con dos tenants A y B, el usuario de A no puede leer, listar, modificar ni borrar datos de B por API, por consulta directa con RLS, por exportación ni por búsqueda. Incluir ids de B enviados por A.
2. **Matriz de roles** por endpoint: cada rol permitido pasa, los demás reciben 403.
3. **Entitlements**: sobrepasar un límite o usar una función no incluida en el plan se rechaza; el estado `past_due` y `canceled` cambian el acceso como se definió.
4. Revisión de seguridad con `owasp-security` (control de acceso, A01) y, si cambia auth o permisos, `claude-security`.

Cualquier cambio de autenticación, permisos o RLS es riesgo **alto** en `harness-plan`.
