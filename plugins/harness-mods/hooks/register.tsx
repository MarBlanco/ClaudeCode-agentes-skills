import type { Register } from 'claude-code'
import { MODEL_BY_LEVEL, levelOf } from './model-level.mjs'

// «Modelo justo» (m): sugiere o fija Haiku, Sonnet u Opus según la dificultad del prompt escrito.
// Reglas locales (model-level.mjs): no llama a ningún modelo y no gasta tokens.
// La banda compone la de otros plugins con next(e).
export const register: Register = (on) => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const others = await next(e)
    if (e.props.hasSurvey || e.props.isWorking) return others
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        {others}
        <Box borderStyle="round" borderColor="magenta" paddingX={1} gap={1}>
          <Text weight="bold" color="magenta">◆</Text>
          <Button
            key="modelo"
            label="Modelo justo (m)"
            hotkey="m"
            onPress={async () => {
              const { text } = await $.prompt.read()
              const idea = text.trim()
              if (!idea) {
                $.ui.toast('Escribe el prompt primero')
                return
              }
              const level = levelOf(idea)
              const model = MODEL_BY_LEVEL[level as keyof typeof MODEL_BY_LEVEL]
              const rows = await $.config.list()
              if (!rows.some((row) => row['key'] === 'model')) {
                $.ui.toast(`Tarea ${level}: usa /model ${model} (esta versión no deja cambiarlo desde un mod)`)
                return
              }
              const result = await $.config.set({ key: 'model', value: model })
              $.ui.toast('deny' in result ? `Tarea ${level}: usa /model ${model}` : `Tarea ${level}: modelo ${model}`)
            }}
          />
        </Box>
      </Box>
    )
  })
}
