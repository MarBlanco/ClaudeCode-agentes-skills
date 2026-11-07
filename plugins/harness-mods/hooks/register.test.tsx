import { expect, test } from 'claude-code/testing'

// Banda sobre el prompt (propiedades mínimas que usa el mod).
const BAND = (props: { hasSurvey: boolean; isWorking: boolean }) =>
  ({
    plugin: 'harness-mods',
    component: 'AbovePrompt',
    props: { ...props, maxRows: 14, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 } },
  }) as const

// Motor simulado: dibujo base, texto del prompt, configuración sin la clave «model» y registro de avisos.
function world(on: any, text: string) {
  const toasts: string[] = []
  const state = { text }
  on('ui.render', ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('prompt.read', () => ({ value: { text: state.text } }))
  on('config.list', () => ({ value: [] }))
  on('ui.toast', (_: any, e: any) => {
    toasts.push(String(e.text ?? e.message ?? ''))
    return { value: undefined }
  })
  return { toasts, state }
}

test('la banda muestra «Modelo justo» en cada superficie', async ($, on) => {
  world(on, '')
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND({ hasSurvey: false, isWorking: false }), surface })
    expect(await ui.find({ type: 'Button', key: 'modelo' })).toBeTruthy()
    await ui.unmount()
  }
})

test('con un turno en curso no se dibuja el botón', async ($, on) => {
  world(on, '')
  const ui = await $.ui.mount({ ...BAND({ hasSurvey: false, isWorking: true }), surface: 'desktop' })
  expect(await ui.find({ type: 'Button', key: 'modelo' })).toBeFalsy()
  await ui.unmount()
})

test('sin poder fijar el modelo, sugiere el /model según la dificultad (sin llamar a ningún modelo)', async ($, on) => {
  const { toasts, state } = world(on, '')
  for (const [prompt, model] of [
    ['probá si funciona', 'haiku'],
    ['agregá un campo al formulario de contacto', 'sonnet'],
    ['diseñá la arquitectura del sistema de pagos', 'opus'],
  ] as const) {
    state.text = prompt
    toasts.length = 0
    const ui = await $.ui.mount({ ...BAND({ hasSurvey: false, isWorking: false }), surface: 'desktop' })
    await ui.press({ key: 'modelo' })
    expect(toasts.some((t) => t.includes(`/model ${model}`))).toBe(true)
    await ui.unmount()
  }
})

test('con el prompt vacío pide escribirlo', async ($, on) => {
  const { toasts } = world(on, '   ')
  const ui = await $.ui.mount({ ...BAND({ hasSurvey: false, isWorking: false }), surface: 'desktop' })
  await ui.press({ key: 'modelo' })
  expect(toasts.some((t) => t.includes('Escribe el prompt'))).toBe(true)
  await ui.unmount()
})
