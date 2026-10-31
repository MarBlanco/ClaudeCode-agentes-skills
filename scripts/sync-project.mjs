#!/usr/bin/env node
// SyncProject v2 — aplica un perfil del harness a un proyecto consumidor.
//
// Principio: el harness solo toca lo que puede demostrar que escribió
// (registrado en .claude/harness.manifest.json). Todo lo demás es del proyecto.
//
//   node scripts/sync-project.mjs --project <ruta> [--profile <p>] [--modules a,b] [--apply] [--retire-legacy]
//   node scripts/sync-project.mjs --project <ruta> --rollback [<timestamp>]
//   node scripts/sync-project.mjs --project <ruta> --list-backups
//
// Sin --apply es un dry-run: muestra el plan y no escribe nada.
// Archivos gestionados: .claude/settings.json (enabledPlugins, permissions.*),
// .mcp.json (mcpServers), bloque "harness" de .gitignore, .claude/harness.manifest.json.
// Nunca toca: CLAUDE.md, .claude/settings.local.json, skills/agentes propios.
// Overrides del proyecto (suyos, nunca escritos por el harness): .claude/harness.project.json
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILES = join(REPO, 'templates', 'profiles');
const GI_START = '# >>> harness (gestionado por SyncProject; no editar este bloque)';
const GI_END = '# <<< harness';
const GI_LINES = ['.harness/', '.claude/.harness-backup/'];
const PERMISSION_LISTS = ['allow', 'deny', 'ask'];

// ---------- utilidades ----------

export function harnessVersion() {
  return JSON.parse(readFileSync(join(REPO, 'plugins', 'harness-core', '.claude-plugin', 'plugin.json'), 'utf8')).version;
}

