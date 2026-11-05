// Tests del hook SubagentStop de entregables de qa-explorer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hook = join(dirname(fileURLToPath(import.meta.url)), '..', 'hooks', 'qa-complete.mjs');
const call = (input) => {
  const r = spawnSync(process.execPath, [hook], { input: JSON.stringify(input), encoding: 'utf8' });
  return r.stdout ? JSON.parse(r.stdout) : null;
};

function project(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'harness-qacomplete-'));
  const run = join(root, '.harness', 'qa', '20261101-audit');
  mkdirSync(run, { recursive: true });
  for (const [f, c] of Object.entries(files)) {
    mkdirSync(dirname(join(run, f)), { recursive: true });
    writeFileSync(join(run, f), c);
  }
  return { root, run };
}

// report.md no se exige: Claude Code no deja que un subagente escriba archivos de informe.
const COMPLETE = { 'charter.md': 'c', 'map.md': 'm', 'ledger.md': 'l', 'screenshots/01.png': 'x', 'regression/a.spec.ts': 't' };
const AGENT = 'harness-web:qa-explorer';

test('no actúa sobre otros agentes', () => {
  const { root } = project();
  assert.equal(call({ agent_type: 'general-purpose', cwd: root, stop_hook_active: false }), null);
});

test('corrida completa: deja terminar', () => {
  const { root } = project(COMPLETE);
  assert.equal(call({ agent_type: AGENT, cwd: root, stop_hook_active: false }), null);
});

test('faltan entregables: bloquea una vez con la lista', () => {
  const { root } = project({ 'report.md': 'r', 'screenshots/01.png': 'x' });
  const out = call({ agent_type: AGENT, cwd: root, stop_hook_active: false });
  assert.equal(out.decision, 'block');
  for (const f of ['charter.md', 'map.md', 'ledger.md', 'regression/']) assert.match(out.reason, new RegExp(f.replace('.', '\.')));
});

test('segunda parada sin completar: marca HARNESS-INCOMPLETO.txt y avisa, sin bucle', () => {
  const { root, run } = project({ 'map.md': 'm' });
  const out = call({ agent_type: AGENT, cwd: root, stop_hook_active: true });
  assert.equal(out.decision, undefined);
  assert.match(out.systemMessage, /INCOMPLETA/);
  assert.ok(existsSync(join(run, 'HARNESS-INCOMPLETO.txt')));
  assert.match(readFileSync(join(run, 'HARNESS-INCOMPLETO.txt'), 'utf8'), /charter\.md/);
});

test('declarado como incompleto (respuesta final o report.md del coordinador): deja terminar', () => {
  const { root: r2 } = project({ 'charter.md': 'c' });
  assert.equal(call({ agent_type: AGENT, cwd: r2, stop_hook_active: false, last_assistant_message: 'Estado: INCOMPLETO — faltó el mapa porque la app no cargó' }), null);
  const { root } = project({ 'report.md': '# QA\n**Estado:** INCOMPLETO — faltó el mapa' });
  assert.equal(call({ agent_type: AGENT, cwd: root, stop_hook_active: false }), null);
});

test('usa la corrida citada en la respuesta del agente', () => {
  const { root } = project(COMPLETE);
  mkdirSync(join(root, '.harness', 'qa', '20261102-otra'), { recursive: true });
  assert.equal(call({ agent_type: AGENT, cwd: root, stop_hook_active: false, last_assistant_message: 'REPORT: .harness/qa/20261101-audit/report.md' }), null);
  assert.equal(call({ agent_type: AGENT, cwd: root, stop_hook_active: false, last_assistant_message: 'REPORT: .harness/qa/20261102-otra/report.md' }).decision, 'block');
});

test('sin corrida: bloquea', () => {
  const root = mkdtempSync(join(tmpdir(), 'harness-qacomplete-none-'));
  assert.equal(call({ agent_type: AGENT, cwd: root, stop_hook_active: false }).decision, 'block');
});

test('marcador obsoleto: se borra cuando la corrida ya está completa', () => {
  const { root, run } = project({ ...COMPLETE, 'HARNESS-INCOMPLETO.txt': 'Faltan: report.md' });
  assert.equal(call({ agent_type: AGENT, cwd: root, stop_hook_active: false }), null);
  assert.equal(existsSync(join(run, 'HARNESS-INCOMPLETO.txt')), false);
});

test('re-revisión: screenshots o regression como archivo cuentan como faltantes (no falla abierto)', () => {
  const { root } = project({ 'charter.md': 'c', 'map.md': 'm', 'ledger.md': 'l', 'report.md': 'r', screenshots: 'no soy carpeta', regression: 'tampoco' });
  const out = call({ agent_type: AGENT, cwd: root, stop_hook_active: false });
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /screenshots/);
});
