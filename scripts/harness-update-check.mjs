#!/usr/bin/env node
// harness-update-check — detección de actualizaciones y deriva (SOLO LECTURA).
// Compara harness.lock.json con el upstream (gh api, npm view, marketplaces locales)
// y la documentación de los proyectos consumidores con sus versiones reales.
// No instala, no actualiza, no escribe nada salvo el reporte pedido con --out.
//
//   node scripts/harness-update-check.mjs [--json] [--offline] [--out <archivo.md>]
//
// --offline omite consultas de red (útil en CI sin token o para tests).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- versiones ----------

export function parseVersion(v) {
  const m = String(v ?? '').trim().replace(/^[v^~=<>\s]+/, '').match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : null;
}

/** -1 si a<b, 0 si iguales, 1 si a>b; null si alguna no es semver. */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  return 0;
}

/** Versión semver completa (no un sha que empiece por dígitos). */
export const isSemver = (v) => /^v?\d+\.\d+(\.\d+)?([-+][\w.-]+)?$/.test(String(v ?? '').trim());

export function isMajorJump(from, to) {
  const a = parseVersion(from);
  const b = parseVersion(to);
  return !!(a && b && b[0] > a[0]);
}

// ---------- deriva de documentación de proyectos ----------

// Nombre en docs → cómo encontrar la versión real
const DOC_PACKAGES = [
  { label: 'Next', re: /\bNext(?:\.js)?\s+v?(\d+(?:\.\d+){0,2})/i, npm: 'next' },
  { label: 'Payload', re: /\bPayload(?:\s+CMS)?\s+v?(\d+(?:\.\d+){0,2})/i, npm: 'payload' },
  { label: 'React', re: /\bReact\s+v?(\d+(?:\.\d+){0,2})/i, npm: 'react' },
  { label: 'Vite', re: /\bVite\s+v?(\d+(?:\.\d+){0,2})/i, npm: 'vite' },
  { label: 'Tailwind', re: /\bTailwind(?:\s*CSS)?\s+v?(\d+(?:\.\d+){0,2})/i, npm: 'tailwindcss' },
  { label: 'TypeScript', re: /\bTypeScript\s+v?(\d+(?:\.\d+){0,2})/i, npm: 'typescript' },
  { label: 'Django', re: /\bDjango\s+v?(\d+(?:\.\d+){0,2})/i, pip: 'django' },
];

/** Versiones citadas en un texto de documentación: [{label, version}] (cada versión distinta por paquete). */
export function docVersions(text) {
  const out = [];
  for (const p of DOC_PACKAGES) {
    const seen = new Set();
    for (const m of text.matchAll(new RegExp(p.re.source, 'gi'))) {
      if (!seen.has(m[1])) out.push({ ...p, version: m[1] });
      seen.add(m[1]);
    }
  }
  return out;
}

function findFiles(dir, name, depth = 0, acc = []) {
  if (depth > 3 || !existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === 'dist' || e.name === 'build') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) findFiles(p, name, depth + 1, acc);
    else if (e.name === name) acc.push(p);
  }
  return acc;
}

/** Versión declarada de un paquete en el proyecto (package.json o requirements). */
export function installedVersion(project, pkg) {
  if (pkg.npm) {
    for (const f of findFiles(project, 'package.json')) {
      try {
        const j = JSON.parse(readFileSync(f, 'utf8'));
        const v = j.dependencies?.[pkg.npm] ?? j.devDependencies?.[pkg.npm];
        if (v) return v.replace(/^[\^~=]/, '');
      } catch { /* package.json inválido */ }
    }
  }
  if (pkg.pip) {
    for (const name of ['requirements.txt', 'pyproject.toml']) {
      for (const f of findFiles(project, name)) {
        const m = readFileSync(f, 'utf8').match(new RegExp(`^\\s*"?${pkg.pip}"?\\s*(?:==|>=|~=)\\s*([\\d.]+)`, 'im'));
        if (m) return m[1];
      }
    }
  }
  return null;
}

/** Compara lo citado en CLAUDE.md con lo declarado. Si la doc da solo "major" se compara solo el major. */
export function projectDocDrift(project) {
  const doc = join(project, 'CLAUDE.md');
  if (!existsSync(doc)) return [];
  const findings = [];
  for (const d of docVersions(readFileSync(doc, 'utf8'))) {
    const real = installedVersion(project, d);
    if (!real) continue;
    const parts = d.version.split('.').length;
    const a = parseVersion(d.version).slice(0, parts).join('.');
    const b = (parseVersion(real) ?? []).slice(0, parts).join('.');
    if (a !== b) findings.push({ package: d.label, documented: d.version, declared: real });
  }
  return findings;
}

// ---------- consultas al upstream (inyectables para tests) ----------

