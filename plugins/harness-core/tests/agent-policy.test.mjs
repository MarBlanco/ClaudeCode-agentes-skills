// Tests de la política por agente (qa-explorer). Ejecutar: node --test plugins/harness-core/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// La configuración de navegador se genera en un directorio aislado del test (nunca en ~/.claude real).
process.env.HARNESS_QA_BROWSER_DIR = mkdtempSync(join(tmpdir(), 'harness-qa-browser-'));
// HOME aislado: sin ~/.playwright/cli.config.json real.
const fakeHome = mkdtempSync(join(tmpdir(), 'harness-home-'));
process.env.HOME = fakeHome;
process.env.USERPROFILE = fakeHome;
const { evaluate } = await import('../hooks/guard.mjs');
const { browserConfig, ensureBrowserConfig } = await import('../hooks/agent-policy.mjs');

const root = mkdtempSync(join(tmpdir(), 'harness-policy-'));
const run = join(root, '.harness', 'qa', '20261101-x');
mkdirSync(join(run, 'logs'), { recursive: true });

const AGENT = 'harness-web:qa-explorer';
const decide = (tool_name, tool_input, { cwd = run, agent_type = AGENT } = {}) => evaluate({ tool_name, tool_input, cwd, agent_type })?.[0] ?? 'allow';
const bash = (command, opts) => decide('Bash', { command }, opts);
const reason = (command, { cwd = run } = {}) => evaluate({ tool_name: 'Bash', tool_input: { command }, cwd, agent_type: AGENT })?.[1] ?? '';
const cfg = () => ensureBrowserConfig().replace(/\\/g, '/');
// Sesiones usadas por los tests: se abren (y registran) con la configuración del harness.
for (const s of ['qa-x', 'q', 'e2e']) evaluate({ tool_name: 'Bash', tool_input: { command: `playwright-cli -s=${s} open --config='${cfg()}'` }, cwd: run, agent_type: AGENT });
const msys = (p) => `/${p[0].toLowerCase()}${p.slice(2).replace(/\\/g, '/')}`;

test('permite el flujo de navegación desde la corrida', () => {
  for (const cmd of [
    `playwright-cli -s=qa-x open --config='${cfg()}' http://127.0.0.1:4317/`,
    `playwright-cli -s=qa-x open --config='${cfg()}' --headed`,
    'playwright-cli -s=qa-x goto http://localhost:3000/cart',
    "playwright-cli -s=qa-x goto 'http://localhost:3000/p?id=1&x=2'",
    'playwright-cli -s=qa-x goto about:blank',
    'playwright-cli -s=qa-x snapshot',
    'playwright-cli -s=qa-x screenshot --filename=screenshots/01-home.png --full-page',
    'playwright-cli -s=qa-x console error > logs/console-home.txt',
    'playwright-cli -s=qa-x requests --static > logs/requests-home.txt 2>&1',
    "playwright-cli -s=qa-x eval 'document.querySelectorAll(\"a\").length > 0 && true || false'",
    "playwright-cli -s=qa-x fill e5 'a;b|c && d $x `y`' --submit",
    'playwright-cli -s=qa-x click e3 && playwright-cli -s=qa-x snapshot > logs/a.txt',
    'playwright-cli -s=qa-x resize 375 812',
    'playwright-cli -s=qa-x close',
    "playwright-cli -s=qa-x --raw eval 'document.title' > logs/t.txt",
    'playwright-cli --json -s=qa-x snapshot',
    'playwright-cli -s=qa-x fill e5 -2',
    'playwright-cli -s=qa-x mousewheel 0 800',
    'playwright-cli -s=qa-x mousewheel 0 -800',
  ]) assert.equal(bash(cmd), 'allow', cmd);
  for (const cmd of ['playwright-cli -s=qa-x --raw -s=b install', 'playwright-cli -s=qa-x fill e5 -x', 'playwright-cli --raw']) assert.equal(bash(cmd), 'deny', cmd);
  assert.equal(bash('cd ./.harness/qa/20261101-x && playwright-cli -s=q snapshot > logs/a.txt', { cwd: root }), 'allow');
});

test('open exige la configuración del harness; el mensaje indica la ruta exacta', () => {
  assert.equal(bash('playwright-cli -s=q open http://127.0.0.1:4317/'), 'deny');
  assert.match(reason('playwright-cli -s=q open'), /--config='[^']+qa-browser-[0-9a-f]{12}\.json'/);
  assert.equal(bash("playwright-cli -s=q open --config='logs/mi-config.json'"), 'deny');
  assert.equal(bash('playwright-cli -s=q open --config=.playwright/cli.config.json'), 'deny');
  assert.equal(bash(`playwright-cli -s=q goto --config='${cfg()}' http://localhost:1`), 'deny');
});

