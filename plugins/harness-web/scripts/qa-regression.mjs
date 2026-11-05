#!/usr/bin/env node
// Ejecuta los specs de regresión de una corrida de qa-explorer con una configuración confiable.
//   node qa-regression.mjs <carpeta de la corrida> --base-url <url local> [--runner <dir>] [--times 2]
// - Revisión estática: solo `import ... from '@playwright/test'` y sin APIs de Node (require, process,
//   eval, Function, constructor...). Si algo no pasa, no se ejecuta nada.
// - Configuración propia: ignora la del agente (sin webServer, globalSetup ni reporters arbitrarios),
//   un worker, sin reintentos, trazas apagadas y proxy sumidero para el navegador y `request`.
// - Corre N veces y compara el resultado de cada test (reproducibilidad).
// No es un sandbox: el código de los specs corre con los permisos del usuario. La revisión estática es un
// filtro de errores evidentes, NO un control de seguridad (una revisión adversarial la esquivó con
// metaprogramación). El único control real es que una persona lea los specs: por eso exige --reviewed.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Uso: node qa-regression.mjs <corrida> --base-url <url local> --reviewed [--runner <dir>] [--times 2]
const LOCAL = /^(localhost|127\.0\.0\.1)$/i;
const FORBIDDEN = [
  [/\b(require|process|globalThis|global|Function|eval|constructor|__proto__|prototype|Buffer|module|exports|Deno|Bun|Worker|WebAssembly|Reflect|Proxy)\b/, 'API de Node o metaprogramación'],
  [/\bimport\s*\(/, 'import dinámico'],
  [/\\[ux]/i, 'secuencia de escape \\u o \\x (puede ocultar identificadores)'],
  [/[\w)\]]\s*\[\s*(?!\d+\s*\]|\])/, 'acceso a propiedad computado (solo se admiten índices numéricos)'],
  [/\btest\s*\.\s*(use|extend)\b/, 'test.use/test.extend (pueden cambiar cómo se lanza el navegador)'],
  [/\b(launchOptions|executablePath|ignoreDefaultArgs|args|proxy|channel|connectOptions|contextOptions|storageState|userDataDir|env)\b/, 'opción de lanzamiento o de contexto'],
  [/\b(playwright|chromium|firefox|webkit|electron|_android|_electron)\s*\./, 'acceso directo a los lanzadores de Playwright'],
  [/CDPSession|\bconnect(OverCDP)?\s*\(/, 'conexión de bajo nivel'],
  [/\.attach\s*\(/, 'testInfo.attach (puede leer archivos locales)'],
  [/\.(addInitScript|exposeFunction|exposeBinding|route|routeFromHAR|setExtraHTTPHeaders|context\(\)\.(newCDPSession|tracing))\b/, 'API de Playwright que altera el contexto'],
  [/\b(newCDPSession|_?launchServer|connectOverCDP)\b/, 'API de bajo nivel del navegador'],
  [/prototype|\b(getOwnPropertyDescriptors?|getOwnPropertyNames|defineProperty|getBuiltinModule|Symbol)\b/i, 'metaprogramación'],
  [/\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b/, 'red desde Node (no pasa por el proxy del navegador)'],
  [/['"`]\s*\+|\+\s*['"`]/, 'concatenación de cadenas (puede ocultar identificadores)'],
];

// Lista recursiva de regression/, sin la salida del runner.
function listFiles(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (p !== join(base, 'test-results')) out.push(...listFiles(p, base));
    } else {
      out.push(relative(base, p).replaceAll('\\', '/'));
    }
  }
  return out;
}

export function scanSpec(text) {
  const problems = [];
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  for (const m of code.matchAll(/^\s*import\b[^;]*?from\s*['"]([^'"]+)['"]/gm)) {
    if (m[1] !== '@playwright/test') problems.push(`import no permitido: ${m[1]}`);
  }
  if (/^\s*import\s+['"]/m.test(code)) problems.push('import con efectos laterales');
  if (/^\s*export\s/m.test(code)) problems.push('export no permitido en un spec');
  for (const [re, why] of FORBIDDEN) {
    const hit = code.match(re);
    if (hit) problems.push(`${why}: ${hit[0].trim()}`);
  }
  return problems;
}

// workDir: copia limpia de los specs revisados (sin node_modules, tsconfig ni nada de la corrida en sus padres).
export function runnerConfig(runDir, baseURL, attempt, specs = [], workDir = join(runDir, 'regression')) {
  return {
    testDir: workDir,
    // Lista explícita de los specs revisados (no un glob que también tome archivos no revisados).
    testMatch: specs.map((f) => join(workDir, f).replaceAll('\\', '/')),
    outputDir: join(runDir, 'regression', 'test-results'),
    workers: 1,
    retries: 0,
    timeout: 30000,
    reporter: [['list'], ['json', { outputFile: join(runDir, 'logs', `regression-run${attempt}.json`) }]],
    use: {
      baseURL,
      trace: 'off',
      screenshot: 'only-on-failure',
      proxy: { server: 'http://127.0.0.1:9', bypass: 'localhost,127.0.0.1,[::1]' },
      serviceWorkers: 'block',
    },
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  };
}

// La config es un objeto plano: se escribe como módulo ESM sin imports.
const configModule = (c) => `export default ${JSON.stringify(c, null, 2)};\n`;

function findRunner(project, explicit) {
  const candidates = [explicit, project, process.env.HARNESS_QA_RUNNER, join(homedir(), '.claude', 'harness', 'qa-runner')].filter(Boolean);
  // Un runner dentro de .harness/qa lo habría podido escribir el agente: nunca es confiable.
  return candidates.map((c) => resolve(c)).filter((c) => !/[\/].harness[\/]qa([\/]|$)/.test(c)).find((c) => existsSync(join(c, 'node_modules', '@playwright', 'test', 'cli.js')));
}

export function summarize(results) {
  const status = (r) => {
    const map = {};
    const walk = (s) => {
      for (const sp of s.specs ?? []) map[`${sp.file} › ${sp.title}`] = sp.tests?.[0]?.results?.[0]?.status ?? 'unknown';
      for (const c of s.suites ?? []) walk(c);
    };
    for (const s of r.suites ?? []) walk(s);
    return map;
  };
  const maps = results.map(status);
  const names = [...new Set(maps.flatMap((m) => Object.keys(m)))].sort();
  const rows = names.map((n) => ({ test: n, runs: maps.map((m) => m[n] ?? 'missing') }));
  return { rows, reproducible: rows.every((r) => r.runs.every((s) => s === r.runs[0])) };
}

function parseArgs(argv) {
  const a = { times: 2 };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base-url') a.baseURL = argv[++i];
    else if (argv[i] === '--runner') a.runner = argv[++i];
    else if (argv[i] === '--times') a.times = Number(argv[++i]);
    else if (argv[i] === '--reviewed') a.reviewed = true;
    else rest.push(argv[i]);
  }
  a.run = rest[0];
  return a;
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.run || !a.baseURL) {
    console.error('Uso: node qa-regression.mjs <carpeta de la corrida> --base-url <url local> [--runner <dir>] [--times 2]');
    return 1;
  }
  const runDir = resolve(a.run);
  const u = new URL(a.baseURL);
  const extra = String(process.env.HARNESS_QA_ALLOWED_HOSTS ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (!LOCAL.test(u.hostname) && !extra.includes(u.hostname.toLowerCase())) {
    console.error(`BLOCKED: base URL no local: ${u.hostname}`);
    return 2;
  }
  const regDir = join(runDir, 'regression');
  const files = existsSync(regDir) ? listFiles(regDir) : [];
  // Solo specs: un tsconfig (paths), package.json o módulo auxiliar podría cambiar qué código se carga sin pasar por la revisión.
  const notSpecs = files.filter((f) => !/\.spec\.(ts|js|mjs)$/.test(f) && !/\.(md|txt)$/i.test(f));
  if (notSpecs.length) {
    console.error(`BLOCKED: regression/ solo puede contener specs; sobran: ${notSpecs.join(', ')}`);
    return 2;
  }
  const specs = files;
  if (!specs.length) {
    console.error('NOT_CONFIGURED: la corrida no tiene specs de regresión');
    return 2;
  }
  const problems = specs.flatMap((f) => scanSpec(readFileSync(join(regDir, f), 'utf8')).map((p) => `${f}: ${p}`));
  mkdirSync(join(runDir, 'logs'), { recursive: true });
  if (problems.length) {
    writeFileSync(join(runDir, 'logs', 'regression-blocked.txt'), `${problems.join('\n')}\n`);
    console.error(`BLOCKED: revisión estática de specs\n${problems.join('\n')}`);
    return 2;
  }
  if (!a.reviewed) {
    console.error(`REVISAR PRIMERO: los specs los escribió un agente y se ejecutan con los permisos del usuario (no hay sandbox). Leerlos y volver a ejecutar con --reviewed.\n${specs.map((f) => `  ${join(regDir, f)}`).join('\n')}`);
    return 2;
  }
  const runner = findRunner(process.cwd(), a.runner);
  if (!runner) {
    console.error('NOT_CONFIGURED: no se encontró @playwright/test (proyecto, --runner, HARNESS_QA_RUNNER o runner compartido)');
    return 2;
  }
  // Copia limpia: el agente pudo dejar node_modules, tsconfig o package.json en la corrida o sus subcarpetas,
  // y Node/Playwright los resolverían desde la ubicación de los specs. Se ejecuta desde un temporal nuevo.
  const work = mkdtempSync(join(tmpdir(), 'harness-qa-regression-'));
  for (const f of specs) {
    mkdirSync(dirname(join(work, f)), { recursive: true });
    copyFileSync(join(regDir, f), join(work, f));
  }
  // tsconfig propio y vacío: es el más cercano a los specs, así ninguno de un directorio padre aporta "paths".
  writeFileSync(join(work, 'tsconfig.json'), '{}\n');
  const results = [];
  for (let n = 1; n <= a.times; n++) {
    const cfgFile = join(tmpdir(), `harness-qa-regression-${process.pid}-${n}.config.mjs`);
    writeFileSync(cfgFile, configModule(runnerConfig(runDir, a.baseURL, n, specs, work)));
    const r = spawnSync(process.execPath, [join(runner, 'node_modules', '@playwright', 'test', 'cli.js'), 'test', '-c', cfgFile], {
      cwd: work,
      encoding: 'utf8',
      timeout: 15 * 60 * 1000,
      env: { ...process.env, NODE_PATH: join(runner, 'node_modules'), PW_TEST_HTML_REPORT_OPEN: 'never' },
    });
    writeFileSync(join(runDir, 'logs', `regression-run${n}.txt`), `${r.stdout ?? ''}${r.stderr ?? ''}`);
    const jsonFile = join(runDir, 'logs', `regression-run${n}.json`);
    results.push(existsSync(jsonFile) ? JSON.parse(readFileSync(jsonFile, 'utf8')) : { suites: [] });
  }
  const s = summarize(results);
  const md = [
    `# Regresión · ${new Date().toISOString()}`,
    `Runner: ${runner} · base URL: ${a.baseURL} · corridas: ${a.times} · reproducible: ${s.reproducible ? 'sí' : 'NO'}`,
    '',
    `| Test | ${results.map((_, i) => `Corrida ${i + 1}`).join(' | ')} |`,
    `|---|${results.map(() => '---').join('|')}|`,
    ...s.rows.map((r) => `| ${r.test} | ${r.runs.join(' | ')} |`),
  ].join('\n');
  writeFileSync(join(runDir, 'logs', 'regression-summary.md'), `${md}\n`);
  console.log(md);
  return s.reproducible && s.rows.length ? 0 : 3;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) process.exitCode = main();
