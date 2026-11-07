// «Modelo justo»: dificultad de un prompt y modelo sugerido, de forma determinista (sin llamar a ningún modelo).
export const MODEL_BY_LEVEL = { simple: 'haiku', media: 'sonnet', compleja: 'opus' }

const SIMPLE_MAX_CHARS = 120
const COMPLEX_MIN_CHARS = 300
// Bordes Unicode: \b de JavaScript no reconoce letras con tilde («probá»).
const SIMPLE_RE =
  /(?<![\p{L}])(funciona|funcion[oó]|anda|est[aá] (activo|cargado|listo|instalado)|se ve|aparece|lo veo|verific|comprueb|prob[aá]|probar|test|ping|hola|gracias|ok|listo|qu[eé] (es|hace|significa)|c[oó]mo se (llama|usa))(?![\p{L}])/iu
const COMPLEX_RE =
  /(?<![\p{L}])(arquitectura|refactor|migra(r|ci[oó]n)|dise[nñ]a(r)?|implementa(r)?|depura(r)?|optimiza(r)?|seguridad|concurrencia|esquema|base de datos|varios archivos|m[uú]ltiples|de punta a punta|end[- ]to[- ]end|planific|an[aá]lisis profundo|race condition)(?![\p{L}])/iu

export function levelOf(text) {
  const t = String(text ?? '')
  if (t.length <= SIMPLE_MAX_CHARS && SIMPLE_RE.test(t) && !COMPLEX_RE.test(t)) return 'simple'
  return t.length >= COMPLEX_MIN_CHARS || COMPLEX_RE.test(t) ? 'compleja' : 'media'
}