function readText(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

// Conserva indentación, fin de línea y salto final del archivo original.
function jsonStyle(text) {
  if (!text) return { indent: 2, eol: '\n', finalNewline: true };
  const m = text.match(/^[ \t]+(?=")/m);
  return {
    indent: m ? (m[0].includes('\t') ? '\t' : m[0].length) : 2,
    eol: text.includes('\r\n') ? '\r\n' : '\n',
    finalNewline: /\r?\n$/.test(text),
  };
}

function formatJson(obj, style) {
  let s = JSON.stringify(obj, null, style.indent);
  if (style.eol === '\r\n') s = s.replace(/\n/g, '\r\n');
  return style.finalNewline ? s + style.eol : s;
}

function writeAtomic(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.harness-tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, file);
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function harnessCapabilities() {
  const skills = new Set();
  const agents = new Set();
  for (const plugin of readdirSync(join(REPO, 'plugins'))) {
    const s = join(REPO, 'plugins', plugin, 'skills');
    const a = join(REPO, 'plugins', plugin, 'agents');
    if (existsSync(s)) for (const d of readdirSync(s)) skills.add(d);
    if (existsSync(a)) for (const f of readdirSync(a)) agents.add(f);
  }
  // Skills del repo que ya no se distribuyen a proyectos (mantenimiento del harness)
  for (const legacy of ['skill-creator', 'skill-development']) skills.add(legacy);
  return { skills, agents };
}

// ---------- perfil ----------

export function loadProfile(name, modules = []) {
  const file = join(PROFILES, `${name}.json`);
  if (!existsSync(file)) throw new Error(`Perfil inexistente: ${name}. Disponibles: ${listProfiles().join(', ')}`);
  const profile = JSON.parse(readFileSync(file, 'utf8'));
  const moduleMap = JSON.parse(readFileSync(join(PROFILES, 'modules.json'), 'utf8'));
  const allModules = [...new Set([...(profile.modules ?? []), ...modules])];
  const enabledPlugins = {};
  for (const m of allModules) {
    if (!moduleMap[m] || m.startsWith('$')) throw new Error(`Módulo inexistente: ${m}`);
    Object.assign(enabledPlugins, moduleMap[m].enabledPlugins);
  }
  return { ...profile, modules: allModules, enabledPlugins };
}

export function listProfiles() {
  return readdirSync(PROFILES).filter((f) => f.endsWith('.json') && f !== 'modules.json').map((f) => f.replace(/\.json$/, ''));
}

function packageJsons(project) {
  const found = [];
  const walk = (dir, depth) => {
    if (depth > 2) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.name === 'package.json') found.push(p);
    }
  };
  walk(project, 0);
  return found;
}

export function detectMatches(project, profile) {
  const d = profile.detect ?? {};
  const problems = [];
  if (d.anyPath && !d.anyPath.some((p) => existsSync(join(project, p)))) problems.push(`no existe ninguna de: ${d.anyPath.join(', ')}`);
  if (d.anyPackageDependsOn) {
    const deps = new Set();
    for (const f of packageJsons(project)) {
      try {
        const p = JSON.parse(readFileSync(f, 'utf8'));
        for (const k of Object.keys({ ...p.dependencies, ...p.devDependencies })) deps.add(k);
      } catch { /* package.json inválido: se ignora */ }
    }
    const missing = d.anyPackageDependsOn.filter((x) => !deps.has(x));
    if (missing.length) problems.push(`ningún package.json depende de: ${missing.join(', ')}`);
  }
  return problems;
}

// ---------- estado deseado / actual ----------

// Entradas gestionables como mapa plano "categoría:clave" → valor
export function desiredEntries(profile) {
  const e = {};
  for (const [k, v] of Object.entries(profile.enabledPlugins ?? {})) e[`enabledPlugins:${k}`] = v;
  for (const list of PERMISSION_LISTS) for (const rule of profile.settings?.permissions?.[list] ?? []) e[`permissions.${list}:${rule}`] = true;
  for (const [k, v] of Object.entries(profile.mcpServers ?? {})) e[`mcpServers:${k}`] = v;
  return e;
}

function currentEntries(settings, mcp) {
  const e = {};
  for (const [k, v] of Object.entries(settings.enabledPlugins ?? {})) e[`enabledPlugins:${k}`] = v;
  for (const list of PERMISSION_LISTS) for (const rule of settings.permissions?.[list] ?? []) e[`permissions.${list}:${rule}`] = true;
  for (const [k, v] of Object.entries(mcp.mcpServers ?? {})) e[`mcpServers:${k}`] = v;
  return e;
}

/**
 * Calcula el plan. M = entradas gestionadas antes (con su valor), D = deseadas, C = actuales.
 * - add:     en D, no gestionada, ausente en C
 * - adopt:   en D, no gestionada, ya presente igual en C → se respeta como del proyecto (nunca se borra)
 * - update:  gestionada, C == M, D != M
 * - remove:  gestionada, ya no en D, C == M
 * - conflict: gestionada y C != M (editada o borrada a mano), o no gestionada y C != D
 */
export function computePlan(desired, current, managed = {}, adopted = {}) {
  const plan = { add: [], adopt: [], update: [], remove: [], keep: [], conflict: [] };
  for (const [key, value] of Object.entries(desired)) {
    const has = Object.hasOwn(current, key);
    if (Object.hasOwn(managed, key)) {
      if (has && same(current[key], value)) plan.keep.push(key);
      else if (!has || !same(current[key], managed[key])) plan.conflict.push({ key, reason: has ? 'entrada gestionada editada a mano' : 'entrada gestionada borrada a mano' });
      else plan.update.push(key);
    } else if (Object.hasOwn(adopted, key)) {
      if (has && same(current[key], value)) plan.adopt.push(key);
      else if (!has) plan.add.push(key);
      else plan.conflict.push({ key, reason: 'el proyecto define otro valor' });
    } else if (!has) plan.add.push(key);
    else if (same(current[key], value)) plan.adopt.push(key);
    else plan.conflict.push({ key, reason: 'el proyecto ya define otro valor' });
  }
  for (const [key, value] of Object.entries(managed)) {
    if (Object.hasOwn(desired, key)) continue;
    if (!Object.hasOwn(current, key)) continue; // ya no está: solo se olvida
    if (same(current[key], value)) plan.remove.push(key);
    else plan.conflict.push({ key, reason: 'entrada gestionada a retirar fue editada a mano' });
  }
  return plan;
}

function applyEntries(settings, mcp, desired, plan) {
  const set = (key, value) => {
    const [cat, k] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    if (cat === 'enabledPlugins') (settings.enabledPlugins ??= {})[k] = value;
    else if (cat === 'mcpServers') (mcp.mcpServers ??= {})[k] = value;
    else {
      const list = cat.split('.')[1];
      settings.permissions ??= {};
      settings.permissions[list] ??= [];
      if (!settings.permissions[list].includes(k)) settings.permissions[list].push(k);
    }
  };
  const del = (key) => {
    const [cat, k] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    if (cat === 'enabledPlugins') delete settings.enabledPlugins[k];
    else if (cat === 'mcpServers') delete mcp.mcpServers[k];
    else {
      const list = cat.split('.')[1];
      settings.permissions[list] = settings.permissions[list].filter((r) => r !== k);
      if (!settings.permissions[list].length) delete settings.permissions[list];
      if (!Object.keys(settings.permissions).length) delete settings.permissions;
    }
    if (settings.enabledPlugins && !Object.keys(settings.enabledPlugins).length) delete settings.enabledPlugins;
    if (mcp.mcpServers && !Object.keys(mcp.mcpServers).length) delete mcp.mcpServers;
  };
  for (const key of [...plan.add, ...plan.update]) set(key, desired[key]);
  for (const key of plan.remove) del(key);
}

export function updateGitignore(text) {
  const eol = text?.includes('\r\n') ? '\r\n' : '\n';
  const block = [GI_START, ...GI_LINES, GI_END].join(eol);
  const src = text ?? '';
  const start = src.indexOf(GI_START);
  const end = src.indexOf(GI_END);
  if (start >= 0 && end > start) return src.slice(0, start) + block + src.slice(end + GI_END.length);
  const sep = src === '' || src.endsWith('\n') ? '' : eol;
  return `${src}${sep}${src === '' ? '' : eol}${block}${eol}`;
}

// ---------- archivos de CI gestionados ----------
// Archivos completos que pertenecen al harness (hash registrado en el manifiesto).
// Si el proyecto ya tiene uno propio en esa ruta, no se toca.

const SECURITY_WORKFLOW = '.github/workflows/harness-security.yml';
const DEPENDABOT = '.github/dependabot.yml';
// Hash independiente del fin de línea: git en Windows (autocrlf) reescribe LF ↔ CRLF.
const sha256 = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

function projectDirsWith(project, names) {
  const dirs = new Set();
  const walk = (dir, depth) => {
    if (depth > 3) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.') || ['dist', 'build', 'venv'].includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (names.includes(e.name)) dirs.add(`/${relative(project, dir).split(sep).join('/')}`.replace(/\/$/, '') || '/');
    }
  };
  walk(project, 0);
  return [...dirs].sort();
}

