import { vi } from 'vitest'

if (!window.matchMedia) {
  window.matchMedia = vi.fn((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

if (typeof window.HTMLMediaElement !== 'undefined') {
  window.HTMLMediaElement.prototype.play = function play() {
    Object.defineProperty(this, 'paused', { value: false, configurable: true })
    this.dispatchEvent(new Event('play'))
    return Promise.resolve()
  }
  window.HTMLMediaElement.prototype.pause = function pause() {
    Object.defineProperty(this, 'paused', { value: true, configurable: true })
    this.dispatchEvent(new Event('pause'))
  }
}