test('configuración de navegador: proxy sumidero, orígenes locales, service workers bloqueados, sin acceso libre a archivos', () => {
  const c = JSON.parse(readFileSync(ensureBrowserConfig(), 'utf8'));
  assert.equal(c.browser.isolated, true);
  assert.equal(c.browser.launchOptions.proxy.server, 'http://127.0.0.1:9');
  assert.equal(c.browser.contextOptions.serviceWorkers, 'block');
  assert.equal(c.allowUnrestrictedFileAccess, false);
  assert.deepEqual(c.network.allowedOrigins, ['http://localhost:*', 'https://localhost:*', 'http://127.0.0.1:*', 'https://127.0.0.1:*']);
  assert.ok(browserConfig(['staging.example.com']).network.allowedOrigins.includes('https://staging.example.com:*'));
});

test('solo cd + playwright-cli: cualquier otro comando se deniega', () => {
  for (const cmd of [
    'ls', 'cat logs/a.txt', 'grep -r x .', 'rg x', 'find .', 'head logs/a.txt', 'echo x > logs/a.txt', 'printf x', 'mkdir -p logs',
    'cp a b', 'mv a b', 'rm -rf logs', 'tee logs/a.txt', 'touch a', 'git status', 'git rev-parse HEAD',
    'npx --no-install playwright test', '"F:/r/node_modules/.bin/playwright" test', 'node -e 1', 'python -c 1',
    'curl http://127.0.0.1:4317/api/pay', 'sed -n 1p a', 'powershell -c x', 'bash -c x', 'cmd /c x',
    'NODE_PATH=/x playwright-cli -s=q snapshot', "'NODE_PATH=/x' playwright-cli -s=q snapshot",
  ]) assert.equal(bash(cmd), 'deny', cmd);
});

test('gramática: separadores, saltos de línea, heredocs, expansiones y controles denegados', () => {
  for (const cmd of [
    'playwright-cli -s=q snapshot ; playwright-cli -s=q snapshot',
    'playwright-cli -s=q snapshot | playwright-cli -s=q snapshot',
    'playwright-cli -s=q snapshot || playwright-cli -s=q close',
    'playwright-cli -s=q snapshot &',
    'playwright-cli -s=q snapshot\nnode -e 1',
    'playwright-cli -s=q snapshot\r\nnode -e 1',
    "cat > a.md <<'EOF'\nx\nEOF",
    'playwright-cli -s=q eval $(whoami)',
    'playwright-cli -s=q eval `whoami`',
    'playwright-cli -s=q eval "$(whoami)"',
    'playwright-cli -s=q eval ${IFS}',
    String.raw`playwright-cli -s=q eval \" ; node -e 1 ; \"`,
    'playwright-cli -s=q fill e1 x#; node -e 1',
    'playwright-cli -s=q snapshot \f#; node -e 1',
    'playwright-cli -s=q snapshot \u00a0#; node -e 1',
    'playwright-cli -s=q snapshot < /etc/hosts',
    'playwright-cli -s=q goto http://localhost:3000/{a,b}',
    'playwright-cli -s=q screenshot --filename=screenshots/*.png',
    'playwright-cli -s=q snapshot > ~/x',
    "playwright-cli -s=q eval 'x",
  ]) assert.equal(bash(cmd), 'deny', JSON.stringify(cmd));
});

test('cd: solo primero, seguido de &&, a una corrida existente', () => {
  for (const [cmd, cwd] of [
    ['cd .harness/qa/20261101-nope && playwright-cli -s=q snapshot', root],
    ['cd .. && playwright-cli -s=q snapshot', run],
    ['cd /tmp && playwright-cli -s=q snapshot', run],
    ['playwright-cli -s=q snapshot && cd ./.harness/qa/20261101-x && playwright-cli -s=q snapshot', root],
    ['cd .harness/qa/20261101-x', root],
    ['cd .harness/qa/otra && playwright-cli -s=q snapshot', root],
  ]) assert.equal(bash(cmd, { cwd }), 'deny', cmd);
  assert.equal(bash('playwright-cli -s=q snapshot', { cwd: root }), 'deny');
  assert.match(reason('playwright-cli -s=q snapshot', { cwd: root }), /cd \.\/\.harness\/qa/);
});

