#!/usr/bin/env node
// Verifica que lo que el repositorio AFIRMA coincide con lo que CONTIENE (solo lectura):
//  - versiones: marketplace ↔ plugin.json ↔ harness.lock.json ↔ CHANGELOG
//  - hooks: todo script referenciado en hooks.json existe
//  - agentes: frontmatter completo y permisos coherentes con su rol (solo lectura = sin Edit/Write)
//  - privacidad: ninguna ruta personal ni de máquina en archivos de texto versionados
//  - licencia: LICENSE y NOTICE presentes
// Uso: node scripts/check-consistency.mjs [raíz]   (exit 1 si hay problemas)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Agentes de solo lectura por contrato documentado: no pueden declarar herramientas de escritura.
const READ_ONLY = { 'code-reviewer': ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'], 'qa-verifier': ['Edit', 'MultiEdit', 'NotebookEdit'], 'market-researcher': ['Edit', 'Write', 'Bash'], 'qa-explorer': ['Edit', 'MultiEdit', 'NotebookEdit'] };
// Rutas que no deben aparecer en archivos versionados (usuario, unidades fijas de una máquina).
const PRIVATE = /Muawallace|MUAWAL~1|[A-Za-z]:[\\/]+Users[\\/]+(?!x\b|proj\b|u\b|test)[A-Za-z]|\bF:[\\/]+Programacion|\/home\/muawallace/i;
const TEXT_EXT = /\.(md|mjs|js|json|ps1|ya?ml|ts|txt|html|css)$/i;

const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));

function trackedFiles(root) {
  try {
    return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean);
  } catch {
    const out = [];
    const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => {
      if (['.git', 'node_modules', '.harness'].includes(e.name)) return;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(relative(root, p).replace(/\\/g, '/'));
    });
    walk(root);
    return out;
  }
}

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

export function checkRepo(root) {
  const problems = [];
  const bad = (m) => problems.push(m);

  for (const f of ['LICENSE', 'NOTICE']) if (!existsSync(join(root, f))) bad(`falta ${f}`);

  const marketplace = readJson(join(root, '.claude-plugin', 'marketplace.json'));
  const lock = readJson(join(root, 'harness.lock.json'));
  const changelog = existsSync(join(root, 'CHANGELOG.md')) ? readFileSync(join(root, 'CHANGELOG.md'), 'utf8') : '';

  for (const p of marketplace.plugins) {
    const dir = join(root, p.source);
    const pj = join(dir, '.claude-plugin', 'plugin.json');
    if (!existsSync(pj)) {
      bad(`${p.name}: no existe ${p.source}/.claude-plugin/plugin.json`);
      continue;
    }
    const manifest = readJson(pj);
    if (manifest.name !== p.name) bad(`${p.name}: plugin.json declara el nombre "${manifest.name}"`);
    const entry = lock.components.find((c) => c.id === p.name && c.type === 'plugin');
    if (!entry) bad(`${p.name}: falta en harness.lock.json`);
    else if (entry.version !== manifest.version) bad(`${p.name}: lock ${entry.version} ≠ plugin.json ${manifest.version}`);
    if (!changelog.replace(/`/g, '').includes(`${p.name} ${manifest.version}`)) {
      // El changelog agrupa plugins en un mismo encabezado ("harness-core 0.12.1 · harness-web 0.12.6"); basta que aparezca.
      bad(`${p.name} ${manifest.version}: sin entrada en CHANGELOG.md`);
    }

    const hooksFile = join(dir, 'hooks', 'hooks.json');
    if (existsSync(hooksFile)) {
      const hooks = readJson(hooksFile).hooks ?? {};
      for (const groups of Object.values(hooks)) {
        for (const g of groups) {
          for (const h of g.hooks ?? []) {
            const m = String(h.command ?? '').match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"\s]+)/);
            if (m && !existsSync(join(dir, m[1]))) bad(`${p.name}: el hook referencia ${m[1]}, que no existe`);
          }
        }
      }
    }

    const agentsDir = join(dir, 'agents');
    if (existsSync(agentsDir)) {
      for (const file of readdirSync(agentsDir).filter((x) => x.endsWith('.md'))) {
        const text = readFileSync(join(agentsDir, file), 'utf8');
        const fm = frontmatter(text);
        const id = `${p.name}/agents/${file}`;
        if (!fm) { bad(`${id}: sin frontmatter`); continue; }
        for (const k of ['name', 'description', 'model', 'tools']) if (!fm[k]) bad(`${id}: falta ${k}`);
        if ((text.match(/^model:/gm) || []).length !== 1) bad(`${id}: debe haber exactamente un "model:" (¿frontmatter duplicado?)`);
        if ((text.match(/^---\s*$/gm) || []).length < 2 || /^name:/gm.test(text.split(/^---\s*$/m).slice(2).join('\n'))) bad(`${id}: frontmatter duplicado o mal cerrado en el cuerpo`);
        const forbidden = READ_ONLY[fm.name];
        if (forbidden) {
          const tools = (fm.tools ?? '').split(',').map((t) => t.trim());
          const hit = forbidden.filter((t) => tools.includes(t));
          if (hit.length) bad(`${id}: agente "solo lectura/limitado" declara ${hit.join(', ')}`);
        }
      }
    }
  }

  for (const rel of trackedFiles(root)) {
    if (!TEXT_EXT.test(rel) || rel.startsWith('examples/') && /\.png$/i.test(rel)) continue;
    if (rel === 'scripts/check-consistency.mjs' || rel === 'scripts/tests/check-consistency.test.mjs') continue;
    const abs = join(root, rel);
    if (!existsSync(abs) || statSync(abs).size > 2_000_000) continue;
    const hit = readFileSync(abs, 'utf8').split('\n').findIndex((l) => PRIVATE.test(l));
    if (hit >= 0) bad(`${rel}:${hit + 1}: ruta personal o de máquina en un archivo versionado`);
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
  const problems = checkRepo(root);
  if (problems.length) {
    console.error(`FAIL: ${problems.length} inconsistencia(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    process.exit(1);
  }
  console.log('OK: versiones, hooks, agentes, privacidad y licencia coherentes');
}
