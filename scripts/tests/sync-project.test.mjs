// Tests de SyncProject v2. Ejecutar: node --test "scripts/tests/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
process.env.HARNESS_APPROVALS_FILE = join(mkdtempSync(join(tmpdir(), 'harness-approvals-')), 'approved.json');
const { apply, computePlan, listBackups, plan, rollback, updateGitignore } = await import('../sync-project.mjs');

function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.name === '.harness-backup') continue;
      if (e.isDirectory()) walk(p);
      else out[relative(dir, p)] = readFileSync(p).toString('base64');
    }
  };
  walk(dir);
  return out;
}

function viteProject() {
  const dir = mkdtempSync(join(tmpdir(), 'sync-test-'));
  mkdirSync(join(dir, 'app'), { recursive: true });
  mkdirSync(join(dir, 'supabase'));
  writeFileSync(join(dir, 'app', 'package.json'), JSON.stringify({ devDependencies: { vite: '^8.0.0' } }));
  mkdirSync(join(dir, '.claude', 'skills', 'harness-plan'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'skills', 'harness-plan', 'SKILL.md'), '---\nname: harness-plan\n---\nvieja\n');
  mkdirSync(join(dir, '.claude', 'skills', 'mi-skill'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'skills', 'mi-skill', 'SKILL.md'), '---\nname: mi-skill\n---\n');
  mkdirSync(join(dir, '.claude', 'agents'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'agents', 'code-reviewer.md'), 'viejo');
  writeFileSync(join(dir, '.claude', 'settings.json'), '{\r\n    "permissions": {\r\n        "allow": ["Bash(npm run dev)"]\r\n    }\r\n}\r\n');
  writeFileSync(join(dir, '.claude', 'settings.local.json'), '{"permissions":{"ask":["Bash(rm:*)"]}}');
  writeFileSync(join(dir, 'CLAUDE.md'), '# proyecto\n');
  writeFileSync(join(dir, '.gitignore'), 'node_modules/\r\n.env\r\n');
  return dir;
}

const cleanup = (d) => rmSync(d, { recursive: true, force: true });

test('dry-run no escribe nada', () => {
  const dir = viteProject();
  try {
    const before = snapshot(dir);
    const pl = plan(dir, { profile: 'vite-supabase', retireLegacy: true });
    assert.ok(pl.entries.add.includes('enabledPlugins:harness-web@harness'));
    assert.ok(pl.entries.add.includes('permissions.deny:mcp__rea'));
    assert.deepEqual(pl.legacy.sort(), [join('.claude', 'agents', 'code-reviewer.md'), join('.claude', 'skills', 'harness-plan')].sort());
    assert.deepEqual(snapshot(dir), before);
  } finally { cleanup(dir); }
});

test('apply: agrega lo gestionado, conserva lo propio, retira legado; re-sync idempotente', () => {
  const dir = viteProject();
  try {
    const r = apply(plan(dir, { profile: 'vite-supabase', retireLegacy: true }));
    assert.ok(r.backup);
    const s = readFileSync(join(dir, '.claude', 'settings.json'), 'utf8');
    const settings = JSON.parse(s);
    assert.deepEqual(settings.permissions.allow, ['Bash(npm run dev)'], 'entrada del proyecto conservada');
    assert.deepEqual(settings.permissions.deny, ['mcp__rea']);
    assert.equal(settings.enabledPlugins['harness-web@harness'], true);
    assert.ok(s.includes('\r\n    "permissions"'), 'conserva CRLF e indentación de 4');
    assert.equal(readFileSync(join(dir, '.claude', 'settings.local.json'), 'utf8'), '{"permissions":{"ask":["Bash(rm:*)"]}}');
    assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), '# proyecto\n');
    const gi = readFileSync(join(dir, '.gitignore'), 'utf8');
    assert.ok(gi.startsWith('node_modules/\r\n.env\r\n'));
    assert.ok(gi.includes('.harness/\r\n'));
    assert.ok(!existsSync(join(dir, '.claude', 'skills', 'harness-plan')), 'legado retirado');
    assert.ok(!existsSync(join(dir, '.claude', 'agents', 'code-reviewer.md')));
    assert.ok(existsSync(join(dir, '.claude', 'skills', 'mi-skill', 'SKILL.md')), 'skill propia intacta');
    const m = JSON.parse(readFileSync(join(dir, '.claude', 'harness.manifest.json'), 'utf8'));
    assert.equal(m.profile, 'vite-supabase');
    assert.ok(m.managed['permissions.deny:mcp__rea']);
    assert.equal(m.quality.typecheck.command, 'npx tsc -b');

    const before = snapshot(dir);
    const again = plan(dir, { retireLegacy: true });
    assert.equal(Object.values(again.changes).some(Boolean), false, 'segundo sync sin cambios');
    assert.deepEqual(apply(again), { backup: null, written: [] });
    assert.deepEqual(snapshot(dir), before);
  } finally { cleanup(dir); }
});