export function generateDependabot(project) {
  const entry = (eco, dir) => [
    `  - package-ecosystem: '${eco}'`,
    `    directory: '${dir}'`,
    '    schedule:',
    "      interval: 'weekly'",
    "      day: 'monday'",
    '    open-pull-requests-limit: 5',
    '    groups:',
    '      minor-and-patch:',
    '        update-types: [minor, patch]',
    '    commit-message:',
    "      prefix: 'chore(deps)'",
  ].join('\n');
  const blocks = [
    ...projectDirsWith(project, ['package-lock.json']).map((d) => entry('npm', d)),
    ...projectDirsWith(project, ['requirements.txt', 'pyproject.toml']).map((d) => entry('pip', d)),
    entry('github-actions', '/'),
  ];
  return [
    '# Gestionado por el harness (SyncProject v2). Majors: PR separado, revisión y merge siempre manuales.',
    'version: 2',
    'updates:',
    ...blocks,
    '',
  ].join('\n');
}

function hasOwnSecurityWorkflow(project) {
  const dir = join(project, '.github', 'workflows');
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((f) => f !== 'harness-security.yml' && /\.ya?ml$/.test(f)
    && /gitleaks|osv-scanner/i.test(readFileSync(join(dir, f), 'utf8')));
}

export function desiredFiles(project, profile) {
  const files = {};
  const ci = profile.ciFiles ?? [];
  if (ci.includes('security-workflow') && !hasOwnSecurityWorkflow(project)) {
    files[SECURITY_WORKFLOW] = readFileSync(join(REPO, 'templates', 'ci', 'harness-security.yml'), 'utf8');
  }
  if (ci.includes('dependabot')) files[DEPENDABOT] = generateDependabot(project);
  return files;
}

