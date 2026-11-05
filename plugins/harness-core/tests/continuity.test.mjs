// Tests de continuidad de sesión: estado fuera del repo, detección de interrupción y aviso tras compactar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrub, startNotice } from '../hooks/continuity.mjs';

const hook = fileURLToPath(new URL('../hooks/continuity.mjs', import.meta.url));

function run(mode, input, sessionsDir) {
  return spawnSync(process.execPath, [hook, mode], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, HARNESS_SESSIONS_DIR: sessionsDir },
  });
}

const setup = () => ({ sessions: mkdtempSync(join(tmpdir(), 'hc-s-')), cwd: mkdtempSync(join(tmpdir(), 'hc-p-')) });
const stateFiles = (sessions) => {
  const proj = readdirSync(sessions)[0];
  return readdirSync(join(sessions, proj)).map((f) => JSON.parse(readFileSync(join(sessions, proj, f), 'utf8')));
};

test('scrub recorta y oculta credenciales', () => {
  assert.ok(!scrub('usá la key sk-abcdefghijk123456 y token: abc123').includes('abcdefghijk'));
  assert.ok(!scrub('password=hunter2 ahora').includes('hunter2'));
  assert.ok(scrub('x'.repeat(500)).length <= 160);
});

test('prompt marca working; stop marca idle; end marca closed', () => {
  const { sessions, cwd } = setup();
  run('start', { session_id: 'a', cwd, source: 'startup' }, sessions);
  run('prompt', { session_id: 'a', cwd, prompt: 'migrar tabla orders' }, sessions);
  assert.equal(stateFiles(sessions)[0].status, 'working');
  assert.equal(stateFiles(sessions)[0].lastPrompt, 'migrar tabla orders');
  run('stop', { session_id: 'a', cwd }, sessions);
  assert.equal(stateFiles(sessions)[0].status, 'idle');
  run('end', { session_id: 'a', cwd, reason: 'other' }, sessions);
  assert.equal(stateFiles(sessions)[0].status, 'closed');
});

test('sesión previa en working y vieja: se anuncia una vez', () => {
  const { sessions, cwd } = setup();
  run('start', { session_id: 'a', cwd, source: 'startup' }, sessions);
  run('prompt', { session_id: 'a', cwd, prompt: 'implementar webhook de pagos' }, sessions);
  const proj = readdirSync(sessions)[0];
  const f = join(sessions, proj, 'a.json');
  const s = JSON.parse(readFileSync(f, 'utf8'));
  writeFileSync(f, JSON.stringify({ ...s, updatedAt: Date.now() - 3600_000 }));
  const out = run('start', { session_id: 'b', cwd, source: 'startup' }, sessions);
  assert.match(out.stdout, /posiblemente interrumpida/);
  assert.match(out.stdout, /implementar webhook de pagos/);
  const again = run('start', { session_id: 'c', cwd, source: 'startup' }, sessions);
  assert.equal(again.stdout, '', 'no se repite el aviso');
});

test('sesión working reciente (otra ventana) no se anuncia', () => {
  const { sessions, cwd } = setup();
  run('prompt', { session_id: 'a', cwd, prompt: 'tarea larga' }, sessions);
  const out = run('start', { session_id: 'b', cwd, source: 'startup' }, sessions);
  assert.equal(out.stdout, '');
});

test('tras compactar se recuerda la tarea en curso de la misma sesión', () => {
  const { sessions, cwd } = setup();
  run('prompt', { session_id: 'a', cwd, prompt: 'refactor del módulo de facturas' }, sessions);
  const out = run('start', { session_id: 'a', cwd, source: 'compact' }, sessions);
  assert.match(out.stdout, /Tras compactar/);
  assert.match(out.stdout, /refactor del módulo de facturas/);
});

test('mención de .harness/state.md si existe', () => {
  const { sessions, cwd } = setup();
  mkdirSync(join(cwd, '.harness'));
  writeFileSync(join(cwd, '.harness', 'state.md'), 'x');
  run('prompt', { session_id: 'a', cwd, prompt: 'algo' }, sessions);
  assert.match(run('start', { session_id: 'a', cwd, source: 'compact' }, sessions).stdout, /state\.md/);
});

test('entradas inválidas o directorio ausente no fallan', () => {
  const { sessions } = setup();
  const r = spawnSync(process.execPath, [hook, 'start'], { input: 'no-json', encoding: 'utf8', env: { ...process.env, HARNESS_SESSIONS_DIR: sessions } });
  assert.equal(r.status, 0);
  assert.equal(startNotice({ dir: join(sessions, 'no-existe'), sessionId: 'x', source: 'startup', cwd: sessions }), '');
});
