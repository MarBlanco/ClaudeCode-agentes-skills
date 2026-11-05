// harness-core · política por agente (se aplica desde guard.mjs en PreToolUse).
// El hook recibe agent_type cuando la llamada la hace un subagente. Para qa-explorer:
//  - Bash solo admite `cd ./.harness/qa/<corrida> && playwright-cli ...` (encadenado con &&) con
//    redirecciones de salida a la corrida. Ningún otro comando, pipe, heredoc ni expansión.
//  - Write/Edit solo dentro de <proyecto>/.harness/qa/<AAAAMMDD-...>/ (ruta estructurada, sin shell).
//  - `playwright-cli open` exige la configuración de navegador que genera este hook fuera de la
//    corrida (el agente no puede escribirla): proxy sumidero para todo lo no local, allowedOrigins
//    locales y service workers bloqueados. Así la navegación, los enlaces, los formularios y el
//    JavaScript de `eval` quedan limitados a localhost por la pila de red del navegador.
// No es un sandbox del sistema operativo: es un filtro de comandos más una restricción de red
// del navegador. Los specs que escribe el agente no los ejecuta el agente (ver qa-regression.mjs).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';

const EXPLORER = /^(?:[\w-]+:)?qa-explorer$/;
export const isExplorer = (agentType) => EXPLORER.test(String(agentType ?? ''));

const LOCAL_HOST = /^(localhost|127\.0\.0\.1)$/i;
const RUN_NAME = /^\d{8}-[\w-]+$/;
const SHELL_CHAR = 'carácter de shell no permitido fuera de comillas simples (usar comillas simples, también en URLs con ? o &)';

class Deny extends Error {}

// En Windows, Git Bash escribe las unidades como /f/ruta (= F:\ruta): se traducen antes de resolver.
const msys = (p) => (process.platform === 'win32' && /^\/[a-zA-Z](\/|$)/.test(p) ? `${p[1].toUpperCase()}:${p.slice(2) || '/'}` : p);
const toAbs = (p, cwd) => {
  const q = msys(p);
  return isAbsolute(q) ? resolve(q) : resolve(cwd, q);
};
const slash = (p) => p.replace(/\\/g, '/').toLowerCase();

// Raíz del proyecto: lo anterior a /.harness/qa si el cwd ya está en una corrida; si no, el propio cwd.
function projectRoot(cwd) {
  const norm = resolve(cwd).replace(/\\/g, '/');
  const i = norm.toLowerCase().indexOf('/.harness/qa');
  return i >= 0 ? norm.slice(0, i) : norm;
}

// Resuelve enlaces simbólicos y junctions del tramo existente de la ruta.
function realish(p) {
  const rest = [];
  let cur = p;
  for (;;) {
    try {
      return join(realpathSync.native(cur), ...rest.toReversed());
    } catch {
      const parent = dirname(cur);
      if (parent === cur) return p;
      rest.push(basename(cur));
      cur = parent;
    }
  }
}

