// «Modelo justo»: dificultad del prompt y modelo sugerido, con reglas locales.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_BY_LEVEL, levelOf } from '../hooks/model-level.mjs';

test('consultas simples → haiku; trabajo normal → sonnet; diseño o arquitectura → opus', () => {
  assert.equal(levelOf('probá si funciona'), 'simple');
  assert.equal(levelOf('probá'), 'simple'); // «probá» termina en letra con tilde: el borde Unicode lo reconoce
  assert.equal(levelOf('agregá un campo al formulario de contacto'), 'media');
  assert.equal(levelOf('diseñá la arquitectura del sistema de pagos'), 'compleja');
  assert.deepEqual(MODEL_BY_LEVEL, { simple: 'haiku', media: 'sonnet', compleja: 'opus' });
});

test('un texto largo sube a compleja y una señal de complejidad vence a la de simple', () => {
  assert.equal(levelOf('x '.repeat(200)), 'compleja');
  assert.equal(levelOf('hola, probá la migración de la base de datos'), 'compleja');
});

test('entradas vacías o raras no fallan', () => {
  for (const t of ['', '   ', null, undefined]) assert.equal(levelOf(t), 'media');
});
