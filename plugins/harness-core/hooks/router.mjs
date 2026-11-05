#!/usr/bin/env node
// harness-core · UserPromptSubmit: enrutamiento determinista de capacidades.
// Si el pedido menciona un área con skill propia (y su módulo está habilitado en el proyecto),
// agrega una línea de contexto con la skill a invocar. No fuerza nada: el modelo decide si aplica.
// Sin manifiesto del harness solo se consideran las capacidades de harness-core.
import { loadManifest, readStdinJson } from './lib.mjs';

export const RULES = [
  { module: 'core', skill: 'harness-core:product-spec', why: 'requisitos/especificación', re: /\b(requisitos?|especificacion|historias? de usuario|criterios de aceptacion|funcionalidad nueva|nueva funcionalidad|definir (el )?alcance)\b/ },
  { module: 'core', skill: 'harness-core:architecture-decisions', why: 'arquitectura', re: /\b(arquitectura|adr|microservicios?|monolito|elegir (la )?(tecnologia|stack|framework))\b/ },
  { module: 'core', skill: 'harness-core:ops-delivery', why: 'entrega y operación', re: /\b(dockerfile|docker|docker-compose|ci\/cd|pipeline|github actions|desplegar|despliegue|deploy|observabilidad|monitoreo|alertas)\b/ },
  { module: 'core', skill: 'harness-core:tech-docs', why: 'documentación', re: /\b(documentacion|documentar|readme|runbook)\b/ },
  { module: 'core', skill: 'harness-core:maintenance-upgrades', why: 'mantenimiento', re: /\b(actualizar (las )?dependencias|dependabot|deuda tecnica|refactori[sz]ar|refactor|version mayor)\b/ },
  { module: 'saas', skill: 'harness-saas:saas-architecture', why: 'tenants, auth, roles o planes', re: /\b(multi-?tenan\w*|tenants?|organizaciones|roles?|permisos|rbac|suscripcion(es)?|planes? de (pago|suscripcion)|entitlements?|saas)\b/ },
  { module: 'saas', skill: 'harness-saas:api-design', why: 'APIs y webhooks', re: /\b(api|apis|endpoints?|webhooks?|openapi|rest)\b/ },
  { module: 'saas', skill: 'harness-saas:data-modeling-migrations', why: 'datos y migraciones', re: /\b(migracion(es)?|esquema|tablas?|indices?|sql|postgres(ql)?|rls|modelo de datos)\b/ },
  { module: 'web', skill: 'harness-web:seo', why: 'SEO', re: /\b(seo|meta ?tags?|sitemap|robots\.txt|datos estructurados)\b/ },
  { module: 'web', skill: 'harness-web:owasp-security', why: 'seguridad', re: /\b(owasp|xss|csrf|inyeccion sql|revision de seguridad|auditoria de seguridad)\b/ },
  { module: 'web', skill: 'harness-web:qa-explore (agente harness-web:qa-explorer)', why: 'QA exploratoria', re: /\b(qa integral|auditoria (de )?qa|uat|explorar la (app|web) como (un )?cliente)\b/ },
];

const normalize = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

// Política de modelo (determinista, sin llamar a ningún modelo). Solo SUGIERE: un hook no puede cambiar el modelo.
// Se emite únicamente cuando se aparta del caso normal (Sonnet en la sesión): cero tokens en el resto de pedidos.
const EDIT_WORDS = /\b(implement\w*|agreg\w*|cre[ae]\w*|modific\w*|corrig\w*|correg\w*|arregl\w*|refactor\w*|elimin\w*|borr\w*|cambi\w*|migr\w*)\b/;
const OPUS_AREAS = /\b(autenticacion|autorizacion|permisos|rls|pagos?|cobros?|produccion|secretos?|credenciales|vulnerabilidad(es)?|arquitectura|multi-?tenan\w*)\b/;
const LOOKUP = /\b(busca\w*|encontra\w*|localiz\w*|donde (esta|se (define|usa|llama))|quien (usa|llama)|lista\w* (los |las |todos|todas)|cuantos|cuantas|mapea\w*|inventario de)\b/;

export function modelHint(prompt) {
  const text = normalize(prompt);
  if (text.length > 1500) return null; // pedidos largos: el criterio es del modelo principal
  if (OPUS_AREAS.test(text) && EDIT_WORDS.test(text)) {
    return { tier: 'opus', hint: 'riesgo alto: plan antes de implementar y revisión final con el agente code-reviewer (opus); no cambiar el modelo de la sesión.' };
  }
  if (LOOKUP.test(text) && !EDIT_WORDS.test(text) && text.length < 400) {
    return { tier: 'haiku', hint: 'lectura/búsqueda amplia: delegar a un subagente barato (Agent con model=haiku, o Explore) en vez de leer archivos en el hilo principal.' };
  }
  return null;
}

export function route(prompt, modules) {
  const text = normalize(prompt);
  const enabled = new Set(['core', ...(modules ?? [])]);
  return RULES.filter((r) => enabled.has(r.module) && r.re.test(text)).slice(0, 3);
}

async function main() {
  try {
    const input = await readStdinJson();
    const manifest = loadManifest(input.cwd || process.cwd());
    const hits = route(input.prompt, manifest?.modules);
    if (hits.length) {
      const list = hits.map((h) => `${h.skill} (${h.why})`).join('; ');
      process.stdout.write(`[harness] Capacidades relevantes para este pedido: ${list}. Si vas a diseñar, planificar o implementar en esa área, invocala con la herramienta Skill antes de responder; si el pedido no lo requiere, ignorá esta sugerencia.\n`);
    }
    const mh = modelHint(input.prompt);
    if (mh) process.stdout.write(`[harness] Modelo (${mh.tier}): ${mh.hint}\n`);
  } catch (err) {
    process.stderr.write(`harness router: ${err.message}\n`);
  }
}

if (process.argv[1]?.endsWith('router.mjs')) await main();
