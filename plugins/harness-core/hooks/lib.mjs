// harness-core · utilidades compartidas por los hooks.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

export async function readStdinJson() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return raw.trim() ? JSON.parse(raw) : {};
}

// Manifiesto que SyncProject escribe en cada proyecto consumidor.
export function loadManifest(cwd) {
  const file = join(cwd, '.claude', 'harness.manifest.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// Aprobación de comandos: el manifiesto vive en el repo (cualquiera puede editarlo
// en un clon o un PR), pero estos hooks corren desde un plugin de usuario. Por eso
// solo se ejecutan comandos cuyo hash aprobó el usuario, guardado FUERA del repo.
// SyncProject (que el usuario ejecuta) registra la aprobación al aplicar.
const approvalsFile = () => process.env.HARNESS_APPROVALS_FILE || join(homedir(), '.claude', 'harness', 'approved-commands.json');

const projectKey = (cwd) => resolve(cwd).toLowerCase();

export function commandsFingerprint(quality) {
  return createHash('sha256').update(JSON.stringify(quality ?? {})).digest('hex');
}

function readApprovals() {
  try {
    return JSON.parse(readFileSync(approvalsFile(), 'utf8'));
  } catch {
    return {};
  }
}

export function isApproved(cwd, quality) {
  return readApprovals()[projectKey(cwd)] === commandsFingerprint(quality);
}

export function approveCommands(cwd, quality) {
  const file = approvalsFile();
  const all = readApprovals();
  all[projectKey(cwd)] = commandsFingerprint(quality);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, JSON.stringify(all, null, 2));
  renameSync(`${file}.tmp`, file);
}

// Ruta de archivo apta para pasar a un shell entre comillas: sin metacaracteres
// ($, `, ", ', %, !, ^, &, |, ;, <, >, saltos de línea).
export const isShellSafePath = (p) => typeof p === 'string' && /^[\p{L}\p{N} ._\-/\\:@+~()[\],]+$/u.test(p);