// Ruta dentro de <raíz del proyecto>/.harness/qa/<AAAAMMDD-...>/, sin expansiones de shell y
// con enlaces resueltos: un junction dentro de la corrida no la saca de ella.
export function inRun(p, cwd) {
  if (!p || /[$%`*?{}[\]]|^~/.test(p)) return false;
  const base = slash(realish(resolve(projectRoot(cwd), '.harness', 'qa')));
  const abs = slash(realish(toAbs(p, cwd)));
  if (!abs.startsWith(`${base}/`)) return false;
  return RUN_NAME.test(abs.slice(base.length + 1).split('/')[0]);
}

const MODULE_CONFIG = /(^|[\\/])\.playwright([\\/]|$)|(^|[\\/])node_modules([\\/]|$)|(^|[\\/])(package\.json|package-lock\.json|tsconfig[^\\/]*\.json|jsconfig\.json|\.npmrc|\.yarnrc[^\\/]*|playwright\.config\.[cm]?[jt]s|babel\.config\.[cm]?js|\.babelrc|cli\.config[^\\/]*\.json)$/i;

// Escribible por el agente: dentro de la corrida y que no cambie cómo Node/Playwright resuelven módulos o configuración.
const writable = (p, cwd) => !MODULE_CONFIG.test(String(p ?? '')) && inRun(p, cwd);

const allowedHosts = () => String(process.env.HARNESS_QA_ALLOWED_HOSTS ?? '').split(',').map((h) => h.trim().toLowerCase()).filter((h) => /^[a-z0-9.-]+$/.test(h));

// Configuración de navegador del harness (formato de config de playwright-cli / Playwright MCP).
export function browserConfig(hosts = allowedHosts()) {
  const all = ['localhost', '127.0.0.1', ...hosts];
  return {
    browser: {
      // Sin browserName: se usa el navegador por defecto ya instalado del CLI (no se instalan navegadores).
      isolated: true,
      launchOptions: {
        // Proxy sumidero: todo lo que no esté en bypass falla en la pila de red (también WebSocket e IP literales).
        proxy: { server: 'http://127.0.0.1:9', bypass: [...all, '[::1]'].join(',') },
        args: ['--force-webrtc-ip-handling-policy=disable_non_proxied_udp'],
      },
      contextOptions: { serviceWorkers: 'block', acceptDownloads: false },
    },
    network: { allowedOrigins: all.flatMap((h) => [`http://${h}:*`, `https://${h}:*`]) },
    allowUnrestrictedFileAccess: false,
  };
}

const harnessDir = () => process.env.HARNESS_QA_BROWSER_DIR || join(homedir(), '.claude', 'harness');
const sessionsFile = () => join(harnessDir(), 'qa-sessions.json');

function readSessions() {
  try {
    return JSON.parse(readFileSync(sessionsFile(), 'utf8'));
  } catch {
    return {};
  }
}

// Sesiones de navegador abiertas a través de esta política (con la configuración del harness).
// Las demás sesiones del workspace de playwright-cli (las del usuario, sin restricción de red) no se pueden manejar.
function recordSession(name, config) {
  const all = readSessions();
  all[name] = { config, at: new Date().toISOString() };
  mkdirSync(harnessDir(), { recursive: true });
  writeFileSync(`${sessionsFile()}.tmp`, JSON.stringify(all, null, 2));
  renameSync(`${sessionsFile()}.tmp`, sessionsFile());
}

function forgetSession(name) {
  const all = readSessions();
  if (!(name in all)) return;
  delete all[name];
  writeFileSync(`${sessionsFile()}.tmp`, JSON.stringify(all, null, 2));
  renameSync(`${sessionsFile()}.tmp`, sessionsFile());
}

// Escribe la configuración fuera de cualquier corrida (el agente no puede modificarla) y devuelve su ruta.
export function ensureBrowserConfig() {
  const json = `${JSON.stringify(browserConfig(), null, 2)}\n`;
  const dir = harnessDir();
  const file = join(dir, `qa-browser-${createHash('sha256').update(json).digest('hex').slice(0, 12)}.json`);
  if (!existsSync(file) || readFileSync(file, 'utf8') !== json) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${file}.tmp`, json);
    renameSync(`${file}.tmp`, file);
  }
  return file;
}

function urlProblem(raw) {
  if (raw === 'about:blank') return null;
  let u;
  try {
    u = new URL(raw);
  } catch {
    return `URL no válida: ${raw}`;
  }
  if (!/^https?:$/.test(u.protocol)) return `Protocolo no permitido: ${u.protocol}`;
  if (LOCAL_HOST.test(u.hostname) || allowedHosts().includes(u.hostname.toLowerCase())) return null;
  return `Host no permitido: ${u.hostname}. Solo localhost/127.0.0.1; para staging definir HARNESS_QA_ALLOWED_HOSTS en el entorno del usuario.`;
}

// Separa el comando en segmentos {tokens, redirects, sep}: un solo recorrido, consciente de comillas.
// Gramática mínima: palabras, comillas, && y redirecciones de salida. Todo lo demás se deniega.
function parse(cmd) {
  if (/[\r\n]/.test(cmd)) throw new Deny('una sola línea por llamada (sin saltos de línea ni heredocs; usar la herramienta Write)');
  const segs = [];
  let tokens = [];
  let redirects = [];
  let cur = '';
  let has = false;
  let q = null;
  let redir = null;
  const flush = () => {
    if (!cur && !has) return;
    if (redir) { redirects.push({ op: redir, target: cur }); redir = null; } else tokens.push(cur);
    cur = '';
    has = false;
  };
  const endSeg = (sep) => {
    flush();
    if (redir) throw new Deny('redirección sin destino');
    if (tokens.length || redirects.length) segs.push({ tokens, redirects, sep });
    tokens = [];
    redirects = [];
  };
  const startRedirect = (op) => {
    if (/^\d+$/.test(cur) && !has) cur = '';
    flush();
    if (redir) throw new Deny('redirecciones consecutivas');
    redir = op;
  };
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    const nx = cmd[i + 1];
    if (q === "'") {
      if (ch === "'") q = null;
      else cur += ch;
      continue;
    }
    if (q === '"') {
      if (ch === '"') q = null;
      else if (/[$`\\]/.test(ch)) throw new Deny(SHELL_CHAR);
      else cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      q = ch;
      has = true;
      continue;
    }
    if (ch === ' ' || ch === '\t') { flush(); continue; }
    // Bash solo separa con espacio y tabulador: cualquier otro espacio o control desincronizaría el análisis.
    if (/[\s\u0000-\u001f\u007f]/.test(ch)) throw new Deny('espacio o carácter de control no permitido fuera de comillas');
    if (/[$`\\(){}*?[\]#;|<!]/.test(ch)) throw new Deny(SHELL_CHAR);
    // "~" solo se expande al inicio de una palabra o tras "=" / ":" (rutas cortas de Windows como MUAWAL~1 son literales).
    if (ch === '~' && (!cur || /[=:]$/.test(cur)) && !has) throw new Deny('"~" (directorio personal) no permitido');
    if (ch === '&') {
      if (nx === '&') { i++; endSeg('&&'); continue; }
      if (nx !== '>') throw new Deny('"&" (segundo plano) no permitido');
      i++;
      const append = cmd[i + 1] === '>';
      if (append) i++;
      startRedirect(append ? '>>' : '>');
      continue;
    }
    if (ch === '>') {
      if (nx === '&') {
        // ">&N" y ">&-" duplican o cierran descriptores; ">&archivo" redirige a un archivo.
        let j = i + 2;
        while (/[\d-]/.test(cmd[j] ?? '')) j++;
        if (j > i + 2 && (j >= cmd.length || /[ \t&]/.test(cmd[j]))) {
          i = j - 1;
          if (/^\d+$/.test(cur) && !has) cur = '';
        } else {
          i++;
          startRedirect('>');
        }
        continue;
      }
      const append = nx === '>';
      if (append) i++;
      startRedirect(append ? '>>' : '>');
      continue;
    }
    cur += ch;
  }
  if (q) throw new Deny('comillas sin cerrar');
  endSeg('');
  return segs;
}

// playwright-cli: solo estos subcomandos y estos flags.
const CLI_ALLOW = new Set(['open', 'goto', 'snapshot', 'find', 'click', 'dblclick', 'fill', 'type', 'press', 'hover', 'select', 'check', 'uncheck', 'drag', 'eval', 'screenshot', 'console', 'requests', 'request', 'request-headers', 'request-body', 'response-headers', 'response-body', 'resize', 'reload', 'go-back', 'go-forward', 'tab-list', 'tab-new', 'tab-close', 'tab-select', 'close', 'list', 'dialog-accept', 'dialog-dismiss', 'upload', 'set-color-scheme', 'set-reduced-motion', 'clear-color-scheme', 'clear-reduced-motion', 'generate-locator', 'highlight', 'keydown', 'keyup', 'mousemove', 'mousedown', 'mouseup', 'mousewheel']);
const CLI_FLAG = /^(--(full-page|hires|static|submit|clear|headed|mobile|boxes|raw|json|hide|regex)|--device=[\w-]+|--(filter|type)=[^\s]+|--(depth|idle-timeout)=\d+)$/;
const CLI_URL = new Set(['open', 'goto', 'tab-new']);
const ALLOWED = 'Bash solo admite `cd ./.harness/qa/<corrida> && playwright-cli -s=<sesión> <subcomando> ...` (encadenado con &&) y redirecciones de salida a la corrida; los archivos se escriben con la herramienta Write dentro de la corrida';

function checkCd(tokens, index, sep, st) {
  if (index !== 0 || sep !== '&&') return 'cd solo como primer comando, seguido de &&';
  if (tokens.length !== 2) return 'cd admite un único directorio';
  const dir = tokens[1];
  // "cd -", "cd --", "cd -P" van a $OLDPWD o $HOME; una ruta relativa sin "./" puede resolverse por CDPATH.
  if (dir.startsWith('-')) return `cd con opciones no permitido: ${dir}`;
  if (!dir.startsWith('./') && !isAbsolute(msys(dir))) return `cd exige "./" o una ruta absoluta (evita CDPATH): cd ./${dir}`;
  if (!inRun(dir, st.cwd)) return `cd solo a .harness/qa/<corrida>/: ${dir}`;
  const abs = toAbs(dir, st.cwd);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return `cd a un directorio inexistente: ${dir} (crear la carpeta escribiendo un archivo con Write)`;
  st.cwd = abs;
  return null;
}

function checkCli(t, st) {
  if (!inRun(st.cwd, st.cwd)) return 'Ejecutar playwright-cli desde la carpeta de la corrida: cd ./.harness/qa/<corrida> && playwright-cli -s=<sesión> ...';
  // Antes del subcomando solo -s=<sesión> (obligatorio) y los flags globales de salida --raw/--json.
  // Exactamente un "-s=<nombre>": playwright-cli da prioridad a -s sobre --session, así que no se admite --session ni repetirlo.
  if (t.filter((a) => /^(-s|--session)\b|^-s/.test(a)).length !== 1 || t.some((a) => a.startsWith('--session'))) {
    return 'playwright-cli exige exactamente un -s=<sesión> (sin --session).';
  }
  let k = 1;
  let session = null;
  for (;;) {
    const m = /^(?:-s=([\w-]+)|--raw|--json)$/.exec(t[k] ?? '');
    if (!m) break;
    if (m[1]) session = m[1];
    k++;
  }
  if (!session) return 'playwright-cli exige -s=<sesión> antes del subcomando (una sesión propia de la corrida, p. ej. -s=qa-<corrida>).';
  const sub = t[k];
  if (!sub || sub.startsWith('-')) return 'playwright-cli: solo se admite -s=<sesión> antes del subcomando.';
  if (!CLI_ALLOW.has(sub)) return `playwright-cli ${sub} no permitido para qa-explorer.`;
  const args = t.slice(k + 1);
  let config = null;
  const isFlag = (x) => x.startsWith('-') && !/^-\d+(\.\d+)?$/.test(x); // "-2" es un valor (fill, mousewheel)
  for (const a of args.filter(isFlag)) {
    if (a.startsWith('--filename=')) {
      if (!writable(a.slice(11), st.cwd)) return `--filename debe apuntar dentro de .harness/qa/<corrida>/: ${a}`;
    } else if (a.startsWith('--config=') && sub === 'open') {
      config = a.slice(9);
    } else if (!CLI_FLAG.test(a)) {
      return `playwright-cli: opción no permitida: ${a}`;
    }
  }
  if (sub === 'open') {
    // Una config global de playwright-cli se fusiona con la nuestra y podría reintroducir cdpEndpoint, initScript, etc.
    if (existsSync(join(homedir(), '.playwright', 'cli.config.json'))) return 'Existe ~/.playwright/cli.config.json: se fusionaría con la configuración del harness. Quitarla antes de usar qa-explorer.';
    for (let d = resolve(st.cwd), root = resolve(projectRoot(st.cwd)); ; d = dirname(d)) {
      if (existsSync(join(d, '.playwright', 'cli.config.json'))) return `Existe ${join(d, '.playwright', 'cli.config.json')}: se fusionaría con la configuración del harness. Quitarla antes de usar qa-explorer.`;
      if (d === root || dirname(d) === d) break;
    }
    const required = ensureBrowserConfig();
    if (!config || slash(toAbs(config, st.cwd)) !== slash(required)) {
      return `playwright-cli open exige la configuración de navegador del harness (red limitada a localhost): agregar --config='${required.replace(/\\/g, '/')}'`;
    }
    recordSession(session, required);
  } else if (sub !== 'list' && readSessions()[session]?.config !== ensureBrowserConfig()) {
    return `La sesión "${session}" no fue abierta con la configuración del harness: abrirla con playwright-cli -s=${session} open --config=...`;
  }
  if (sub === 'close') forgetSession(session);
  const pos = args.filter((a) => !isFlag(a));
  if (CLI_URL.has(sub)) for (const u of pos) { const bad = urlProblem(u); if (bad) return bad; }
  if (sub === 'upload' && pos.some((p) => !inRun(p, st.cwd))) return 'upload: solo archivos dentro de la corrida';
  return null;
}

function checkSegment(seg, index, st) {
  for (const r of seg.redirects) {
    if (/^(\/dev\/null|nul)$/i.test(r.target)) continue;
    if (!writable(r.target, st.cwd)) return `Redirección fuera de .harness/qa/<corrida>/: ${r.target}`;
  }
  const t = seg.tokens;
  if (!t.length) return null;
  if (t[0] === 'cd') return checkCd(t, index, seg.sep, st);
  if (t[0] === 'playwright-cli') return checkCli(t, st);
  return `Comando no permitido para qa-explorer: ${t[0]}. ${ALLOWED}.`;
}


export function evaluateExplorer(tool, ti, cwd) {
  if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
    const p = ti.file_path ?? ti.notebook_path ?? ti.path;
    // Archivos que cambian cómo Node/Playwright resuelven módulos: nunca, ni dentro de la corrida.
    if (MODULE_CONFIG.test(String(p ?? ''))) {
      return ['deny', `qa-explorer no puede escribir configuración de módulos o de Playwright: ${p}`];
    }
    return writable(p, cwd) ? null : ['deny', `qa-explorer solo escribe dentro de .harness/qa/<AAAAMMDD-...>/: ${p ?? '(sin ruta)'}`];
  }
  if (tool !== 'Bash') return null;
  try {
    const st = { cwd: resolve(cwd) };
    const segs = parse(String(ti.command ?? ''));
    for (const [i, seg] of segs.entries()) {
      if (seg.sep && seg.sep !== '&&') return ['deny', `qa-explorer: separador no permitido. ${ALLOWED}.`];
      const why = checkSegment(seg, i, st);
      if (why) return ['deny', `qa-explorer: ${why}`];
    }
    return null;
  } catch (err) {
    // Fail-closed para este agente: ante un error interno no se deja pasar el comando.
    const msg = err instanceof Deny ? err.message : `error interno de la política (${err.message})`;
    return ['deny', `qa-explorer: ${msg}`];
  }
}