/** Plan de archivos: add / update / remove / keep / own (del proyecto, no se toca) / conflict. */
export function planFiles(project, desired, managed = {}) {
  const plan = { add: [], update: [], remove: [], keep: [], own: [], conflict: [] };
  for (const [rel, content] of Object.entries(desired)) {
    const abs = join(project, rel);
    const current = existsSync(abs) ? sha256(readFileSync(abs, 'utf8')) : null;
    if (Object.hasOwn(managed, rel)) {
      if (current === null) plan.conflict.push({ key: rel, reason: 'archivo gestionado borrado a mano' });
      else if (current !== managed[rel]) plan.conflict.push({ key: rel, reason: 'archivo gestionado editado a mano' });
      else if (sha256(content) !== managed[rel]) plan.update.push(rel);
      else plan.keep.push(rel);
    } else if (current === null) plan.add.push(rel);
    else plan.own.push(rel);
  }
  for (const [rel, hash] of Object.entries(managed)) {
    if (Object.hasOwn(desired, rel)) continue;
    const abs = join(project, rel);
    if (!existsSync(abs)) continue;
    if (sha256(readFileSync(abs, 'utf8')) === hash) plan.remove.push(rel);
    else plan.conflict.push({ key: rel, reason: 'archivo gestionado a retirar fue editado a mano' });
  }
  return plan;
}

// ---------- operaciones ----------

function paths(project) {
  return {
    settings: join(project, '.claude', 'settings.json'),
    mcp: join(project, '.mcp.json'),
    gitignore: join(project, '.gitignore'),
    manifest: join(project, '.claude', 'harness.manifest.json'),
    overrides: join(project, '.claude', 'harness.project.json'),
    backups: join(project, '.claude', '.harness-backup'),
    skills: join(project, '.claude', 'skills'),
    agents: join(project, '.claude', 'agents'),
  };
}

function legacyCopies(project) {
  const p = paths(project);
  const { skills, agents } = harnessCapabilities();
  const found = [];
  if (existsSync(p.skills)) for (const d of readdirSync(p.skills)) if (skills.has(d)) found.push(join('.claude', 'skills', d));
  if (existsSync(p.agents)) for (const f of readdirSync(p.agents)) if (agents.has(f)) found.push(join('.claude', 'agents', f));
  return found;
}

export function plan(project, { profile: profileName, modules = [], retireLegacy = false } = {}) {
  project = resolve(project);
  const p = paths(project);
  const prev = existsSync(p.manifest) ? JSON.parse(readFileSync(p.manifest, 'utf8')) : null;
  const name = profileName ?? prev?.profile;
  if (!name) throw new Error('Falta --profile (el proyecto no tiene manifiesto previo).');
  const profile = loadProfile(name, modules.length ? modules : (prev?.profile === name ? prev.modules ?? [] : []));
  const mismatch = detectMatches(project, profile);
  if (mismatch.length) throw new Error(`El proyecto no coincide con el perfil ${name}: ${mismatch.join('; ')}`);

  const settingsText = readText(p.settings);
  const mcpText = readText(p.mcp);
  const settings = settingsText ? JSON.parse(settingsText) : {};
  const mcp = mcpText ? JSON.parse(mcpText) : {};
  const desired = desiredEntries(profile);
  const entries = computePlan(desired, currentEntries(settings, mcp), prev?.managed ?? {}, prev?.adopted ?? {});

  const overrides = existsSync(p.overrides) ? JSON.parse(readFileSync(p.overrides, 'utf8')) : {};
  const manifest = {
    $comment: 'Gestionado por el harness (SyncProject v2). No editar: los ajustes del proyecto van en .claude/harness.project.json.',
    harnessVersion: harnessVersion(),
    profile: name,
    modules: profile.modules,
    gates: overrides.gates ?? profile.gates ?? [],
    gateCommands: { ...profile.gateCommands, ...overrides.gateCommands },
    gateNotes: { ...profile.gateNotes, ...overrides.gateNotes },
    quality: { ...profile.quality, ...overrides.quality },
    optionalMcp: Object.keys(profile.optionalMcp ?? {}),
    managed: {},
    adopted: {},
    managedFiles: {},
  };
  for (const key of [...entries.add, ...entries.update, ...entries.keep]) manifest.managed[key] = desired[key];
  for (const key of entries.adopt) manifest.adopted[key] = desired[key];

  const fileContents = desiredFiles(project, profile);
  const files = planFiles(project, fileContents, prev?.managedFiles ?? {});
  for (const rel of [...files.add, ...files.update, ...files.keep]) manifest.managedFiles[rel] = sha256(fileContents[rel]);
  // Un archivo en conflicto sigue gestionado con su hash anterior
  for (const { key } of files.conflict) if (prev?.managedFiles?.[key]) manifest.managedFiles[key] = prev.managedFiles[key];

  const giText = readText(p.gitignore);
  const giNext = updateGitignore(giText);
  const legacy = retireLegacy ? legacyCopies(project) : [];
  const withoutDate = (m) => m && { ...m, syncedAt: undefined };
  const manifestChanged = !same(withoutDate(prev), withoutDate(manifest));

  return {
    project, profile, prev, settings, mcp, settingsText, mcpText, giText, giNext, desired, entries, manifest, legacy,
    files, fileContents,
    conflicts: [...entries.conflict, ...files.conflict],
    changes: {
      files: files.add.length + files.update.length + files.remove.length > 0,
      settings: [...entries.add, ...entries.update, ...entries.remove].some((k) => !k.startsWith('mcpServers:')),
      mcp: [...entries.add, ...entries.update, ...entries.remove].some((k) => k.startsWith('mcpServers:')),
      gitignore: giText !== giNext,
      manifest: manifestChanged,
      legacy: legacy.length > 0,
    },
  };
}

