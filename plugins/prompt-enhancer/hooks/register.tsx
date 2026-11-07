import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// Prompt Enhancer: escribís tu idea en pocas palabras, pulsás «Enhance» y se convierte en un prompt completo.
// Una sola llamada a un modelo barato (Haiku, esfuerzo bajo, respuesta acotada). Mod propio creado en el proyecto
// del generador de cursos (allí se llamaba prompt-enhancer, después se renombró a prompt). La banda se dibuja siempre
// que no haya un turno en curso, sin depender de eventos de edición, y compone la de otros mods con next(e).
const isBusy = atom({ plugin: 'prompt-enhancer', key: 'isBusy' } as const, false)

// Breve a propósito: se paga en cada ejecución. Modelo fijo y barato (haiku), nunca Opus.
const SYSTEM =
  'Convierte la idea en un prompt completo para un asistente de programación. ' +
  'Mismo idioma; conserva toda intención y restricción; agrega objetivo, contexto, requisitos concretos y criterio de éxito; ' +
  'no inventes datos, archivos ni tecnologías. Responde solo el prompt, sin saludos, explicaciones, comillas ni bloques de código.'

// Respaldo por si el modelo envuelve igualmente la salida.
const clean = (s: string): string =>
  s
    .trim()
    .replace(/^```[a-z]*\n?([\s\S]*?)\n?```$/i, '$1')
    .replace(/^(["'«“])([\s\S]*)(["'»”])$/, '$2')
    .trim()

export const register: Register = (on) => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const others = await next(e)
    if (e.props.hasSurvey || e.props.isWorking) return others
    const busy = await read($, isBusy)
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        {others}
        <Box borderStyle="round" borderColor="cyan" paddingX={1} gap={1}>
          <Text weight="bold" color="cyan">✦</Text>
          {busy ? (
            <Text dimColor>Enhancing…</Text>
          ) : (
            <Button
              key="enhance"
              label="Enhance (e)"
              hotkey="e"
              onPress={async () => {
                const { text } = await $.prompt.read()
                const idea = text.trim()
                if (!idea) {
                  $.ui.toast('Escribe una idea primero')
                  return
                }
                await update($, isBusy, () => true)
                try {
                  const r = await $.model.complete({
                    model: 'haiku',
                    system: SYSTEM,
                    prompt: idea,
                    effort: 'low',
                    maxTokens: 700,
                    timeoutMs: 30000,
                  })
                  if (r.isAnswered) {
                    await $.prompt.fill({ text: clean(r.text), mode: 'replace' })
                  } else {
                    $.ui.toast(`Enhance falló: ${r.reason}`)
                  }
                } finally {
                  await update($, isBusy, () => false)
                }
              }}
            />
          )}
        </Box>
      </Box>
    )
  })
}