test('redirecciones: solo dentro de la corrida (incluye >& y &>)', () => {
  for (const cmd of [
    'playwright-cli -s=q snapshot > ../../../notes.txt',
    'playwright-cli -s=q snapshot >> /etc/hosts',
    'playwright-cli -s=q snapshot >&../../../o.txt',
    'playwright-cli -s=q snapshot &> ../../x',
    `playwright-cli -s=q snapshot > "${join(tmpdir(), 'otro', '.harness', 'qa', '20261101-r', 'a.txt').replace(/\\/g, '/')}"`,
  ]) assert.equal(bash(cmd), 'deny', cmd);
  for (const cmd of ['playwright-cli -s=q snapshot 2>&1', 'playwright-cli -s=q snapshot >&2', 'playwright-cli -s=q snapshot >&-', 'playwright-cli -s=q snapshot >& logs/a.txt', 'playwright-cli -s=q snapshot > /dev/null']) {
    assert.equal(bash(cmd), 'allow', cmd);
  }
});

test('playwright-cli: subcomandos, flags, rutas y hosts', () => {
  for (const cmd of [
    'playwright-cli install', 'playwright-cli -s=q install-browser chrome', 'playwright-cli -s=q run-code "x"',
    'playwright-cli -s=q state-save a.json', 'playwright-cli -s=q state-load ../../../auth.json',
    'playwright-cli -s=q attach --cdp=http://evil.com:9222', 'playwright-cli -s=q attach --extension=chrome',
    'playwright-cli -s=q pause-at ../../../e2e/x.spec.ts:1', 'playwright-cli -s=q cookie-list', 'playwright-cli -s=q route "**"',
    'playwright-cli -s=q localstorage-list', 'playwright-cli -s=q pdf --filename=a.pdf', 'playwright-cli -s=q video-start a.webm',
    'playwright-cli -s q open', 'playwright-cli --session x run-code "x"',
    `playwright-cli -s=q open --config='${cfg()}' --persistent`,
    `playwright-cli -s=q open --config='${cfg()}' --profile=x`,
    `playwright-cli -s=q open --config='${cfg()}' --browser=chrome`,
    `playwright-cli -s=q open --config='${cfg()}' https://tienda-real.com/`,
    'playwright-cli -s=q goto https://www.google.com',
    'playwright-cli -s=q goto http://localhost@evil.com',
    'playwright-cli -s=q goto http://localhost.evil.com',
    'playwright-cli -s=q goto file:///etc/passwd',
    'playwright-cli -s=q goto http://localhost:3000 https://evil.com',
    'playwright-cli -s=q screenshot --filename=../../../x.png',
    'playwright-cli -s=q screenshot --filename ../../../x.png',
    'playwright-cli -s=q upload /etc/hosts',
  ]) assert.equal(bash(cmd), 'deny', cmd);
});

test('hosts de staging solo con HARNESS_QA_ALLOWED_HOSTS del entorno del usuario', () => {
  process.env.HARNESS_QA_ALLOWED_HOSTS = 'staging.example.com';
  try {
    // La config cambió: una sesión abierta antes ya no sirve; hay que abrirla de nuevo.
    assert.equal(bash('playwright-cli -s=q goto https://staging.example.com/login'), 'deny');
    assert.equal(bash(`playwright-cli -s=stg open --config='${cfg()}'`), 'allow');
    assert.equal(bash('playwright-cli -s=stg goto https://staging.example.com/login'), 'allow');
    assert.equal(bash('playwright-cli -s=stg goto https://www.example.com/'), 'deny');
    const c = JSON.parse(readFileSync(ensureBrowserConfig(), 'utf8'));
    assert.match(c.browser.launchOptions.proxy.bypass, /staging\.example\.com/);
  } finally {
    delete process.env.HARNESS_QA_ALLOWED_HOSTS;
  }
});

