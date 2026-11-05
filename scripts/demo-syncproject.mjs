#!/usr/bin/env node
// Demostración reproducible de SyncProject v2 sobre un proyecto TEMPORAL (nunca toca un proyecto real):
//   1) dry-run (no escribe)  2) apply  3) re-apply idempotente  4) conflicto por edición manual  5) rollback byte a byte.
// Usa la CLI real (scripts/sync-project.mjs). Falla (exit 1) si algún resultado no es el esperado,
// por lo que sirve también como prueba de extremo a extremo en CI. Uso: npm run demo:sync
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(REPO, 'scripts', 'sync-project.mjs');
const work = mkdtempSync(join(tmpdir(), 'harness-demo-'));
const project = join(work, 'mi-app');
// Las aprobaciones de comandos van a un archivo temporal: la demo no modifica ~/.claude.
const env = { ...process.env, HARNESS_APPROVALS_FILE: join(work, 'approved.json') };
let failed = 0;

const sync = (...args) => spawnSync(process.execPath, [CLI, '--project', project, ...args], { encoding: 'utf8', env });
const show = (title, r) => {
  console.log(`\n$ sync-project ${title}  (exit ${r.status})`);
  const out = `${r.stdout}${r.stderr}`.trim().split('\n').slice(0, 14).join('\n');
  console.log(out.replace(/^/gm, '  '));
};
const expect = (cond, msg) => {
  console.log(`  ${cond ? '✔' : '✖'} ${msg}`);
  if (!cond) failed++;
};
function snapshot(dir) {
  const h = createHash('sha256');
  const walk = (d) => readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach((e) => {
    const p = join(d, e.name);
    if (e.name === '.harness-backup' || e.name === '.git') return;
    if (e.isDirectory()) walk(p);
    else h.update(relative(dir, p)).update(readFileSync(p));
  });
  walk(dir);
  return h.digest('hex').slice(0, 16);
}

try {
  // Proyecto de ejemplo: Vite + Supabase, con configuración y skill propias que NO deben tocarse.
  mkdirSync(join(project, 'app'), { recursive: true });
  mkdirSync(join(project, 'supabase'));
  mkdirSync(join(project, '.claude'), { recursive: true });
  writeFileSync(join(project, 'app', 'package.json'), JSON.stringify({ devDependencies: { vite: '^8.0.0' } }));
  writeFileSync(join(project, '.claude', 'settings.json'), JSON.stringify({ permissions: { allow: ['Bash(npm run dev)'] } }, null, 2));
  writeFileSync(join(project, 'CLAUDE.md'), '# mi-app\nReglas propias del proyecto.\n');
  writeFileSync(join(project, '.gitignore'), 'node_modules/\n.env\n');
  const original = snapshot(project);

  console.log('== 1. Dry-run: muestra el plan y no escribe ==');
  const dry = sync('--profile', 'vite-supabase');
  show('--profile vite-supabase', dry);
  expect(dry.status === 0 && snapshot(project) === original, 'el árbol del proyecto quedó idéntico');

  console.log('\n== 2. Apply: aplica lo gestionado y crea backup ==');
  const app = sync('--profile', 'vite-supabase', '--apply');
  show('--profile vite-supabase --apply', app);
  const settings = JSON.parse(readFileSync(join(project, '.claude', 'settings.json'), 'utf8'));
  expect(app.status === 0, 'apply terminó sin error');
  expect(settings.permissions.allow.includes('Bash(npm run dev)'), 'el permiso propio del proyecto se conservó');
  expect(settings.enabledPlugins?.['harness-web@harness'] === true, 'harness-web quedó habilitado para el proyecto');
  expect(readFileSync(join(project, 'CLAUDE.md'), 'utf8').includes('Reglas propias'), 'CLAUDE.md no se tocó');
  const applied = snapshot(project);

  console.log('\n== 3. Re-apply: idempotente ==');
  const again = sync('--apply');
  show('--apply', again);
  expect(again.status === 0 && snapshot(project) === applied, 'segunda ejecución sin cambios');

  console.log('\n== 4. Conflicto: edición manual de una entrada gestionada ==');
  const f = join(project, '.claude', 'settings.json');
  const edited = JSON.parse(readFileSync(f, 'utf8'));
  edited.enabledPlugins['harness-web@harness'] = false;
  writeFileSync(f, JSON.stringify(edited, null, 2));
  const before = snapshot(project);
  const conflict = sync('--apply');
  show('--apply (tras editar a mano enabledPlugins)', conflict);
  expect(conflict.status !== 0, 'apply se negó a pisar la edición (exit distinto de 0)');
  expect(/onflicto/.test(conflict.stdout + conflict.stderr), 'el mensaje menciona el conflicto');
  expect(snapshot(project) === before, 'no se escribió nada');

  console.log('\n== 5. Rollback: restaura el estado previo byte a byte ==');
  const rb = sync('--rollback');
  show('--rollback', rb);
  expect(rb.status === 0, 'rollback terminó sin error');
  expect(snapshot(project) === original, 'el proyecto volvió exactamente al estado original');
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(failed ? `\nDEMO FALLIDA: ${failed} verificación(es) no se cumplieron.` : '\nDEMO OK: todas las verificaciones se cumplieron.');
process.exit(failed ? 1 : 0);
