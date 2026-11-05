#!/usr/bin/env node
// harness-core · SubagentStop: un qa-explorer no termina con entregables faltantes sin declararlo.
// Requeridos en .harness/qa/<corrida>/: charter.md, map.md, ledger.md, al menos una captura en
// screenshots/ y al menos un spec en regression/. report.md NO se exige al subagente: Claude Code no deja
// que un subagente escriba archivos de informe; lo devuelve como texto y lo guarda quien coordina.
// Si faltan entregables y la respuesta final (o report.md) no declara "Estado: INCOMPLETO", se bloquea
// la parada una vez con la lista de faltantes. Si el agente vuelve a parar sin completarlos, se deja
// HARNESS-INCOMPLETO.txt en la corrida y un aviso visible.
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isExplorer } from './agent-policy.mjs';
import { readStdinJson } from './lib.mjs';

const RUN_NAME = /^\d{8}-[\w-]+$/;
const RECENT_MS = 12 * 60 * 60 * 1000;
const INCOMPLETE = /Estado:\s*\**\s*INCOMPLETO/i;

function findRun(cwd, message) {
  const qa = join(cwd, '.harness', 'qa');
  const named = /\.harness[\\/]qa[\\/](\d{8}-[\w-]+)/.exec(message ?? '')?.[1];
  if (named && existsSync(join(qa, named))) return join(qa, named);
  if (!existsSync(qa)) return null;
  const runs = readdirSync(qa)
    .filter((d) => RUN_NAME.test(d))
    .map((d) => ({ d: join(qa, d), t: statSync(join(qa, d)).mtimeMs }))
    .filter((r) => Date.now() - r.t < RECENT_MS)
    .sort((a, b) => b.t - a.t);
  return runs[0]?.d ?? null;
}

const nonEmpty = (f) => existsSync(f) && statSync(f).isFile() && statSync(f).size > 0;
// Si "screenshots" o "regression" es un archivo y no una carpeta, cuenta como faltante (no falla abierto).
function hasFile(dir, re) {
  try {
    return statSync(dir).isDirectory() && readdirSync(dir).some((f) => re.test(f));
  } catch {
    return false;
  }
}

export function missingDeliverables(run) {
  if (!run) return ['carpeta de la corrida (.harness/qa/<AAAAMMDD-...>/)'];
  const missing = ['charter.md', 'map.md', 'ledger.md'].filter((f) => !nonEmpty(join(run, f)));
  if (!hasFile(join(run, 'screenshots'), /\.(png|jpe?g|webp)$/i)) missing.push('screenshots/ (al menos una captura)');
  if (!hasFile(join(run, 'regression'), /\.spec\.(ts|js|mjs)$/)) missing.push('regression/*.spec.ts (al menos un spec)');
  return missing;
}

function declaredIncomplete(run, message) {
  if (INCOMPLETE.test(message ?? '')) return true;
  const report = run && join(run, 'report.md');
  return Boolean(report && nonEmpty(report) && INCOMPLETE.test(readFileSync(report, 'utf8')));
}

try {
  const input = await readStdinJson();
  if (isExplorer(input.agent_type)) {
    const cwd = input.cwd || process.cwd();
    const run = findRun(cwd, input.last_assistant_message);
    const missing = missingDeliverables(run);
    // Un marcador de una parada anterior queda obsoleto si los entregables ya están completos.
    if (!missing.length && run && existsSync(join(run, 'HARNESS-INCOMPLETO.txt'))) rmSync(join(run, 'HARNESS-INCOMPLETO.txt'));
    if (missing.length && !declaredIncomplete(run, input.last_assistant_message)) {
      if (!input.stop_hook_active) {
        process.stdout.write(JSON.stringify({
          decision: 'block',
          reason: `[harness] Faltan entregables de la corrida: ${missing.join(', ')}. Completalos con la herramienta Write, o declará en tu respuesta final la línea "Estado: INCOMPLETO" con qué falta y por qué. El informe (report.md) va como texto en tu respuesta final: lo guarda quien coordina. No presentes la auditoría como completa.`,
        }));
      } else {
        if (run) writeFileSync(join(run, 'HARNESS-INCOMPLETO.txt'), `Corrida incompleta (detectado por harness-core al terminar qa-explorer).\nFaltan: ${missing.join(', ')}\n`);
        process.stdout.write(JSON.stringify({ systemMessage: `[harness] qa-explorer terminó con entregables faltantes (${missing.join(', ')}). La auditoría está INCOMPLETA aunque su respuesta diga otra cosa.` }));
      }
    }
  }
} catch (err) {
  process.stderr.write(`harness qa-complete: ${err.message}\n`);
}
