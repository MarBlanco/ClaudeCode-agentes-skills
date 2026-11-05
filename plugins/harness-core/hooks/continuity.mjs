#!/usr/bin/env node
// harness-core · continuidad de sesión (SessionStart / UserPromptSubmit / Stop / SessionEnd).
// Guarda un estado mínimo FUERA del repo (~/.claude/harness/sessions/<hash-del-proyecto>/<sesión>.json)
// y, al iniciar, avisa si la sesión previa quedó "working" (interrumpida) o, tras compactar, la tarea en curso.
// No lee transcripciones (formato interno). No ejecuta nada del proyecto. Nunca falla ni bloquea.
// Uso: node continuity.mjs <start|prompt|stop|end>
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { readStdinJson } from './lib.mjs';

const MIN_AGE_MS = 2 * 60 * 1000; // más reciente que esto: probablemente otra ventana activa
const MAX_AGE_MS = 7 * 24 * 3600 * 1000; // más viejo: no se anuncia
const PRUNE_MS = 14 * 24 * 3600 * 1000;

const baseDir = () => process.env.HARNESS_SESSIONS_DIR || join(homedir(), '.claude', 'harness', 'sessions');
const projectDir = (cwd) => join(baseDir(), createHash('sha256').update(resolve(cwd).toLowerCase()).digest('hex').slice(0, 16));
const safeId = (id) => String(id || 'sin-id').replace(/[^\w-]/g, '').slice(0, 80) || 'sin-id';

// Recorta y oculta valores con aspecto de credencial antes de persistir el pedido.
export function scrub(text, max = 160) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\b(sk-[\w-]{8,}|ghp_\w{8,}|gho_\w{8,}|AKIA[0-9A-Z]{8,}|eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]*)/g, '[REDACTED]')
    .replace(/\b(bearer|token|password|passwd|secret|api[_-]?key|authorization)\b\s*[:=]?\s*\S+/gi, '$1=[REDACTED]')
    .trim()
    .slice(0, max);
}

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function snapshot(cwd) {
  const branch = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const dirty = branch ? git(cwd, ['status', '--porcelain']).split('\n').filter(Boolean).length : null;
  return { branch: branch || null, dirty };
}

function readState(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(dir, id, patch) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${safeId(id)}.json`);
  const next = { ...(readState(file) ?? {}), ...patch, sessionId: id, updatedAt: Date.now() };
  writeFileSync(`${file}.tmp`, JSON.stringify(next));
  renameSync(`${file}.tmp`, file);
}

function prune(dir) {
  try {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (Date.now() - statSync(p).mtimeMs > PRUNE_MS) rmSync(p, { force: true });
    }
  } catch {
    /* sin directorio todavía */
  }
}

const ago = (ms) => {
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m} min` : m < 2880 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} días`;
};

// Devuelve el aviso (o '') para el inicio de sesión; marca como "recovered" lo anunciado.
export function startNotice({ dir, sessionId, source, cwd, now = Date.now() }) {
  const lines = [];
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return '';
  }
  const hasStateMd = existsSync(join(cwd, '.harness', 'state.md'));
  const mine = readState(join(dir, `${safeId(sessionId)}.json`));

  if (source === 'compact' && mine?.lastPrompt) {
    lines.push(`[harness] Tras compactar. Tarea en curso: «${mine.lastPrompt}»${mine.branch ? ` · rama ${mine.branch}` : ''}.${hasStateMd ? ' Estado de fase en .harness/state.md.' : ''}`);
  }
  if (source === 'startup' || source === 'resume') {
    const stale = files
      .map((f) => ({ f, s: readState(join(dir, f)) }))
      .filter(({ s }) => s && s.sessionId !== sessionId && s.status === 'working' && now - s.updatedAt > MIN_AGE_MS && now - s.updatedAt < MAX_AGE_MS)
      .sort((a, b) => b.s.updatedAt - a.s.updatedAt)[0];
    if (stale) {
      const { s } = stale;
      lines.push(`[harness] Sesión previa posiblemente interrumpida (hace ${ago(now - s.updatedAt)}; si sigue abierta en otra ventana, ignorar). Último pedido: «${s.lastPrompt ?? '?'}»${s.branch ? ` · rama ${s.branch}` : ''}${s.dirty != null ? ` · ${s.dirty} cambios sin commit al último cierre de turno` : ''}.${hasStateMd ? ' Ver .harness/state.md.' : ''} Comprobar git status antes de continuar; no repetir trabajo ya hecho.`);
      writeState(dir, s.sessionId, { status: 'recovered' });
    }
  }
  return lines.join('\n');
}

async function main() {
  const mode = process.argv[2];
  const input = await readStdinJson();
  const cwd = input.cwd || process.cwd();
  const id = input.session_id || input.sessionId || 'sin-id';
  const dir = projectDir(cwd);

  if (mode === 'start') {
    prune(dir);
    const notice = startNotice({ dir, sessionId: id, source: input.source ?? 'startup', cwd });
    writeState(dir, id, { cwd, source: input.source ?? 'startup', ...(input.source === 'compact' ? {} : { startedAt: Date.now(), status: 'idle' }) });
    if (notice) process.stdout.write(`${notice}\n`);
  } else if (mode === 'prompt') {
    writeState(dir, id, { status: 'working', lastPrompt: scrub(input.prompt) });
  } else if (mode === 'stop') {
    writeState(dir, id, { status: 'idle', ...snapshot(cwd) });
  } else if (mode === 'end') {
    writeState(dir, id, { status: 'closed', endReason: input.reason ?? null, ...snapshot(cwd) });
  }
}

if (process.argv[1]?.endsWith('continuity.mjs')) {
  try {
    await main();
  } catch (err) {
    process.stderr.write(`harness continuity: ${err.message}\n`);
  }
}
