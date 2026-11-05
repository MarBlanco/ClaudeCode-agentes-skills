#!/usr/bin/env node
// Demostración reproducible de la regresión de QA Explorer:
//   levanta la app de prueba (7 defectos sembrados), ejecuta los specs de examples/qa-explorer-run
//   con el runner confiable (plugins/harness-web/scripts/qa-regression.mjs, 2 corridas) y verifica el resultado esperado.
// Requiere un "runner" con @playwright/test y Chromium (ver examples/qa-explorer-run/README.md).
// Uso: npm run demo:qa -- --runner <carpeta>      (o variable HARNESS_QA_RUNNER)
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const runner = resolve(argv[argv.indexOf('--runner') + 1] ?? process.env.HARNESS_QA_RUNNER ?? join(process.env.HOME ?? process.env.USERPROFILE ?? '.', '.claude', 'harness', 'qa-runner'));
const PORT = '4317';

if (!existsSync(join(runner, 'node_modules', '@playwright', 'test', 'cli.js'))) {
  console.error(`No se encontró @playwright/test en el runner: ${runner}\nCrearlo:\n  mkdir "${runner}" && cd "${runner}" && npm init -y && npm i @playwright/test && npx playwright install chromium\nLuego: npm run demo:qa -- --runner "${runner}"`);
  process.exit(2);
}

// qa-regression escribe logs y resultados dentro de la carpeta de la corrida: se ejecuta sobre una copia temporal.
const work = mkdtempSync(join(tmpdir(), 'harness-demo-qa-'));
const runDir = join(work, '20261031-2312-full-audit');
cpSync(join(REPO, 'examples', 'qa-explorer-run'), runDir, { recursive: true });

const server = spawn(process.execPath, [join(REPO, 'plugins', 'harness-web', 'tests', 'fixtures', 'qa-app', 'server.mjs'), PORT], { stdio: 'ignore' });
let status = 1;
try {
  await new Promise((r) => setTimeout(r, 800));
  const r = spawnSync(process.execPath, [join(REPO, 'plugins', 'harness-web', 'scripts', 'qa-regression.mjs'), runDir, '--base-url', `http://127.0.0.1:${PORT}`, '--reviewed', '--runner', runner, '--times', '2'], { encoding: 'utf8' });
  console.log(r.stdout);
  if (r.stderr) console.error(r.stderr);
  const rows = r.stdout.split('\n').filter((l) => /^\| (defects|journeys)\.spec\.ts/.test(l));
  const outcome = (name) => rows.filter((l) => l.includes(`${name}.spec.ts`)).map((l) => l.split('|').slice(2, 4).map((c) => c.trim()));
  const defects = outcome('defects').flat();
  const journeys = outcome('journeys').flat();
  const ok = rows.length === 18 && /reproducible: s[ií]/.test(r.stdout) && defects.length > 0 && defects.every((c) => c === 'failed') && journeys.length > 0 && journeys.every((c) => c === 'passed');
  console.log(ok
    ? 'DEMO OK: los specs de defectos fallan (la app tiene los defectos sembrados), los recorridos sanos pasan, y el resultado es idéntico en las 2 corridas.'
    : 'DEMO FALLIDA: el resultado no coincide con lo esperado (ver tabla).');
  status = ok ? 0 : 1;
} finally {
  server.kill();
  rmSync(work, { recursive: true, force: true });
}
process.exit(status);
