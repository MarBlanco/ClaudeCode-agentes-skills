#!/usr/bin/env node
// harness-core · SessionStart: anuncia perfil, módulos y gates del proyecto.
// Solo lee archivos locales; no hace red ni modifica nada.
import { isApproved, loadManifest, readStdinJson } from './lib.mjs';

// Capacidades por módulo; se anuncian para que se invoquen antes de diseñar o implementar en esa área.
const CORE_SKILLS = 'product-spec (requisitos), architecture-decisions (arquitectura/ADR), ops-delivery (Docker, CI/CD, entornos, observabilidad), tech-docs, maintenance-upgrades';
const MODULE_SKILLS = {
  web: 'harness-web: qa-explore/agente qa-explorer (QA exploratoria), web-qa, owasp-security, seo',
  saas: 'harness-saas: saas-architecture (tenants, auth, roles, planes), api-design (APIs, webhooks), data-modeling-migrations, supabase-postgres-best-practices',
  payments: 'harness-payments: payments-core, payments-review',
};

try {
  const input = await readStdinJson();
  const manifest = loadManifest(input.cwd || process.cwd());
  if (manifest) {
    const gates = manifest.gates?.length ? manifest.gates.join(', ') : 'según riesgo (ver harness-review)';
    const lines = [
      `[harness ${manifest.harnessVersion ?? '?'}] perfil ${manifest.profile} · módulos: ${(manifest.modules ?? []).join(', ') || 'ninguno'}`,
      `Gates disponibles: ${gates}. Evidencia en .harness/evidence/<tarea>/. Máximo 3 ciclos de corrección.`,
    ];
    const mods = (manifest.modules ?? []).map((m) => MODULE_SKILLS[m]).filter(Boolean);
    lines.push(`Capacidades: harness-core: ${CORE_SKILLS}${mods.length ? `; ${mods.join('; ')}` : ''}. Invocar con la herramienta Skill la que corresponda antes de diseñar o implementar en esa área; para tareas no triviales, harness-plan.`);
    if (manifest.quality?.typecheck?.command) {
      const approved = isApproved(input.cwd || process.cwd(), manifest.quality);
      lines.push(`Typecheck en Stop: ${manifest.quality.typecheck.command}${approved ? '' : ' (NO aprobado: no se ejecuta)'}`);
    }
    process.stdout.write(`${lines.join('\n')}\n`);
  }
} catch (err) {
  process.stderr.write(`harness session-start: ${err.message}\n`);
}