export function apply(planned, { now = new Date() } = {}) {
  if (planned.conflicts.length) {
    throw new Error(`Conflictos: no se escribió nada.\n${planned.conflicts.map((c) => `  - ${c.key}: ${c.reason}`).join('\n')}`);
  }
  const p = paths(planned.project);
  const c = planned.changes;
  if (!Object.values(c).some(Boolean)) return { backup: null, written: [] };

  // Backup de todo lo que se va a tocar (y registro de qué no existía)
  const ts = now.toISOString().replace(/[:.]/g, '-');
  const bdir = join(p.backups, ts);
  mkdirSync(bdir, { recursive: true });
  const files = { settings: p.settings, mcp: p.mcp, gitignore: p.gitignore, manifest: p.manifest };
  const existed = {};
  for (const [k, f] of Object.entries(files)) {
    existed[k] = existsSync(f);
    if (existed[k]) cpSync(f, join(bdir, k));
  }
  for (const rel of planned.legacy) cpSync(join(planned.project, rel), join(bdir, 'legacy', rel), { recursive: true });
  const touchedFiles = [...planned.files.add, ...planned.files.update, ...planned.files.remove];
  const fileExisted = {};
  for (const rel of touchedFiles) {
    const abs = join(planned.project, rel);
    fileExisted[rel] = existsSync(abs);
    if (fileExisted[rel]) cpSync(abs, join(bdir, 'files', rel));
  }
  writeFileSync(join(bdir, 'backup.json'), JSON.stringify({ createdAt: now.toISOString(), existed, retired: planned.legacy, files: fileExisted }, null, 2));

  const written = [];
  const settings = structuredClone(planned.settings);
  const mcp = structuredClone(planned.mcp);
  applyEntries(settings, mcp, planned.desired, planned.entries);
  if (c.settings) {
    writeAtomic(p.settings, formatJson(settings, jsonStyle(planned.settingsText)));
    written.push('.claude/settings.json');
  }
  if (c.mcp) {
    writeAtomic(p.mcp, formatJson(mcp, jsonStyle(planned.mcpText)));
    written.push('.mcp.json');
  }
  if (c.gitignore) {
    writeAtomic(p.gitignore, planned.giNext);
    written.push('.gitignore');
  }
  for (const rel of [...planned.files.add, ...planned.files.update]) {
    writeAtomic(join(planned.project, rel), planned.fileContents[rel]);
    written.push(rel);
  }
  for (const rel of planned.files.remove) {
    rmSync(join(planned.project, rel));
    written.push(`retirado ${rel}`);
  }
  if (c.manifest || c.settings || c.mcp || c.files) {
    writeAtomic(p.manifest, formatJson({ ...planned.manifest, syncedAt: now.toISOString() }, jsonStyle(null)));
    written.push('.claude/harness.manifest.json');
  }
  for (const rel of planned.legacy) {
    rmSync(join(planned.project, rel), { recursive: true, force: true });
    written.push(`retirado ${rel}`);
  }
  // Verificación: todo JSON escrito debe parsear
  for (const f of [p.settings, p.mcp, p.manifest]) if (existsSync(f)) JSON.parse(readFileSync(f, 'utf8'));
  return { backup: ts, written };
}

export function listBackups(project) {
  const dir = paths(resolve(project)).backups;
  return existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(join(dir, d, 'backup.json'))).sort() : [];
}

