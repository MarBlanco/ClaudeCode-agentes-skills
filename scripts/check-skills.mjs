#!/usr/bin/env node
// Valida las Skills del harness: frontmatter, nombres únicos y que toda ruta
// citada en SKILL.md exista. Uso: node scripts/check-skills.mjs [raíz...]
// Sin argumentos revisa plugins/*/skills y .claude/skills del repo.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const roots = process.argv.slice(2).length
  ? process.argv.slice(2).map((r) => resolve(r))
  : [
      ...readdirSync(join(repo, 'plugins')).map((p) => join(repo, 'plugins', p, 'skills')),
      join(repo, '.claude', 'skills'),
    ].filter((p) => existsSync(p));

const errors = [];
const names = new Map();
let count = 0;

// Rutas relativas a archivos de apoyo. Se ignoran URLs, rutas absolutas y
// rutas que empiezan por "." (salidas en tiempo de ejecución, p. ej. .playwright-cli/).
// Admite el prefijo "../<skill>/" para referencias a otra skill del mismo plugin.
const PATH_RE = /(?<![\w./-])((?:\.\.\/[\w-]+\/)?(?:rules|references|scripts|agents|assets|examples|eval-viewer|templates)\/[\w./-]+\.[a-z]{1,5})\b/g;
const LINK_RE = /\]\(([^)\s#]+)(?:#[^)]*)?\)/g;
// Listas de reglas estilo Vercel: "- `id` - descripción" → rules/<id>.md
const RULE_RE = /^- `([a-z0-9]+(?:-[a-z0-9]+)+)` - /gm;

// Skills cuya prosa cita rutas de ejemplo que no forman parte de la skill
// (enseñan a estructurar otras skills). En ellas solo se validan los enlaces.
const ILLUSTRATIVE_PATHS = new Set(['skill-development']);

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fields = {};
  let last = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) {
      last = kv[1];
      fields[last] = kv[2].replace(/^[>|][-+]?$/, '');
    } else if (last && /^\s+\S/.test(line)) {
      // Continuación de un valor multilínea (bloque o escalar plegado)
      fields[last] = `${fields[last]} ${line.trim()}`.trim();
    }
  }
  return fields;
}

for (const root of roots) {
  for (const entry of readdirSync(root)) {
    const dir = join(root, entry);
    const file = join(dir, 'SKILL.md');
    if (!statSync(dir).isDirectory()) continue;
    if (!existsSync(file)) {
      errors.push(`${dir}: falta SKILL.md`);
      continue;
    }
    count++;
    const text = readFileSync(file, 'utf8');
    const fm = frontmatter(text);
    if (!fm) {
      errors.push(`${file}: sin frontmatter YAML`);
      continue;
    }
    if (!fm.name) errors.push(`${file}: frontmatter sin "name"`);
    if (!fm.description) errors.push(`${file}: frontmatter sin "description"`);
    if (fm.name) {
      if (names.has(fm.name)) errors.push(`${file}: nombre duplicado "${fm.name}" (también en ${names.get(fm.name)})`);
      else names.set(fm.name, file);
    }

    const refs = new Set();
    if (!ILLUSTRATIVE_PATHS.has(fm.name)) for (const m of text.matchAll(PATH_RE)) refs.add(m[1]);
    for (const m of text.matchAll(LINK_RE)) {
      const target = m[1];
      if (/^[a-z]+:/i.test(target) || target.startsWith('/') || target.startsWith('.')) continue;
      if (/\.[a-z]{1,5}$/i.test(target) || target.endsWith('/')) refs.add(target);
    }
    if (existsSync(join(dir, 'rules'))) {
      for (const m of text.matchAll(RULE_RE)) refs.add(`rules/${m[1]}.md`);
    }
    for (const ref of refs) {
      if (!existsSync(join(dir, ref))) errors.push(`${file}: referencia inexistente "${ref}"`);
    }
  }
}

if (errors.length) {
  console.error(`FAIL: ${errors.length} problema(s) en ${count} skill(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`OK: ${count} skill(s), nombres únicos, todas las referencias existen`);
