// Tests del runner confiable de specs de regresión de qa-explorer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runnerConfig, scanSpec, summarize } from '../scripts/qa-regression.mjs';

const OK = `import { test, expect } from '@playwright/test';
// comentario con require('fs') que no cuenta
test('carrito', async ({ page, request }) => {
  await page.goto('/cart.html');
  const items = ['a', 'b'];
  expect(items[0]).toBe('a');
  const errors: string[] = [];
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Carrito');
  expect((await request.get('/api/products')).ok()).toBeTruthy();
  await page.evaluate(() => document.title);
});`;

test('revisión estática: un spec normal pasa', () => {
  assert.deepEqual(scanSpec(OK), []);
});

test('revisión estática: imports, APIs de Node y metaprogramación se rechazan', () => {
  for (const bad of [
    "import fs from 'node:fs';",
    "import { exec } from 'child_process';",
    "import './setup.js';",
    "const cp = require('child_process');",
    'process.exit(1);',
    "const m = await import('node:fs');",
    "globalThis.x = 1;",
    "test.constructor.constructor('return process')();",
    "const f = Function('return this')();",
    "eval('1');",
    "page['constructor'];",
    "obj[`proto`];",
    "await page.context().newCDPSession(page);",
    "await page.route('**', r => r.continue());",
    "await page.addInitScript(() => {});",
    'export const x = 1;',
    'const p = \u0070rocess;',
    "test.use({ launchOptions: { executablePath: 'C:/Windows/System32/calc.exe' } });",
    "test.extend({ browser: async ({}, use) => use(null) });",
    "const k = 'constr' + 'uctor'; ({})[k];",
    "await playwright.chromium.launch();",
    "await browser.newContext({ proxy: { server: 'http://evil:80' } });",
    "await testInfo.attach('x', { path: '../../../.git/config' });",
    "await browser.newBrowserCDPSession();",
    "const F = Object.values(Object.getOwnPropertyDescriptors(Object.getPrototypeOf(() => 0)));",
    "const p = 'pro' + 'cess';",
    "await fetch('https://evil.example');",
    "const s = Symbol.for('x');",
  ]) assert.ok(scanSpec(`import { test } from '@playwright/test';\n${bad}`).length > 0, bad);
});

test('config confiable: sin webServer ni globalSetup, un worker, proxy sumidero para navegador y request', () => {
  const c = runnerConfig('C:/p/.harness/qa/20261101-x', 'http://127.0.0.1:4317', 1, ['a.spec.ts', 'sub/b.spec.ts'], 'C:/tmp/work');
  assert.equal(c.testDir, 'C:/tmp/work');
  assert.deepEqual(c.testMatch, ['C:/tmp/work/a.spec.ts', 'C:/tmp/work/sub/b.spec.ts']);
  assert.equal(c.webServer, undefined);
  assert.equal(c.globalSetup, undefined);
  assert.equal(c.workers, 1);
  assert.equal(c.retries, 0);
  assert.equal(c.use.trace, 'off');
  assert.equal(c.use.proxy.server, 'http://127.0.0.1:9');
  assert.equal(c.use.baseURL, 'http://127.0.0.1:4317');
  assert.match(c.reporter[1][1].outputFile, /regression-run1\.json$/);
});

const report = (statuses) => ({
  suites: [{ specs: Object.entries(statuses).map(([title, status]) => ({ file: 'a.spec.ts', title, tests: [{ results: [{ status }] }] })) }],
});

test('reproducibilidad: mismas salidas en todas las corridas', () => {
  const s = summarize([report({ ok: 'passed', d1: 'failed' }), report({ ok: 'passed', d1: 'failed' })]);
  assert.equal(s.reproducible, true);
  assert.equal(s.rows.length, 2);
});

test('reproducibilidad: un cambio entre corridas se detecta como flaky', () => {
  const s = summarize([report({ ok: 'passed' }), report({ ok: 'failed' })]);
  assert.equal(s.reproducible, false);
});

test('main: exige --reviewed y rechaza archivos que no sean specs en regression/ (recursivo)', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join, dirname } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const script = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'qa-regression.mjs');
  const run = mkdtempSync(join(tmpdir(), 'harness-qareg-'));
  mkdirSync(join(run, 'regression', 'sub'), { recursive: true });
  writeFileSync(join(run, 'regression', 'a.spec.ts'), "import { test } from '@playwright/test';\ntest('x', async () => {});\n");
  const call = (...a) => spawnSync(process.execPath, [script, run, '--base-url', 'http://127.0.0.1:1', ...a], { encoding: 'utf8' });
  let r = call();
  assert.equal(r.status, 2);
  assert.match(r.stderr, /REVISAR PRIMERO/);
  writeFileSync(join(run, 'regression', 'sub', 'tsconfig.json'), '{}');
  r = call('--reviewed');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /sobran: sub\/tsconfig\.json/);
  writeFileSync(join(run, 'regression', 'sub', 'tsconfig.json'), '');
  const { rmSync } = await import('node:fs');
  rmSync(join(run, 'regression', 'sub', 'tsconfig.json'));
  writeFileSync(join(run, 'regression', 'sub', 'evil.spec.ts'), "import { test } from '@playwright/test';\nconst p = 'pro' + 'cess';\n");
  r = call('--reviewed');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /sub\/evil\.spec\.ts: concatenación/);
  r = spawnSync(process.execPath, [script, run, '--base-url', 'https://example.com', '--reviewed'], { encoding: 'utf8' });
  assert.match(r.stderr, /base URL no local/);
});