export function rollback(project, ts) {
  project = resolve(project);
  const p = paths(project);
  const all = listBackups(project);
  const target = ts ?? all.at(-1);
  if (!target || !all.includes(target)) throw new Error(`Backup inexistente: ${ts ?? '(ninguno)'}. Disponibles: ${all.join(', ') || 'ninguno'}`);
  const bdir = join(p.backups, target);
  const meta = JSON.parse(readFileSync(join(bdir, 'backup.json'), 'utf8'));
  const files = { settings: p.settings, mcp: p.mcp, gitignore: p.gitignore, manifest: p.manifest };
  const restored = [];
  for (const [k, f] of Object.entries(files)) {
    if (meta.existed[k]) cpSync(join(bdir, k), f);
    else if (existsSync(f)) rmSync(f);
    restored.push(k);
  }
  for (const rel of meta.retired ?? []) {
    cpSync(join(bdir, 'legacy', rel), join(project, rel), { recursive: true });
    restored.push(rel);
  }
  for (const [rel, existedBefore] of Object.entries(meta.files ?? {})) {
    const abs = join(project, rel);
    if (existedBefore) cpSync(join(bdir, 'files', rel), abs);
    else if (existsSync(abs)) rmSync(abs);
    restored.push(rel);
  }
  return { backup: target, restored };
}

// ---------- CLI ----------

function printPlan(pl) {
  const e = pl.entries;
  const out = [`Proyecto: ${pl.project}`, `Perfil: ${pl.manifest.profile} · módulos: ${pl.manifest.modules.join(', ') || 'ninguno'} · harness ${pl.manifest.harnessVersion}`];
  const section = (label, items) => items.length && out.push(`${label}:`, ...items.map((i) => `  ${typeof i === 'string' ? i : `${i.key} — ${i.reason}`}`));
  section('Agregar', e.add);
  section('Actualizar', e.update);
  section('Retirar', e.remove);
  section('Adoptar (ya existía igual; queda como del proyecto)', e.adopt);
  section('CONFLICTOS', pl.conflicts);
  section('Archivos CI: agregar', pl.files.add);
  section('Archivos CI: actualizar', pl.files.update);
  section('Archivos CI: retirar', pl.files.remove);
  section('Archivos CI propios del proyecto (no se tocan)', pl.files.own);
  if (pl.changes.gitignore) out.push('.gitignore: agregar bloque harness (.harness/, .claude/.harness-backup/)');
  section('Copias legadas a retirar (con backup)', pl.legacy);
  if (pl.manifest.optionalMcp.length) out.push(`MCP opcionales no escritos (requieren autorización): ${pl.manifest.optionalMcp.join(', ')}`);
  const any = Object.values(pl.changes).some(Boolean);
  out.push(any ? 'Cambios pendientes.' : 'Sin cambios: el proyecto ya está sincronizado.');
  console.log(out.join('\n'));
}

function parseArgs(argv) {
  const a = { modules: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => argv[++i];
    if (k === '--project') a.project = next();
    else if (k === '--profile') a.profile = next();
    else if (k === '--modules') a.modules = next().split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === '--apply') a.apply = true;
    else if (k === '--retire-legacy') a.retireLegacy = true;
    else if (k === '--rollback') a.rollback = argv[i + 1] && !argv[i + 1].startsWith('--') ? next() : true;
    else if (k === '--list-backups') a.listBackups = true;
    else throw new Error(`Argumento desconocido: ${k}`);
  }
  if (!a.project) throw new Error('Falta --project <ruta>');
  return a;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const a = parseArgs(process.argv.slice(2));
    if (a.listBackups) console.log(listBackups(a.project).join('\n') || '(sin backups)');
    else if (a.rollback) {
      const r = rollback(a.project, a.rollback === true ? undefined : a.rollback);
      console.log(`Rollback a ${r.backup}: restaurado ${r.restored.join(', ')}`);
    } else {
      const pl = plan(a.project, a);
      printPlan(pl);
      if (pl.conflicts.length) process.exit(2);
      if (a.apply) {
        const r = apply(pl);
        console.log(r.backup ? `Aplicado. Backup: .claude/.harness-backup/${r.backup}\n${r.written.map((w) => `  ${w}`).join('\n')}` : 'Nada que aplicar.');
      } else console.log('(dry-run: usar --apply para escribir)');
    }
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }
}
