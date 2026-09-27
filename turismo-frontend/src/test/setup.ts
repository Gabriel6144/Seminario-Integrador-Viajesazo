import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from './server'

/**
 * Polyfills que Radix necesita para abrir un `<Select>` en jsdom.
 *
 * El `Select` de Radix llama a `hasPointerCapture`, `setPointerCapture` y `scrollIntoView` al
 * abrir el popover, y jsdom no implementa ninguno: sin esto, hacer click en el trigger revienta
 * con un TypeError en vez de abrir la lista de opciones. Es un problema conocido de Radix +
 * Testing Library, no un bug del componente.
 */
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

/**
 * Ciclo de vida de MSW.
 *
 * `onUnhandledRequest: 'error'` es lo importante: si un test dispara una request que no tiene
 * handler, MSW falla el test en vez de dejar que salga a la red. Sin eso, un endpoint mal escrito
 * pasa los tests en silencio contra la red y el error aparece en otro lado.
 */
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// Los handlers se resetean entre tests para que uno no vea lo que dejó el anterior.
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// 0 para que los tests no queden esperando timers de MSW al terminar.
afterAll(() => server.close())