function run(cmd, args) {
  try {
    const opts = { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'ignore'] };
    // npm es un .cmd en Windows: requiere shell. Los argumentos vienen del lock (no del usuario).
    if (process.platform === 'win32' && cmd === 'npm') {
      return execFileSync(`npm ${args.map((a) => `"${a}"`).join(' ')}`, { ...opts, shell: true }).trim();
    }
    return execFileSync(cmd, args, opts).trim();
  } catch {
    return null;
  }
}

export const defaultFetchers = {
  /** ¿Hubo commits en `path` posteriores a `ref`? → { changed, latest } | null */
  pathChangedSince: (repo, path, ref) => {
    const q = path ? `?path=${encodeURIComponent(path)}&per_page=1` : '?per_page=1';
    const latest = run('gh', ['api', `repos/${repo}/commits${q}`, '--jq', '.[0].sha']);
    if (!latest) return null;
    if (latest === ref) return { changed: false, latest };
    // "ahead"/"identical": ref ya contiene el último cambio de la ruta
    const status = run('gh', ['api', `repos/${repo}/compare/${latest}...${ref}`, '--jq', '.status']);
    if (!status) return null;
    return { changed: !['ahead', 'identical'].includes(status), latest };
  },
  latestRelease: (repo) => run('gh', ['api', `repos/${repo}/releases/latest`, '--jq', '.tag_name']),
  repoMeta: (repo) => {
    const out = run('gh', ['api', `repos/${repo}`, '--jq', '{license: .license.spdx_id, archived: .archived}']);
    try { return out ? JSON.parse(out) : null; } catch { return null; }
  },
  npmVersion: (pkg, majorCap) => {
    const out = run('npm', ['view', majorCap ? `${pkg}@${majorCap}` : pkg, 'version']);
    if (!out) return null;
    // Con rango, npm lista "pkg@x.y.z 'x.y.z'" por línea: tomar la última
    const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
    const last = lines.at(-1);
    const m = last.match(/'([^']+)'$/);
    return m ? m[1] : last;
  },
  installedPlugins: () => {
    const f = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');
    try { return JSON.parse(readFileSync(f, 'utf8')).plugins ?? {}; } catch { return {}; }
  },
  marketplacePluginVersion: (pluginId) => {
    const [name, mkt] = pluginId.split('@');
    const base = join(homedir(), '.claude', 'plugins', 'marketplaces', mkt);
    try {
      const m = JSON.parse(readFileSync(join(base, '.claude-plugin', 'marketplace.json'), 'utf8'));
      const entry = m.plugins.find((p) => p.name === name);
      if (!entry) return null;
      if (entry.version) return entry.version;
      if (typeof entry.source === 'string') {
        const pj = join(base, entry.source, '.claude-plugin', 'plugin.json');
        if (existsSync(pj)) return JSON.parse(readFileSync(pj, 'utf8')).version ?? null;
      }
      return entry.source?.sha?.slice(0, 12) ?? null;
    } catch { return null; }
  },
};

const LICENSE_FREE = new Set(['UNLICENSED', 'service', 'NOASSERTION']);

const RANK = { ok: 0, unknown: 1, update: 2, major: 3, alert: 4 };
const NETWORK_KINDS = new Set(['github-commit', 'github-release', 'npm']);

const semverFlag = (current, latest) => (isMajorJump(current, latest) ? 'major' : 'update');

function checkPlugin(c, f, flag, r) {
  const installed = f.installedPlugins()[c.source.plugin]?.[0];
  if (installed?.version && c.version && installed.version !== c.version) flag('alert', `instalado ${installed.version} ≠ lock ${c.version}`);
  const avail = f.marketplacePluginVersion(c.source.plugin);
  r.latest = avail;
  if (!avail || !c.version || avail === c.version) return;
  if (isSemver(avail) && isSemver(c.version)) {
    if (compareVersions(c.version, avail) === -1) flag(semverFlag(c.version, avail), `marketplace ofrece ${avail}`);
  } else if (!installed?.gitCommitSha?.startsWith(avail) && !String(c.version).startsWith(avail)) {
    // El marketplace fija el plugin por sha, no por versión
    flag('update', `el marketplace fija un commit nuevo (${avail})`);
  }
}

function licenseChanged(locked, upstream) {
  if (!locked || !upstream || upstream === 'NOASSERTION') return false;
  if (LICENSE_FREE.has(locked) || locked.startsWith('LicenseRef')) return false;
  return upstream !== locked;
}

function checkRepoMeta(c, f, flag) {
  const meta = f.repoMeta(c.source.repo);
  if (!meta) return flag('unknown', `no se pudo consultar ${c.source.repo}`);
  if (meta.archived) flag('alert', `repo ${c.source.repo} archivado`);
  if (licenseChanged(c.license, meta.license)) flag('alert', `licencia cambió: ${c.license} → ${meta.license}`);
}

