// Tests de los hooks de harness-core. Ejecutar: node --test plugins/harness-core/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, isSecretPath, secretInCommand } from '../hooks/guard.mjs';

const hooks = join(dirname(fileURLToPath(import.meta.url)), '..', 'hooks');

function hook(script, input, ...args) {
  const r = spawnSync(process.execPath, [join(hooks, script), ...args], { input: JSON.stringify(input), encoding: 'utf8' });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch { /* salida de texto (SessionStart) o vacía */ }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json };
}

function tempRepo(branch = 'work') {
  const dir = mkdtempSync(join(tmpdir(), 'harness-test-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 't@t');
  g('config', 'user.name', 't');
  g('config', 'commit.gpgsign', 'false');
  mkdirSync(join(dir, 'supabase', 'migrations'), { recursive: true });
  writeFileSync(join(dir, 'supabase', 'migrations', '001_init.sql'), 'create table t();\n');
  writeFileSync(join(dir, 'a.ts'), 'export const a = 1;\n');
  g('add', '.');
  g('commit', '-q', '-m', 'init');
  if (branch !== 'main') g('switch', '-q', '-c', branch);
  return dir;
}

const decide = (tool_name, tool_input, cwd) => evaluate({ tool_name, tool_input, cwd })?.[0] ?? 'allow';

test('secretos: rutas', () => {
  for (const p of ['.env', '.env.local', 'apps/web/.env.production', 'C:\\x\\.env.development.local', 'cert.pem', 'id_ed25519', '/home/u/.claude/.credentials.json']) {
    assert.equal(isSecretPath(p), true, p);
  }
  for (const p of ['.env.example', '.env.sample', 'src/env.ts', 'environment.md', 'id_ed25519.pub', 'README.md', '.envrc.md']) {
    assert.equal(isSecretPath(p), false, p);
  }
});

test('secretos: herramientas de archivo y búsqueda', () => {
  assert.equal(decide('Read', { file_path: 'E:/p/.env' }), 'deny');
  assert.equal(decide('Edit', { file_path: 'E:/p/.env.local' }), 'deny');
  assert.equal(decide('Write', { file_path: 'E:/p/.env' }), 'deny');
  assert.equal(decide('Read', { file_path: 'E:/p/.env.example' }), 'allow');
  assert.equal(decide('Grep', { pattern: 'KEY', path: '.env' }), 'deny');
  assert.equal(decide('Grep', { pattern: 'KEY', glob: '.env*' }), 'deny');
  assert.equal(decide('Glob', { pattern: '**/.env' }), 'deny');
  assert.equal(decide('Grep', { pattern: 'process.env', path: 'src' }), 'allow');
});

test('secretos: comandos de shell', () => {
  for (const c of ['cat .env', 'head -5 apps/web/.env.local', 'grep KEY .env', 'source .env && npm run x', 'cp .env /tmp/x', 'docker run --env-file .env img', 'type C:\\proj\\.env', 'cat < .env', 'less "~/.ssh/id_rsa"']) {
    assert.ok(secretInCommand(c), c);
    assert.equal(decide('Bash', { command: c }), 'deny', c);
  }
  for (const c of ['cat .env.example', 'node -e "console.log(process.env.NODE_ENV)"', 'npm run dev', 'ls -la', 'git add src/env.ts']) {
    assert.equal(secretInCommand(c), null, c);
  }
});

test('lockfiles: edición manual bloqueada, gestor de paquetes permitido', () => {
  assert.equal(decide('Edit', { file_path: 'package-lock.json' }), 'deny');
  assert.equal(decide('Write', { file_path: 'apps/web/pnpm-lock.yaml' }), 'deny');
  assert.equal(decide('Read', { file_path: 'package-lock.json' }), 'allow');
  assert.equal(decide('Bash', { command: 'npm install zod' }), 'allow');
});

test('migraciones: versionadas bloqueadas, nuevas permitidas', () => {
  const dir = tempRepo();
  try {
    assert.equal(decide('Edit', { file_path: join(dir, 'supabase/migrations/001_init.sql') }, dir), 'deny');
    assert.equal(decide('Write', { file_path: join(dir, 'supabase/migrations/002_new.sql') }, dir), 'allow');
    assert.equal(decide('Read', { file_path: join(dir, 'supabase/migrations/001_init.sql') }, dir), 'allow');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('git: commit en main denegado, en rama de trabajo permitido', () => {
  const onMain = tempRepo('main');
  const onWork = tempRepo('work');
  try {
    assert.equal(decide('Bash', { command: 'git commit -m x' }, onMain), 'deny');
    assert.equal(decide('Bash', { command: 'git add . && git commit -m x' }, onMain), 'deny');
    assert.equal(decide('Bash', { command: 'git commit -m x' }, onWork), 'allow');
  } finally {
    rmSync(onMain, { recursive: true, force: true });
    rmSync(onWork, { recursive: true, force: true });
  }
});

test('git: force push denegado, push y destructivos piden confirmación', () => {
  for (const c of ['git push --force', 'git push -f origin x', 'git push --force-with-lease', 'git push origin +main']) {
    assert.equal(decide('Bash', { command: c }), 'deny', c);
  }
  for (const c of ['git push', 'git push -u origin feat/x', 'git reset --hard HEAD~1', 'git clean -fd', 'git checkout -- .', 'git branch -D x', 'git rebase main']) {
    assert.equal(decide('Bash', { command: c }), 'ask', c);
  }
  for (const c of ['git status', 'git diff', 'git log --oneline', 'git switch -c feat/x', 'git checkout -- src/a.ts']) {
    assert.equal(decide('Bash', { command: c }), 'allow', c);
  }
});

test('producción y datos: piden confirmación', () => {
  for (const c of ['supabase db push', 'supabase db reset', 'vercel --prod', 'vercel deploy --prod', 'vercel env pull', 'docker system prune -a', 'docker compose down -v', 'psql -c "DROP TABLE users"', 'psql -c "truncate orders"', 'npm publish']) {
    assert.equal(decide('Bash', { command: c }), 'ask', c);
  }
  for (const c of ['supabase start', 'supabase db diff', 'vercel', 'vercel ls', 'docker compose up -d', 'docker compose down']) {
    assert.equal(decide('Bash', { command: c }), 'allow', c);
  }
});

test('guard e2e: salida JSON y fail-open ante entrada inválida', () => {
  const r = hook('guard.mjs', { tool_name: 'Read', tool_input: { file_path: '.env' }, cwd: tmpdir() });
  assert.equal(r.status, 0);
  assert.equal(r.json.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(r.json.hookSpecificOutput.permissionDecisionReason, /^\[harness\]/);
  const ok = hook('guard.mjs', { tool_name: 'Read', tool_input: { file_path: 'a.ts' }, cwd: tmpdir() });
  assert.equal(ok.stdout, '');
  const bad = spawnSync(process.execPath, [join(hooks, 'guard.mjs')], { input: 'no-json', encoding: 'utf8' });
  assert.equal(bad.status, 0);
  assert.equal(bad.stdout, '');
  assert.match(bad.stderr, /no bloquea/);
});

test('guard: comando largo se evalúa rápido (sin backtracking)', () => {
  const t = Date.now();
  decide('Bash', { command: `git push ${'a '.repeat(50000)}` });
  decide('Bash', { command: `vercel ${'x'.repeat(100000)}` });
  assert.ok(Date.now() - t < 1000, `tardó ${Date.now() - t}ms`);
});

function withManifest(dir, quality) {
  mkdirSync(join(dir, '.claude'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'harness.manifest.json'), JSON.stringify({ harnessVersion: '0.1.0', profile: 'test', modules: ['web'], quality }));
}

test('session-start: anuncia perfil solo si hay manifiesto', () => {
  const dir = tempRepo();
  try {
    assert.equal(hook('session-start.mjs', { cwd: dir }).stdout, '');
    withManifest(dir, { typecheck: { command: 'tsc' } });
    const out = hook('session-start.mjs', { cwd: dir }).stdout;
    assert.match(out, /perfil test/);
    assert.match(out, /Typecheck en Stop/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('quality stop: bloquea si falla, cachea si pasa, respeta stop_hook_active', () => {
  const dir = tempRepo();
  try {
    withManifest(dir, { typecheck: { command: 'node -e "console.error(\'TS2322 boom\');process.exit(2)"' } });
    // Sin cambios relevantes: no corre
    assert.equal(hook('quality.mjs', { cwd: dir }, 'stop').stdout, '');
    writeFileSync(join(dir, 'a.ts'), 'export const a: number = "x";\n');
    const blocked = hook('quality.mjs', { cwd: dir }, 'stop');
    assert.equal(blocked.json.decision, 'block');
    assert.match(blocked.json.reason, /TS2322 boom/);
    // Segunda pasada en la misma cadena de Stop: no vuelve a bloquear
    assert.equal(hook('quality.mjs', { cwd: dir, stop_hook_active: true }, 'stop').stdout, '');
    // Comando que pasa: no bloquea y deja caché
    withManifest(dir, { typecheck: { command: 'node -e "process.exit(0)"' } });
    assert.equal(hook('quality.mjs', { cwd: dir }, 'stop').stdout, '');
    assert.ok(existsSync(join(dir, '.harness', 'cache', 'typecheck.json')));
    // Con caché y sin cambios, aunque el comando ahora fallaría, no corre
    withManifest(dir, { typecheck: { command: 'node -e "process.exit(1)"' } });
    assert.equal(hook('quality.mjs', { cwd: dir }, 'stop').stdout, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('quality format: ejecuta el formateador del manifiesto sobre el archivo', () => {
  const dir = tempRepo();
  try {
    const marker = join(dir, 'formatted.txt');
    withManifest(dir, { format: [{ extensions: ['.ts'], command: `node -e "require('fs').writeFileSync(process.argv[1].replace(/a\\.ts$/,'formatted.txt'),'ok')"` }] });
    hook('quality.mjs', { cwd: dir, tool_input: { file_path: join(dir, 'a.ts') } }, 'format');
    assert.ok(existsSync(marker), 'el formateador no se ejecutó');
    hook('quality.mjs', { cwd: dir, tool_input: { file_path: join(dir, 'x.md') } }, 'format');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
