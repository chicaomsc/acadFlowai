import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

const testProcess = globalThis as typeof globalThis & {
  process?: {
    env: Record<string, string | undefined>
  }
}

if (testProcess.process) {
  testProcess.process.env.VITE_API_URL = ''
}

afterEach(() => {
  cleanup()
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

Object.defineProperty(window.HTMLElement.prototype, 'scrollTo', {
  writable: true,
  value: () => {},
})

Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: () => {},
})

Object.defineProperty(window.HTMLElement.prototype, 'hasPointerCapture', {
  writable: true,
  value: () => false,
})

Object.defineProperty(window.HTMLElement.prototype, 'setPointerCapture', {
  writable: true,
  value: () => {},
})

Object.defineProperty(window.HTMLElement.prototype, 'releasePointerCapture', {
  writable: true,
  value: () => {},
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock
