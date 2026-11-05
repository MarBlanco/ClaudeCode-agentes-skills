import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lintDir } from '../memory-lint.mjs';

const mem = (name, desc, type, body) => `---\nname: ${name}\ndescription: ${desc}\nmetadata:\n  type: ${type}\n---\n\n${body}\n`;
const dirWith = (files) => {
  const d = mkdtempSync(join(tmpdir(), 'ml-'));
  for (const [f, c] of Object.entries(files)) writeFileSync(join(d, f), c);
  return d;
};
const msgs = (fs) => fs.map((f) => `${f.level}:${f.file}:${f.msg}`).join('\n');

test('memoria sana: sin hallazgos', () => {
  const d = dirWith({
    'MEMORY.md': '- [Pref](pref.md) — prefiere respuestas cortas\n',
    'pref.md': mem('pref', 'prefiere respuestas cortas', 'user', 'Respuestas cortas desde 2026-11-05. Why: lee en terminal.'),
  });
  assert.deepEqual(lintDir(d), []);
});

test('detecta enlace roto, huérfano, fecha relativa, secreto, duplicado y falta de frontmatter', () => {
  const d = dirWith({
    'MEMORY.md': '- [A](a.md) — a\n- [Roto](no-existe.md) — x\n',
    'a.md': mem('a', 'tema uno', 'project', 'Se decidió ayer usar la clave sk-abcdefghijklmnop1234 en el proyecto'),
    'b.md': mem('a', 'tema uno', 'project', 'cuerpo suficientemente largo para no ser vacío'),
    'c.md': 'sin frontmatter',
  });
  const out = msgs(lintDir(d));
  assert.match(out, /enlace roto: no-existe\.md/);
  assert.match(out, /a\.md:fecha relativa/);
  assert.match(out, /error:a\.md:posible secreto/);
  assert.match(out, /name duplicado/);
  assert.match(out, /b\.md:no figura en MEMORY\.md/);
  assert.match(out, /c\.md:sin frontmatter/);
});

test('índice sobre el máximo y directorio inexistente', () => {
  const d = dirWith({ 'MEMORY.md': Array.from({ length: 205 }, (_, i) => `- línea ${i}`).join('\n') });
  assert.match(msgs(lintDir(d)), /índice con 205 líneas/);
  assert.match(msgs(lintDir(join(d, 'nada'))), /inexistente/);
});
