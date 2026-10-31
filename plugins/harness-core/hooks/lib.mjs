// harness-core · utilidades compartidas por los hooks.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
