import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRepo } from '../check-consistency.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const put = (root, rel, text) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};
const agent = (name, tools = 'Read, Grep') => `---\nname: ${name}\ndescription: x\nmodel: sonnet\ntools: ${tools}\n---\n\ncuerpo\n`;

function fixture({ lockVersion = '1.0.0', agentText = agent('code-reviewer'), extra = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'cc-'));
  put(root, 'LICENSE', 'Apache');
  put(root, 'NOTICE', 'n');
  put(root, 'CHANGELOG.md', '# Changelog\n\n## demo 1.0.0 — fecha\n');
  put(root, '.claude-plugin/marketplace.json', JSON.stringify({ plugins: [{ name: 'demo', source: './plugins/demo' }] }));
  put(root, 'plugins/demo/.claude-plugin/plugin.json', JSON.stringify({ name: 'demo', version: '1.0.0' }));
  put(root, 'harness.lock.json', JSON.stringify({ components: [{ id: 'demo', type: 'plugin', version: lockVersion }] }));
  put(root, 'plugins/demo/agents/a.md', agentText);
  put(root, 'plugins/demo/hooks/hooks.json', JSON.stringify({ hooks: { Stop: [{ hooks: [{ command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/x.mjs"' }] }] } }));
  put(root, 'plugins/demo/hooks/x.mjs', '// ok');
  for (const [k, v] of Object.entries(extra)) put(root, k, v);
  return root;
}
const run = (opts) => {
  const root = fixture(opts);
  try {
    return checkRepo(root).join('\n');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test('repositorio coherente: sin problemas', () => {
  assert.equal(run(), '');
});

test('el repositorio real pasa todas las comprobaciones', () => {
  assert.deepEqual(checkRepo(REPO), []);
});

test('detecta versión del lock distinta de plugin.json', () => {
  assert.match(run({ lockVersion: '0.9.0' }), /lock 0\.9\.0 ≠ plugin\.json 1\.0\.0/);
});

test('detecta hook que apunta a un script inexistente', () => {
  const root = fixture();
  put(root, 'plugins/demo/hooks/hooks.json', JSON.stringify({ hooks: { Stop: [{ hooks: [{ command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/falta.mjs"' }] }] } }));
  assert.match(checkRepo(root).join('\n'), /hooks\/falta\.mjs, que no existe/);
  rmSync(root, { recursive: true, force: true });
});

test('detecta agente de solo lectura con herramientas de escritura', () => {
  assert.match(run({ agentText: agent('code-reviewer', 'Read, Edit, Write') }), /declara Edit, Write/);
});

test('detecta agente sin tools y frontmatter duplicado incrustado en el cuerpo', () => {
  assert.match(run({ agentText: '---\nname: x\ndescription: d\nmodel: sonnet\n---\n\ncuerpo' }), /falta tools/);
  const dup = `${agent('qa-explorer', 'Read')}\nregla ---\n${agent('qa-explorer', 'Read')}`;
  assert.match(run({ agentText: dup }), /exactamente un "model:"/);
});

test('detecta rutas personales y de máquina en archivos de texto', () => {
  const win = String.raw`F:\Programacion\algo`;
  assert.match(run({ extra: { 'docs/x.md': `ruta ${win}\n` } }), /docs\/x\.md:1: ruta personal/);
  assert.match(run({ extra: { 'a.json': '{"p":"/home/muawallace/x"}' } }), /a\.json:1/);
  assert.equal(run({ extra: { 'docs/ok.md': String.raw`ejemplo C:\x\.env y ~/.claude` } }), '');
});

test('detecta falta de LICENSE y de entrada en CHANGELOG', () => {
  const root = fixture();
  rmSync(join(root, 'LICENSE'));
  put(root, 'CHANGELOG.md', '# Changelog\n');
  const out = checkRepo(root).join('\n');
  assert.match(out, /falta LICENSE/);
  assert.match(out, /sin entrada en CHANGELOG/);
  rmSync(root, { recursive: true, force: true });
});
