#!/usr/bin/env node
// Auditoría de memoria persistente (solo lectura). Uso: node scripts/memory-lint.mjs [directorio-de-memoria]
// Sin argumento audita ~/.claude/projects/<proyecto-actual>/memory. Sale con 1 si hay errores.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_INDEX_LINES = 200;
const RELATIVE_DATES = /\b(ayer|hoy|ma[ñn]ana|la semana (pasada|pr[oó]xima)|el mes (pasado|que viene)|reci[eé]n|yesterday|today|tomorrow|last (week|month)|next (week|month)|recently)\b/i;
const SECRETS = /(sk-[\w-]{16,}|ghp_\w{16,}|AKIA[0-9A-Z]{12,}|eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]*|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(password|passwd|secret|api[_-]?key|token)\b\s*[:=]\s*['"]?[\w/+=.-]{8,})/i;

export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\s*)([\w.-]+):\s*(.*)$/);
    if (kv) fm[kv[1] ? `_${kv[2]}` : kv[2]] = kv[3].trim();
  }
  return { fm, body: m[2] };
}

export function lintDir(dir) {
  const findings = [];
  const add = (file, level, msg) => findings.push({ file, level, msg });
  if (!existsSync(dir)) return [{ file: dir, level: 'error', msg: 'directorio de memoria inexistente' }];
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const topics = files.filter((f) => f !== 'MEMORY.md');
  const names = new Map();

  const indexPath = join(dir, 'MEMORY.md');
  let index = '';
  if (existsSync(indexPath)) {
    index = readFileSync(indexPath, 'utf8');
    const lines = index.split(/\r?\n/).length;
    if (lines > MAX_INDEX_LINES) add('MEMORY.md', 'error', `índice con ${lines} líneas (máximo ${MAX_INDEX_LINES}: el resto no se carga)`);
    for (const m of index.matchAll(/\]\(([^)]+\.md)\)/g)) {
      if (!existsSync(join(dir, m[1]))) add('MEMORY.md', 'error', `enlace roto: ${m[1]}`);
    }
  } else if (topics.length) {
    add('MEMORY.md', 'error', 'hay memorias pero falta el índice MEMORY.md');
  }

  for (const f of topics) {
    const text = readFileSync(join(dir, f), 'utf8');
    const parsed = parseFrontmatter(text);
    if (!parsed) {
      add(f, 'error', 'sin frontmatter');
      continue;
    }
    const { fm, body } = parsed;
    for (const k of ['name', 'description']) if (!fm[k]) add(f, 'error', `falta ${k}`);
    if (!fm._type && !fm.type) add(f, 'warn', 'falta metadata.type (user|feedback|project|reference)');
    if (fm.name) {
      if (names.has(fm.name)) add(f, 'error', `name duplicado con ${names.get(fm.name)}`);
      names.set(fm.name, f);
    }
    if (index && !index.includes(`(${f})`)) add(f, 'warn', 'no figura en MEMORY.md (no se cargará al iniciar)');
    if (RELATIVE_DATES.test(body) || RELATIVE_DATES.test(fm.description ?? '')) add(f, 'warn', 'fecha relativa: usar fecha absoluta');
    if (SECRETS.test(text)) add(f, 'error', 'posible secreto o credencial');
    if (body.trim().length < 20) add(f, 'warn', 'cuerpo casi vacío');
    for (const m of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
      if (!files.some((x) => x === `${m[1]}.md`) && ![...names.keys()].includes(m[1])) add(f, 'info', `enlace [[${m[1]}]] sin memoria destino (pendiente de escribir)`);
    }
  }
  // Descripciones casi idénticas: candidatas a fusionar.
  const descs = topics.map((f) => [f, (parseFrontmatter(readFileSync(join(dir, f), 'utf8'))?.fm.description ?? '').toLowerCase()]).filter(([, d]) => d);
  for (let i = 0; i < descs.length; i++) {
    for (let j = i + 1; j < descs.length; j++) if (descs[i][1] === descs[j][1]) add(descs[j][0], 'warn', `descripción idéntica a ${descs[i][0]}: ¿duplicada?`);
  }
  return findings;
}

function defaultDir() {
  const slug = resolve(process.cwd()).replace(/[:\\/ ]/g, '-').replace(/[^\w-]/g, '-');
  return join(homedir(), '.claude', 'projects', slug, 'memory');
}

if (process.argv[1] && basename(process.argv[1]) === 'memory-lint.mjs' && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const dir = resolve(process.argv[2] ?? defaultDir());
  const findings = lintDir(dir);
  for (const f of findings) console.log(`${f.level.toUpperCase().padEnd(5)} ${f.file}: ${f.msg}`);
  console.log(`${dir}\n${findings.filter((f) => f.level === 'error').length} errores, ${findings.filter((f) => f.level === 'warn').length} avisos`);
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0);
}
