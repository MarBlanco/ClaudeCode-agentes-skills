#!/usr/bin/env node
// harness-core · hooks de calidad configurados por el manifiesto del proyecto.
//   node quality.mjs stop    → Stop: typecheck si cambiaron archivos relevantes.
//   node quality.mjs format  → PostToolUse Edit|Write: formatea el archivo tocado.
// Sin bloque "quality" en .claude/harness.manifest.json no hace nada.
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { isApproved, isShellSafePath, loadManifest, readStdinJson } from './lib.mjs';

const mode = process.argv[2];

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 });
  } catch {
    return null;
  }
}

function run(command, cwd, timeoutSec) {
  const r = spawnSync(command, { cwd, shell: true, encoding: 'utf8', timeout: timeoutSec * 1000, windowsHide: true });
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (r.error?.code === 'ETIMEDOUT') return { ok: false, output: `timeout tras ${timeoutSec}s\n${output}` };
  return { ok: r.status === 0, output };
}

// Huella del estado de los archivos relevantes: evita repetir el typecheck
// si nada cambió desde la última pasada verde.
function fingerprint(cwd, files) {
  const h = createHash('sha256');
  h.update(git(cwd, ['diff', 'HEAD', '--', ...files]) ?? '');
  for (const f of files) {
    const p = join(cwd, f);
    if (existsSync(p)) h.update(`${f}:${statSync(p).size}:${statSync(p).mtimeMs}`);
  }
  return h.digest('hex');
}

function stop(input, cfg, cwd) {
  if (input.stop_hook_active) return; // ya bloqueó una vez en esta cadena: no encadenar más
  const exts = cfg.extensions ?? ['.ts', '.tsx'];
  const status = git(cwd, ['status', '--porcelain', '--untracked-files=all']);
  if (status === null) return;
  const files = status.split('\n').map((l) => l.slice(3).trim().replace(/^"|"$/g, '')).filter((f) => f && exts.includes(extname(f)));
  if (!files.length) return;

  const cacheDir = join(cwd, '.harness', 'cache');
  const cacheFile = join(cacheDir, 'typecheck.json');
  const fp = fingerprint(cwd, files);
  try {
    if (JSON.parse(readFileSync(cacheFile, 'utf8')).fingerprint === fp) return;
  } catch { /* sin caché previa */ }

  const { ok, output } = run(cfg.command, cwd, cfg.timeoutSec ?? 180);
  if (ok) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cacheFile, JSON.stringify({ fingerprint: fp, at: new Date().toISOString() }));
    return;
  }
  const tail = output.trim().split('\n').slice(-40).join('\n');
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: `[harness] El typecheck falló (${cfg.command}). Corregí estos errores antes de terminar:\n${tail}`,
  }));
}

function format(input, rules, cwd) {
  const file = input.tool_input?.file_path;
  if (!file || !existsSync(file)) return;
  if (!isShellSafePath(file)) {
    process.stderr.write(`harness format: ruta con caracteres no seguros para el shell, no se formatea: ${JSON.stringify(file)}\n`);
    return;
  }
  const rule = rules.find((r) => (r.extensions ?? []).includes(extname(file)));
  if (!rule) return;
  const { ok, output } = run(`${rule.command} "${file}"`, cwd, rule.timeoutSec ?? 30);
  if (!ok) process.stderr.write(`harness format: ${rule.command} falló en ${file}\n${output.slice(-500)}\n`);
}

try {
  const input = await readStdinJson();
  const cwd = input.cwd || process.cwd();
  const quality = loadManifest(cwd)?.quality;
  const hasCommands = quality?.typecheck?.command || quality?.format?.length;
  if (hasCommands && !isApproved(cwd, quality)) {
    // Comandos del repo sin aprobación del usuario (clon ajeno o manifiesto editado): no se ejecutan.
    process.stderr.write('harness quality: comandos del manifiesto no aprobados; no se ejecutan. Aprobar con: node scripts/sync-project.mjs --project <ruta> --apply\n');
  } else if (mode === 'stop' && quality?.typecheck?.command) stop(input, quality.typecheck, cwd);
  if (mode === 'format' && Array.isArray(quality?.format)) format(input, quality.format, cwd);
} catch (err) {
  process.stderr.write(`harness quality (${mode}): ${err.message}\n`);
}
