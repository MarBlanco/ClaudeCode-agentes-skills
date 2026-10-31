#!/usr/bin/env node
// harness-core · PreToolUse guard.
// Bloquea secretos, lockfiles y migraciones versionadas; pide confirmación en
// operaciones destructivas o de producción. Política: ver README del harness.
// Si el propio hook falla, no bloquea (fail-open con aviso): un guard roto que
// impide trabajar es peor que la red de seguridad de permissions.deny.
import { execFileSync } from 'node:child_process';
import { basename, dirname, isAbsolute, resolve } from 'node:path';

const FILE_TOOLS = new Set(['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

const ENV_SAFE = /^\.env\.(example|sample|template|dist|defaults)$/i;
const LOCKFILES = new Set([
  'package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb',
  'poetry.lock', 'Pipfile.lock', 'uv.lock', 'Cargo.lock', 'composer.lock', 'Gemfile.lock',
]);
const MIGRATION_DIR = /(^|[\\/])migrations[\\/]/i;

export function isSecretPath(p) {
  if (!p) return false;
  const name = basename(String(p).replace(/[\\/]+$/, ''));
  if (/^\.env(\..+)?$/i.test(name)) return !ENV_SAFE.test(name);
  if (/\.(pem|key|p12|pfx|jks|keystore)$/i.test(name)) return true;
  if (/^id_(rsa|dsa|ecdsa|ed25519)$/i.test(name)) return true;
  return name === '.credentials.json' || name === '.netrc' || name === '.pgpass';
}

// Un comando se evalúa por segmentos (separados por | ; & o salto de línea)
// para que los patrones no recorran el comando entero con backtracking.
const splitSegments = (cmd) => cmd.split(/[|;&\n]+/).map((s) => s.trim()).filter(Boolean);
// Palabras de un segmento, sin comillas ni redirecciones, para comparar rutas.
const words = (seg) => seg.split(/\s+/).map((w) => w.replace(/^[<>]+|^['"(]+|['");]+$/g, '')).filter(Boolean);

export function secretInCommand(cmd) {
  for (const seg of splitSegments(cmd)) {
    for (const w of words(seg)) {
      // "VAR=.env", "--env-file=.env", "src=.env.local": se mira el valor tras "="
      const target = w.includes('=') ? w.slice(w.lastIndexOf('=') + 1) : w;
      if (isSecretPath(target)) return basename(target);
    }
  }
  return null;
}

const DENY_BASH = [
  [/\bgit\s+push\b.*\s(--force(-with-lease)?|-f)(\s|=|$)/, 'force push prohibido por la política del harness'],
  [/\bgit\s+push\b.*\s\+[\w/.-]+/, 'force push (refspec con +) prohibido por la política del harness'],
];

const ASK_BASH = [
  [/\bgit\s+push\b/, 'git push: publicar cambios requiere confirmación'],
  [/\bgit\s+reset\b.*\s--hard\b/, 'git reset --hard descarta trabajo'],
  [/\bgit\s+clean\b.*\s-[a-zA-Z]*f/, 'git clean -f borra archivos no versionados'],
  [/\bgit\s+(checkout|restore)\s(.*\s)?\.$/, 'descarta cambios locales del árbol de trabajo'],
  [/\bgit\s+branch\b.*\s-D\b/, 'borrado forzado de rama'],
  [/\bgit\s+(rebase|filter-branch|filter-repo)\b/, 'reescritura de historial'],
  [/\bsupabase\s+(db\s+(push|reset)|migration\s+repair|projects\s+delete)\b/, 'operación sobre base de datos de Supabase'],
  [/\bvercel\b.*(\s--prod\b|\s(promote|rollback|remove|rm)\b)/, 'operación de producción en Vercel'],
  [/\bvercel\s+env\s+(pull|add|rm|remove)\b/, 'vercel env manipula secretos'],
  [/\bdocker\s+(system|volume|image|container)\s+prune\b/, 'borra datos de Docker'],
  [/\bdocker\s+volume\s+rm\b/, 'borra volúmenes de Docker'],
  [/\bdocker[\s-]compose\b.*\sdown\b.*\s(-v|--volumes)\b/, 'borra volúmenes de Docker'],
  [/\bdrop\s+(table|database|schema)\b/i, 'SQL destructivo'],
  [/\btruncate\s+(table\s+)?\w/i, 'SQL destructivo'],
  [/\b(npm|pnpm|yarn)\s+publish\b/, 'publicación de paquete'],
  [/\bgh\s+(pr\s+merge|release\s+create|repo\s+delete)\b/, 'operación remota en GitHub'],
];

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

function isTracked(cwd, file) {
  const abs = isAbsolute(file) ? file : resolve(cwd, file);
  return git(dirname(abs), ['ls-files', '--error-unmatch', abs]) !== null;
}

function evaluateFile(tool, ti, cwd) {
  const p = ti.file_path ?? ti.notebook_path ?? ti.path;
  if (isSecretPath(p)) return ['deny', `Archivo de secretos protegido: ${basename(p)}. Usá .env.example o pedí el valor al usuario.`];
  if (!WRITE_TOOLS.has(tool) || !p) return null;
  const name = basename(p);
  if (LOCKFILES.has(name)) return ['deny', `${name} no se edita a mano: usá el gestor de paquetes (npm/pnpm/uv/poetry).`];
  if (MIGRATION_DIR.test(p) && name !== '__init__.py' && isTracked(cwd, p)) {
    return ['deny', `Migración ya versionada en git: ${name}. Creá una migración nueva en lugar de editar la existente.`];
  }
  return null;
}

function evaluateSearch(tool, ti) {
  const targets = [ti.path, ti.glob, tool === 'Glob' ? ti.pattern : null].filter(Boolean);
  const hit = targets.find((t) => isSecretPath(t) || /(^|[\\/])\.env(\*|\.\*)$/.test(t));
  return hit ? ['deny', `Búsqueda dentro de archivos de secretos bloqueada: ${hit}`] : null;
}

function evaluateBash(ti, cwd) {
  const cmd = String(ti.command ?? '');
  const secret = secretInCommand(cmd);
  if (secret) return ['deny', `El comando referencia un archivo de secretos (${secret}). No se leen ni copian secretos.`];
  const segments = splitSegments(cmd);
  const match = (rules) => {
    for (const [re, why] of rules) if (segments.some((s) => re.test(s))) return why;
    return null;
  };
  const denied = match(DENY_BASH);
  if (denied) return ['deny', denied];
  if (segments.some((s) => /\bgit\s+commit\b/.test(s))) {
    const branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
    if (branch === 'main' || branch === 'master') {
      return ['deny', `Commit directo en ${branch} prohibido: creá una rama de trabajo (git switch -c <rama>).`];
    }
  }
  const ask = match(ASK_BASH);
  return ask ? ['ask', ask] : null;
}

export function evaluate(input) {
  const tool = input.tool_name;
  const ti = input.tool_input ?? {};
  const cwd = input.cwd || process.cwd();
  if (FILE_TOOLS.has(tool)) return evaluateFile(tool, ti, cwd);
  if (tool === 'Grep' || tool === 'Glob') return evaluateSearch(tool, ti);
  if (tool === 'Bash') return evaluateBash(ti, cwd);
  return null;
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let decision;
  try {
    decision = evaluate(JSON.parse(raw));
  } catch (err) {
    process.stderr.write(`harness guard: error interno, no bloquea (${err.message})\n`);
    return;
  }
  if (!decision) return;
  const [permissionDecision, reason] = decision;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision,
      permissionDecisionReason: `[harness] ${reason}`,
    },
  }));
}

if (process.argv[1]?.endsWith('guard.mjs')) await main();