function checkGithubCommit(c, f, flag, r) {
  const { repo, path, ref } = c.source;
  const res = f.pathChangedSince(repo, path, ref);
  if (!res) return flag('unknown', 'sin respuesta del upstream');
  r.latest = (res.changed ? res.latest : ref).slice(0, 7);
  if (res.changed) flag('update', `upstream cambió en ${path || '/'} después de ${ref.slice(0, 7)} (último: ${r.latest}): diff y resync en rama`);
}

function checkGithubRelease(c, f, flag, r) {
  const tag = f.latestRelease(c.source.repo);
  if (!tag) return flag('unknown', 'sin release publicada o sin respuesta');
  const prefix = c.source.tagPrefix ?? '';
  r.latest = tag.startsWith(prefix) ? tag.slice(prefix.length) : tag;
  if (compareVersions(c.version, r.latest) === -1) flag(semverFlag(c.version, r.latest), `release ${tag} disponible`);
}

function checkNpm(c, f, flag, r) {
  r.latest = f.npmVersion(c.source.package, c.source.majorCap);
  if (!r.latest) return flag('unknown', 'npm sin respuesta');
  if (c.version === 'latest') r.notes.push(`sin fijar; última ${r.latest}`);
  else if (compareVersions(c.version, r.latest) === -1) flag(semverFlag(c.version, r.latest), `npm ofrece ${r.latest}`);
}

const CHECKS = { 'github-commit': checkGithubCommit, 'github-release': checkGithubRelease, npm: checkNpm };

/** Evalúa un componente del lock. Devuelve { id, status, current, latest, notes[] }. */
export function checkComponent(c, f, { offline = false } = {}) {
  const r = { id: c.id, type: c.type, current: c.version ?? c.source?.ref?.slice(0, 7) ?? '-', latest: null, status: 'ok', notes: [] };
  const kind = c.source?.kind;
  const flag = (status, note) => {
    if (RANK[status] > RANK[r.status]) r.status = status;
    if (note) r.notes.push(note);
  };
  if (kind === 'claude-plugin') checkPlugin(c, f, flag, r);
  if (offline) {
    if (NETWORK_KINDS.has(kind)) r.notes.push('sin verificar (offline)');
    return r;
  }
  if (c.source?.repo && kind !== 'claude-plugin') checkRepoMeta(c, f, flag);
  CHECKS[kind]?.(c, f, flag, r);
  return r;
}

export function runCheck(lock, f = defaultFetchers, { offline = false, repo = REPO } = {}) {
  const components = lock.components.map((c) => checkComponent(c, f, { offline }));
  const projects = (lock.projects ?? []).map((p) => {
    const path = resolve(repo, p.path);
    return { name: p.name, exists: existsSync(path), drift: existsSync(path) ? projectDocDrift(path) : [] };
  });
  return { checkedAt: new Date().toISOString(), components, projects };
}

export function toMarkdown(report) {
  const order = { alert: 0, major: 1, update: 2, unknown: 3, ok: 4 };
  const rows = [...report.components].sort((a, b) => order[a.status] - order[b.status]);
  const lines = [
    `# Harness update check — ${report.checkedAt.slice(0, 10)}`,
    '',
    'Solo lectura. Ningún componente fue modificado. Política: crítico → validación completa y aprobación si cambia el comportamiento; major → manual.',
    '',
    '| Estado | Componente | Tipo | Actual | Disponible | Notas |',
    '|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.status.toUpperCase()} | ${r.id} | ${r.type} | ${r.current} | ${r.latest ?? '-'} | ${r.notes.join('; ') || '-'} |`),
    '',
    '## Deriva de documentación en proyectos',
    '',
  ];
  for (const p of report.projects) {
    if (!p.exists) lines.push(`- ${p.name}: ruta no encontrada`);
    else if (!p.drift.length) lines.push(`- ${p.name}: sin deriva detectada`);
    else for (const d of p.drift) lines.push(`- ${p.name}: CLAUDE.md dice ${d.package} ${d.documented}, el proyecto declara ${d.declared}`);
  }
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  lines.push('', `Resumen: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  return `${lines.join('\n')}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const lock = JSON.parse(readFileSync(join(REPO, 'harness.lock.json'), 'utf8'));
  const report = runCheck(lock, defaultFetchers, { offline: args.includes('--offline') });
  const text = args.includes('--json') ? `${JSON.stringify(report, null, 2)}\n` : toMarkdown(report);
  if (outIdx >= 0) writeFileSync(args[outIdx + 1], text);
  process.stdout.write(text);
}
