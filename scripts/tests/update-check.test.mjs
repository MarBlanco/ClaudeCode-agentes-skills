// Tests de harness-update-check (sin red: fetchers simulados).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkComponent, compareVersions, docVersions, isMajorJump, projectDocDrift, runCheck, toMarkdown } from '../harness-update-check.mjs';

const fetchers = (over = {}) => ({
  pathChangedSince: () => ({ changed: true, latest: 'b'.repeat(40) }),
  latestRelease: () => 'v9.0.0',
  repoMeta: () => ({ license: 'MIT', archived: false }),
  npmVersion: () => '1.0.0',
  installedPlugins: () => ({}),
  marketplacePluginVersion: () => null,
  ...over,
});

test('versiones: comparación y saltos mayores', () => {
  assert.equal(compareVersions('3.1.0', '4.0.1'), -1);
  assert.equal(compareVersions('v2.7.0', '2.7.0'), 0);
  assert.equal(compareVersions('16.4.2', '16.2.12'), 1);
  assert.equal(compareVersions('abc', '1.0.0'), null);
  assert.equal(isMajorJump('3.1.0', '4.0.1'), true);
  assert.equal(isMajorJump('4.0.0', '4.0.1'), false);
});

test('plugin: detecta versión nueva en el marketplace y deriva instalado/lock', () => {
  const c = { id: 'caveman', type: 'plugin', version: '3.1.0', license: 'Apache-2.0', source: { kind: 'claude-plugin', plugin: 'caveman@caveman' } };
  const r = checkComponent(c, fetchers({ marketplacePluginVersion: () => '4.0.1', installedPlugins: () => ({ 'caveman@caveman': [{ version: '3.1.0' }] }) }), { offline: true });
  assert.equal(r.status, 'major');
  assert.match(r.notes.join(' '), /4\.0\.1/);
  const drift = checkComponent({ ...c, version: '4.0.1' }, fetchers({ installedPlugins: () => ({ 'caveman@caveman': [{ version: '3.1.0' }] }) }), { offline: true });
  assert.equal(drift.status, 'alert');
});

test('skill vendorizada: upstream cambió en su ruta', () => {
  const c = { id: 'skill:x', type: 'vendored-skill', license: 'MIT', source: { kind: 'github-commit', repo: 'o/r', path: 'skills/x', ref: 'a'.repeat(40) } };
  assert.equal(checkComponent(c, fetchers()).status, 'update');
  assert.equal(checkComponent(c, fetchers({ pathChangedSince: () => ({ changed: false, latest: 'c'.repeat(40) }) })).status, 'ok');
  assert.equal(checkComponent(c, fetchers({ pathChangedSince: () => null })).status, 'unknown');
});

test('alertas: repo archivado y cambio de licencia', () => {
  const c = { id: 'cli:x', type: 'cli', version: '1.0.0', license: 'MIT', source: { kind: 'github-release', repo: 'o/r', tagPrefix: 'v' } };
  assert.equal(checkComponent(c, fetchers({ repoMeta: () => ({ license: 'AGPL-3.0', archived: false }), latestRelease: () => 'v1.0.0' })).status, 'alert');
  assert.equal(checkComponent(c, fetchers({ repoMeta: () => ({ license: 'MIT', archived: true }), latestRelease: () => 'v1.0.0' })).status, 'alert');
  assert.equal(checkComponent(c, fetchers({ latestRelease: () => 'v1.0.0' })).status, 'ok');
  assert.equal(checkComponent(c, fetchers()).status, 'major');
});

test('npm: con tope de major y sin fijar', () => {
  const ts = { id: 'cli:typescript', type: 'cli', version: '6.0.3', license: 'Apache-2.0', source: { kind: 'npm', package: 'typescript', majorCap: 6 } };
  let asked;
  checkComponent(ts, fetchers({ npmVersion: (p, cap) => { asked = cap; return '6.0.3'; } }));
  assert.equal(asked, 6);
  const latest = checkComponent({ ...ts, version: 'latest', source: { kind: 'npm', package: 'x' } }, fetchers({ npmVersion: () => '2.0.0' }));
  assert.equal(latest.status, 'ok');
  assert.match(latest.notes[0], /sin fijar/);
});

test('plugin fijado por sha: compara contra el commit instalado', () => {
  const c = { id: 'mercadopago', type: 'plugin', version: '4.3.2', source: { kind: 'claude-plugin', plugin: 'mp@o' } };
  const inst = () => ({ 'mp@o': [{ version: '4.3.2', gitCommitSha: '755d33740af23351' }] });
  assert.equal(checkComponent(c, fetchers({ installedPlugins: inst, marketplacePluginVersion: () => '755d33740af2' }), { offline: true }).status, 'ok');
  assert.equal(checkComponent(c, fetchers({ installedPlugins: inst, marketplacePluginVersion: () => '999aaa000bbb' }), { offline: true }).status, 'update');
});

test('offline no consulta la red', () => {
  const c = { id: 'cli:x', type: 'cli', version: '1.0.0', license: 'MIT', source: { kind: 'github-release', repo: 'o/r' } };
  const boom = () => { throw new Error('red'); };
  const r = checkComponent(c, fetchers({ latestRelease: boom, repoMeta: boom }), { offline: true });
  assert.match(r.notes[0], /offline/);
});

test('deriva de docs: detecta Next 16.2.12 vs 16.4.2 y respeta precisión de la doc', () => {
  assert.deepEqual(docVersions('Stack: Next.js 16.2.12 y Payload 3.87.1, React 19. Antes: Next 15; luego Next.js 16.2.12').map((d) => `${d.label} ${d.version}`), ['Next 16.2.12', 'Next 15', 'Payload 3.87.1', 'React 19']);
  const dir = mkdtempSync(join(tmpdir(), 'drift-'));
  try {
    mkdirSync(join(dir, 'apps', 'web'), { recursive: true });
    writeFileSync(join(dir, 'CLAUDE.md'), 'Next 16.2.12 · Payload 3.92.0 · React 19 · Django 4.2\n');
    writeFileSync(join(dir, 'apps', 'web', 'package.json'), JSON.stringify({ dependencies: { next: '16.4.2', payload: '^3.92.0', react: '19.2.0' } }));
    writeFileSync(join(dir, 'requirements.txt'), 'Django==5.1.3\n');
    const drift = projectDocDrift(dir);
    assert.deepEqual(drift.map((d) => d.package).sort(), ['Django', 'Next']);
    const report = runCheck({ components: [], projects: [{ name: 'P', path: dir }] }, fetchers(), { repo: '/' });
    assert.match(toMarkdown(report), /CLAUDE\.md dice Next 16\.2\.12, el proyecto declara 16\.4\.2/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
