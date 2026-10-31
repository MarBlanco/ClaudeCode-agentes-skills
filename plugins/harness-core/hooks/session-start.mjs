#!/usr/bin/env node
// harness-core · SessionStart: anuncia perfil, módulos y gates del proyecto.
// Solo lee archivos locales; no hace red ni modifica nada.
import { loadManifest, readStdinJson } from './lib.mjs';

try {
  const input = await readStdinJson();
  const manifest = loadManifest(input.cwd || process.cwd());
  if (manifest) {
    const gates = manifest.gates?.length ? manifest.gates.join(', ') : 'según riesgo (ver harness-review)';
    const lines = [
      `[harness ${manifest.harnessVersion ?? '?'}] perfil ${manifest.profile} · módulos: ${(manifest.modules ?? []).join(', ') || 'ninguno'}`,
      `Gates disponibles: ${gates}. Evidencia en .harness/evidence/<tarea>/. Máximo 3 ciclos de corrección.`,
    ];
    if (manifest.quality?.typecheck?.command) lines.push(`Typecheck en Stop: ${manifest.quality.typecheck.command}`);
    process.stdout.write(`${lines.join('\n')}\n`);
  }
} catch (err) {
  process.stderr.write(`harness session-start: ${err.message}\n`);
}
