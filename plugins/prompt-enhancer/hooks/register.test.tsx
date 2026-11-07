import { expect, test } from 'claude-code/testing'

const BAND = (props: { hasSurvey: boolean; isWorking: boolean }) =>
  ({
    plugin: 'prompt-enhancer',
    component: 'AbovePrompt',
    props: { ...props, maxRows: 14, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 } },
  }) as const

// Motor simulado: dibujo base, texto del prompt, avisos y llamada al modelo.
function world(on: any, text: string, options: { reply?: (e: any) => any } = {}) {
  const toasts: string[] = []
  const state = { text, filled: null as string | null, model: 0, request: null as any }
  on('ui.render', ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('prompt.read', () => ({ value: { text: state.text } }))
  on('prompt.fill', (_: any, e: any) => {
    state.filled = e.text
    return { isFilled: true }
  })
  on('ui.toast', (_: any, e: any) => {
    toasts.push(String(e.text ?? e.message ?? ''))
    return { value: undefined }
  })
  on('model.complete', (_: any, e: any) => {
    state.model += 1
    state.request = e
    return { value: options.reply?.(e) ?? { isAnswered: true, text: 'Creá un login con validación y criterio de éxito.' } }
  })
  return { toasts, state }
}

test('«Enhance» se muestra siempre (sin depender de que haya borrador), en cada superficie', async ($, on) => {
  world(on, '')
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND({ hasSurvey: false, isWorking: false }), surface })
    expect(await ui.find({ type: 'Button', key: 'enhance' })).toBeTruthy()
    await ui.unmount()
  }
})

test('con un turno en curso no se dibuja el botón', async ($, on) => {
  world(on, '')
  const ui = await $.ui.mount({ ...BAND({ hasSurvey: false, isWorking: true }), surface: 'desktop' })
  expect(await ui.find({ type: 'Button', key: 'enhance' })).toBeFalsy()
  await ui.unmount()
})

test('convierte la idea en un prompt completo con una sola llamada a Haiku', async ($, on) => {
  const { state } = world(on, 'haceme un login')
  const ui = await $.ui.mount({ ...BAND({ hasSurvey: false, isWorking: false }), surface: 'vscode' })
  await ui.press({ key: 'enhance' })

  expect(state.model).toBe(1)
  expect(state.request.model).toBe('haiku')
  expect(state.request.prompt).toBe('haceme un login')
  expect(state.request.maxTokens).toBe(700)
  expect(state.filled).toBe('Creá un login con validación y criterio de éxito.')
  await ui.unmount()
})

test('limpia comillas y bloques de código que el modelo agregue', async ($, on) => {
  const { state } = world(on, 'una landing', { reply: () => ({ isAnswered: true, text: '```\n"Creá una landing responsive."\n```' }) })
  const ui = await $.ui.mount({ ...BAND({ hasSurvey: false, isWorking: false }), surface: 'desktop' })
  await ui.press({ key: 'enhance' })
  expect(state.filled).toBe('Creá una landing responsive.')
  await ui.unmount()
})

test('con el prompt vacío avisa y no llama al modelo', async ($, on) => {
  const { toasts, state } = world(on, '   ')
  const ui = await $.ui.mount({ ...BAND({ hasSurvey: false, isWorking: false }), surface: 'desktop' })
  await ui.press({ key: 'enhance' })
  expect(toasts.some((t) => t.includes('Escribe una idea'))).toBe(true)
  expect(state.model).toBe(0)
  await ui.unmount()
})

test('si el modelo no responde se informa el motivo y el prompt no se modifica', async ($, on) => {
  const { toasts, state } = world(on, 'haceme un login', { reply: () => ({ isAnswered: false, reason: 'api-error' }) })
  const ui = await $.ui.mount({ ...BAND({ hasSurvey: false, isWorking: false }), surface: 'desktop' })
  await ui.press({ key: 'enhance' })
  expect(toasts.some((t) => t.includes('Enhance falló: api-error'))).toBe(true)
  expect(state.filled).toBeNull()
  await ui.unmount()
})