test('rollback restaura byte a byte, incluido el legado', () => {
  const dir = viteProject();
  try {
    const original = snapshot(dir);
    apply(plan(dir, { profile: 'vite-supabase', retireLegacy: true }));
    assert.notDeepEqual(snapshot(dir), original);
    const r = rollback(dir);
    assert.equal(r.backup, listBackups(dir).at(-1));
    assert.deepEqual(snapshot(dir), original);
  } finally { cleanup(dir); }
});

test('entrada gestionada editada a mano → conflicto y no escribe', () => {
  const dir = viteProject();
  try {
    apply(plan(dir, { profile: 'vite-supabase' }));
    const f = join(dir, '.claude', 'settings.json');
    const s = JSON.parse(readFileSync(f, 'utf8'));
    s.enabledPlugins['harness-web@harness'] = false;
    s.permissions.allow.push('Bash(ls)'); // cambio propio no gestionado: no es conflicto
    writeFileSync(f, JSON.stringify(s, null, 2));
    const before = snapshot(dir);
    const pl = plan(dir, {});
    assert.deepEqual(pl.entries.conflict.map((c) => c.key), ['enabledPlugins:harness-web@harness']);
    assert.throws(() => apply(pl), /Conflictos/);
    assert.deepEqual(snapshot(dir), before);
  } finally { cleanup(dir); }
});

test('entrada preexistente igual se adopta y nunca se retira', () => {
  const plan1 = computePlan({ 'permissions.deny:mcp__rea': true }, { 'permissions.deny:mcp__rea': true }, {}, {});
  assert.deepEqual(plan1.adopt, ['permissions.deny:mcp__rea']);
  // Si el perfil deja de pedirla, no se borra (no es gestionada)
  const plan2 = computePlan({}, { 'permissions.deny:mcp__rea': true }, {}, { 'permissions.deny:mcp__rea': true });
  assert.deepEqual(plan2.remove, []);
  // Gestionada que el perfil ya no pide y sigue igual → se retira
  const plan3 = computePlan({}, { 'enabledPlugins:x': true }, { 'enabledPlugins:x': true }, {});
  assert.deepEqual(plan3.remove, ['enabledPlugins:x']);
  // Valor distinto preexistente → conflicto
  const plan4 = computePlan({ 'enabledPlugins:x': true }, { 'enabledPlugins:x': false }, {}, {});
  assert.equal(plan4.conflict.length, 1);
});

test('perfil que no coincide con el stack aborta', () => {
  const dir = viteProject();
  try {
    assert.throws(() => plan(dir, { profile: 'django-react' }), /no coincide/);
  } finally { cleanup(dir); }
});

test('next-payload + payments: .mcp.json conserva servidores propios; overrides del proyecto', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sync-test-'));
  try {
    mkdirSync(join(dir, 'apps', 'web'), { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ workspaces: ['apps/*'] }));
    writeFileSync(join(dir, 'apps', 'web', 'package.json'), JSON.stringify({ dependencies: { next: '16', payload: '3' } }));
    writeFileSync(join(dir, '.mcp.json'), JSON.stringify({ mcpServers: { propio: { command: 'x' } } }, null, 2) + '\n');
    mkdirSync(join(dir, '.claude'));
    writeFileSync(join(dir, '.claude', 'harness.project.json'), JSON.stringify({ gateCommands: { G2: 'npm run test:coverage --workspace=apps/web' } }));
    apply(plan(dir, { profile: 'next-payload', modules: ['payments'] }));
    const mcp = JSON.parse(readFileSync(join(dir, '.mcp.json'), 'utf8'));
    assert.deepEqual(Object.keys(mcp.mcpServers).sort(), ['next-devtools', 'propio']);
    const settings = JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'));
    assert.equal(settings.enabledPlugins['mercadopago@claude-plugins-official'], true);
    assert.equal(settings.enabledPlugins['harness-payments@harness'], true);
    const m = JSON.parse(readFileSync(join(dir, '.claude', 'harness.manifest.json'), 'utf8'));
    assert.deepEqual(m.modules, ['web', 'payments']);
    assert.equal(m.gateCommands.G2, 'npm run test:coverage --workspace=apps/web');
    assert.deepEqual(m.gateCommands.G1, ['npm run type-check', 'npm run lint', 'npm run build']);
    // Re-sync sin --modules conserva los módulos del manifiesto
    assert.equal(Object.values(plan(dir, {}).changes).some(Boolean), false);
    // Quitar el módulo payments retira solo sus entradas gestionadas
    const less = plan(dir, { profile: 'next-payload', modules: ['web'] });
    assert.deepEqual(less.entries.remove.sort(), ['enabledPlugins:harness-payments@harness', 'enabledPlugins:mercadopago@claude-plugins-official']);
  } finally { cleanup(dir); }
});

test('gitignore: bloque idempotente y archivo nuevo', () => {
  const once = updateGitignore('a\n');
  assert.equal(updateGitignore(once), once);
  assert.ok(updateGitignore(null).startsWith('# >>> harness'));
});