test('rutas ancladas a la raíz del proyecto, con enlaces resueltos, MSYS y nombres de corrida', () => {
  assert.equal(decide('Write', { file_path: join(run, 'report.md') }), 'allow');
  assert.equal(decide('Write', { file_path: join(run, 'screenshots', 'a.png') }), 'allow');
  assert.equal(decide('Write', { file_path: join(root, 'src', 'a.ts') }), 'deny');
  assert.equal(decide('Edit', { file_path: join(root, 'CLAUDE.md') }), 'deny');
  assert.equal(decide('Write', { file_path: join(root, '.harness', 'qa', 'node_modules', 'x.js') }), 'deny');
  assert.equal(decide('Write', { file_path: join(root, '.harness', 'qa', 'otra', 'x.md') }), 'deny');
  // Configuración de resolución de módulos: nunca, ni dentro de la corrida
  for (const f of ['node_modules/@playwright/test/index.js', 'regression/node_modules/x.js', 'package.json', 'tsconfig.json', 'regression/tsconfig.base.json', 'jsconfig.json', '.npmrc', 'regression/playwright.config.ts', 'babel.config.js']) {
    assert.equal(decide('Write', { file_path: join(run, f) }), 'deny', f);
  }
  assert.equal(decide('Write', { file_path: join(run, 'regression', 'cart.spec.ts') }), 'allow');
  assert.equal(decide('Write', { file_path: join(tmpdir(), 'otro', '.harness', 'qa', '20261101-r', 'a.md') }), 'deny');
  if (process.platform === 'win32') {
    assert.equal(bash(`playwright-cli -s=q snapshot > ${msys(join(run, 'logs', 'b.txt'))}`), 'allow');
    assert.equal(bash(`playwright-cli -s=q snapshot > ${msys(join(root, 'src', 'b.txt'))}`), 'deny');
  }
  const outside = mkdtempSync(join(tmpdir(), 'harness-outside-'));
  try {
    symlinkSync(outside, join(run, 'link'), 'junction');
  } catch {
    return; // sin permisos para crear enlaces: no se puede probar aquí
  }
  assert.equal(decide('Write', { file_path: join(run, 'link', 'f.txt') }), 'deny');
  assert.equal(bash('playwright-cli -s=q snapshot > link/f.txt'), 'deny');
});

test('no se aplica a otros agentes ni a la sesión principal', () => {
  assert.equal(bash('git add -A', { agent_type: null }), 'allow');
  assert.equal(bash('git add -A', { agent_type: 'general-purpose' }), 'allow');
  assert.equal(bash('git add -A', { agent_type: 'qa-explorer' }), 'deny');
});

test('el guard general sigue aplicando al explorador (secretos)', () => {
  assert.equal(decide('Read', { file_path: join(run, '.env') }), 'deny');
  assert.equal(decide('Grep', { pattern: 'x', path: join(root, '.env') }), 'deny');
});

test('revisión adversarial (fase final): cd a HOME/OLDPWD, CDPATH, sesiones ajenas y config global', () => {
  mkdirSync(join(run, '-P'), { recursive: true });
  for (const cmd of ['cd -P && playwright-cli -s=q snapshot > .bashrc', 'cd -- && playwright-cli -s=q snapshot', 'cd - && playwright-cli -s=q snapshot', 'cd -L && playwright-cli -s=q snapshot']) {
    assert.equal(bash(cmd), 'deny', cmd);
  }
  assert.equal(bash('cd .harness/qa/20261101-x && playwright-cli -s=q snapshot', { cwd: root }), 'deny', 'sin ./ podría resolverse por CDPATH');
  assert.equal(bash(`cd '${run.replaceAll('\\', '/')}' && playwright-cli -s=q snapshot`, { cwd: root }), 'allow', 'ruta absoluta');
  // Sesiones: obligatorias y solo las abiertas con la configuración del harness
  assert.equal(bash('playwright-cli snapshot'), 'deny');
  assert.equal(bash("playwright-cli -s=default eval '() => document.cookie'"), 'deny');
  assert.equal(bash('playwright-cli -s=otra goto http://localhost:3000'), 'deny');
  assert.equal(bash('playwright-cli -s=otra list'), 'allow');
  // Config global de playwright-cli: se fusionaría con la del harness
  mkdirSync(join(fakeHome, '.playwright'), { recursive: true });
  writeFileSync(join(fakeHome, '.playwright', 'cli.config.json'), '{"browser":{"cdpEndpoint":"http://evil:9222"}}');
  try {
    assert.equal(bash(`playwright-cli -s=nueva open --config='${cfg()}'`), 'deny');
  } finally {
    rmSync(join(fakeHome, '.playwright'), { recursive: true, force: true });
  }
});

test('re-revisión: un solo -s=, sin --session ni repetidos (playwright-cli prioriza -s)', () => {
  for (const cmd of ['playwright-cli -s=usuario --session=q eval x', 'playwright-cli --session=q snapshot', 'playwright-cli -s=q -s=q snapshot', 'playwright-cli -s=q snapshot -s=otra', 'playwright-cli -sq snapshot']) {
    assert.equal(bash(cmd), 'deny', cmd);
  }
  assert.equal(bash('playwright-cli -s=q snapshot'), 'allow');
});
