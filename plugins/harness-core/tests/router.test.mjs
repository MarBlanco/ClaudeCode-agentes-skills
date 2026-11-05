// Tests del enrutador determinista de capacidades (UserPromptSubmit).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { route } from '../hooks/router.mjs';

const skills = (prompt, modules) => route(prompt, modules).map((r) => r.skill.split(' ')[0]);

test('casos que deben sugerir una capacidad', () => {
  assert.deepEqual(skills('Estoy empezando un SaaS B2B de facturación. Decidí el modelo de multi-tenancy y cómo manejar roles y permisos.', ['web', 'saas']), ['harness-saas:saas-architecture']);
  assert.deepEqual(skills('Quiero una funcionalidad nueva: invitar al equipo. Armame la especificación con criterios de aceptación.', ['web', 'saas']), ['harness-core:product-spec']);
  assert.deepEqual(skills('Revisá este Dockerfile y decime qué corregir', []), ['harness-core:ops-delivery']);
  assert.deepEqual(skills('Necesito una migración para agregar índices a la tabla orders en Postgres', ['saas']), ['harness-saas:data-modeling-migrations']);
  assert.deepEqual(skills('Hacé una auditoría QA integral de la app', ['web']), ['harness-web:qa-explore']);
});

test('casos que no deben sugerir nada', () => {
  for (const p of ['¿Qué hora es en UTC?', 'Renombrá la variable x a total en src/a.ts', 'Explicame qué hace esta función', 'Corregí el typo en el título del header']) {
    assert.deepEqual(skills(p, ['web', 'saas']), [], p);
  }
});

test('solo módulos habilitados: sin el módulo saas no se sugieren sus skills', () => {
  assert.deepEqual(skills('Diseñá la API y los roles del SaaS', ['web']), []);
  assert.deepEqual(skills('Diseñá la API y los roles del SaaS', ['saas']), ['harness-saas:saas-architecture', 'harness-saas:api-design']);
});

test('como máximo tres sugerencias', () => {
  assert.ok(route('arquitectura, docker, readme, api, roles, migración, seo, owasp', ['web', 'saas']).length <= 3);
});

// --- política de modelo ---
import { modelHint } from '../hooks/router.mjs';

test('modelHint: riesgo alto con verbo de edición sugiere opus (revisión), sin cambiar la sesión', () => {
  assert.equal(modelHint('Implementá la autenticación con roles y permisos')?.tier, 'opus');
  assert.equal(modelHint('Modificá el webhook de pagos para reintentos')?.tier, 'opus');
});

test('modelHint: búsqueda sin edición sugiere haiku', () => {
  assert.equal(modelHint('¿Dónde se define la función calcularTotal y quién la usa?')?.tier, 'haiku');
  assert.equal(modelHint('Listá todos los endpoints del proyecto')?.tier, 'haiku');
});

test('modelHint: caso normal, edición simple, pedido largo o preguntas de riesgo sin editar: nada', () => {
  for (const p of ['Renombrá la variable x a total', 'Corregí el typo en el header', 'Explicame cómo funciona la autenticación', 'Buscá y corregí el bug del carrito', 'hola']) {
    assert.equal(modelHint(p), null, p);
  }
  assert.equal(modelHint('implementá pagos ' + 'x '.repeat(900)), null);
});