test('archivos CI: se crean, son idempotentes, respetan los propios y detectan ediciones', () => {
  const dir = viteProject();
  try {
    writeFileSync(join(dir, 'app', 'package-lock.json'), '{}');
    apply(plan(dir, { profile: 'vite-supabase' }));
    const dep = readFileSync(join(dir, '.github', 'dependabot.yml'), 'utf8');
    assert.match(dep, /directory: '\/app'/);
    assert.match(dep, /package-ecosystem: 'github-actions'/);
    assert.ok(existsSync(join(dir, '.github', 'workflows', 'harness-security.yml')));
    assert.equal(Object.values(plan(dir, {}).changes).some(Boolean), false, 're-sync sin cambios');

    writeFileSync(join(dir, '.github', 'dependabot.yml'), `${dep}# editado\n`);
    const pl = plan(dir, {});
    assert.deepEqual(pl.conflicts.map((c) => c.key), ['.github/dependabot.yml']);
    assert.throws(() => apply(pl), /Conflictos/);
  } finally { cleanup(dir); }

  const own = viteProject();
  try {
    mkdirSync(join(own, '.github', 'workflows'), { recursive: true });
    writeFileSync(join(own, '.github', 'dependabot.yml'), 'version: 2\n# propio\n');
    writeFileSync(join(own, '.github', 'workflows', 'sec.yml'), 'jobs: { x: { steps: [ { run: gitleaks detect } ] } }\n');
    const pl = plan(own, { profile: 'vite-supabase' });
    assert.deepEqual(pl.files.own, ['.github/dependabot.yml']);
    assert.equal(pl.fileContents['.github/workflows/harness-security.yml'], undefined, 'no duplica un workflow de seguridad propio');
    apply(pl);
    assert.equal(readFileSync(join(own, '.github', 'dependabot.yml'), 'utf8'), 'version: 2\n# propio\n');
  } finally { cleanup(own); }
});

test('archivos CI: CRLF no es conflicto; borrado a mano sí', () => {
  const dir = viteProject();
  try {
    apply(plan(dir, { profile: 'vite-supabase' }));
    const f = join(dir, '.github', 'dependabot.yml');
    writeFileSync(f, readFileSync(f, 'utf8').replace(/\n/g, '\r\n'));
    const crlf = plan(dir, {});
    assert.deepEqual(crlf.conflicts, []);
    assert.ok(crlf.files.keep.includes('.github/dependabot.yml'));
    rmSync(f);
    const deleted = plan(dir, {});
    assert.deepEqual(deleted.conflicts.map((c) => `${c.key}: ${c.reason}`), ['.github/dependabot.yml: archivo gestionado borrado a mano']);
  } finally { cleanup(dir); }
});

test('seguridad: el manifiesto no puede hacer borrar rutas ajenas; rollback rechaza rutas fuera del proyecto', async () => {
  const { isSafeRel } = await import('../sync-project.mjs');
  const dir = viteProject();
  const outside = mkdtempSync(join(tmpdir(), 'victim-'));
  try {
    assert.equal(isSafeRel(dir, '.github/dependabot.yml'), true);
    for (const bad of ['../x', String.raw`..\x`, 'a/../../x', String.raw`C:\Windows\x`, '/etc/x', String.raw`\\srv\share\x`, '']) assert.equal(isSafeRel(dir, bad), false, bad);

    apply(plan(dir, { profile: 'vite-supabase' }));
    const victim = join(outside, 'importante.txt');
    writeFileSync(victim, 'no borrar');
    const mf = join(dir, '.claude', 'harness.manifest.json');
    const m = JSON.parse(readFileSync(mf, 'utf8'));
    const { createHash } = await import('node:crypto');
    m.managedFiles[relative(dir, victim)] = createHash('sha256').update('no borrar').digest('hex');
    writeFileSync(mf, JSON.stringify(m));
    const pl = plan(dir, {});
    assert.ok(pl.conflicts.some((c) => /no permitida/.test(c.reason)));
    assert.throws(() => apply(pl), /Conflictos/);
    assert.equal(readFileSync(victim, 'utf8'), 'no borrar');

    const ts = listBackups(dir).at(-1);
    const bj = join(dir, '.claude', '.harness-backup', ts, 'backup.json');
    const meta = JSON.parse(readFileSync(bj, 'utf8'));
    meta.files[relative(dir, victim)] = false;
    writeFileSync(bj, JSON.stringify(meta));
    assert.throws(() => rollback(dir, ts), /fuera del proyecto/);
    assert.equal(readFileSync(victim, 'utf8'), 'no borrar');
  } finally { cleanup(dir); cleanup(outside); }
});

test('ruta de proyecto inexistente: error claro (no "Falta --profile")', () => {
  assert.throws(() => plan(join(tmpdir(), 'harness-no-existe-' + Date.now())), /No existe el proyecto/);
});
