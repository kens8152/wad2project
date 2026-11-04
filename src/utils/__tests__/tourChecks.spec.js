import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { find, isStill, hasSettled, isOnScreen, bringOnScreen, scrollHasStopped, forgetSeen } from '../tourChecks'

function addElement(id, rect, animations = []) {
  const el = document.createElement('div')
  el.id = id
  el.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height })
  el.getAnimations = () => animations
  el.scrollIntoView = (options) => (el.scrolledWith = options)
  document.body.appendChild(el)
  return el
}

const animation = (playState, iterations = 1) => ({ playState, effect: { getTiming: () => ({ iterations }) } })

beforeEach(() => {
  forgetSeen()
  window.innerHeight = 800
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('find', () => {
  it('finds an element by selector', () => {
    const el = addElement('card', { left: 0, top: 0, width: 10, height: 10 })
    expect(find('#card')).toBe(el)
  })

  it('returns null for no selector or a missing element', () => {
    expect(find('')).toBeNull()
    expect(find('#missing')).toBeNull()
  })
})

describe('isStill', () => {
  it('is false when the element is not there', () => {
    expect(isStill('#missing')).toBe(false)
  })

  it('is false for an element with no size', () => {
    addElement('flat', { left: 0, top: 0, width: 0, height: 10 })
    expect(isStill('#flat')).toBe(false)
  })

  it('becomes true once the element has stayed put for the given number of frames', () => {
    addElement('card', { left: 10, top: 10, width: 50, height: 50 })
    const results = [1, 2, 3, 4, 5].map(() => isStill('#card', 4))
    expect(results).toEqual([false, false, false, false, true])
  })

  it('starts counting again when the element moves', () => {
    const el = addElement('card', { left: 10, top: 10, width: 50, height: 50 })
    for (let i = 0; i < 5; i++) isStill('#card', 2)
    el.getBoundingClientRect = () => ({ left: 40, top: 10, width: 50, height: 50 })
    expect(isStill('#card', 2)).toBe(false)
  })

  it('forgetSeen makes it start counting from zero', () => {
    addElement('card', { left: 10, top: 10, width: 50, height: 50 })
    for (let i = 0; i < 5; i++) isStill('#card', 2)
    forgetSeen()
    expect(isStill('#card', 2)).toBe(false)
  })
})

describe('hasSettled', () => {
  it('is false when the element is missing', () => {
    expect(hasSettled('#missing')).toBe(false)
  })

  it('is false while an entrance animation is running', () => {
    addElement('card', { left: 0, top: 0, width: 1, height: 1 }, [animation('running')])
    expect(hasSettled('#card')).toBe(false)
  })

  it('is true once every animation has finished', () => {
    addElement('card', { left: 0, top: 0, width: 1, height: 1 }, [animation('finished')])
    expect(hasSettled('#card')).toBe(true)
  })

  it('ignores animations that repeat forever, like a pulse', () => {
    addElement('card', { left: 0, top: 0, width: 1, height: 1 }, [animation('running', Infinity)])
    expect(hasSettled('#card')).toBe(true)
  })
})

describe('isOnScreen and bringOnScreen', () => {
  beforeEach(() => {
    addElement('main', { left: 0, top: 60, width: 1000, height: 740 }).className = 'app-main'
  })

  it('is true for an element fully between the navbar and the bottom edge', () => {
    addElement('card', { left: 0, top: 100, width: 100, height: 100 })
    expect(isOnScreen('#card')).toBe(true)
  })

  it('is false for an element hidden under the navbar', () => {
    addElement('card', { left: 0, top: 40, width: 100, height: 100 })
    expect(isOnScreen('#card')).toBe(false)
  })

  it('is false for an element below the bottom edge', () => {
    addElement('card', { left: 0, top: 750, width: 100, height: 100 })
    expect(isOnScreen('#card')).toBe(false)
  })

  it('does not scroll an element that is already on screen', () => {
    const el = addElement('card', { left: 0, top: 100, width: 100, height: 100 })
    bringOnScreen('#card')
    expect(el.scrolledWith).toBeUndefined()
  })

  it('scrolls a short element to the middle of the screen', () => {
    const el = addElement('card', { left: 0, top: 900, width: 100, height: 100 })
    bringOnScreen('#card')
    expect(el.scrolledWith).toEqual({ behavior: 'smooth', block: 'center' })
  })

  it('scrolls a tall element so its top shows', () => {
    const el = addElement('card', { left: 0, top: 900, width: 100, height: 700 })
    bringOnScreen('#card')
    expect(el.scrolledWith).toEqual({ behavior: 'smooth', block: 'start' })
  })
})

describe('scrollHasStopped', () => {
  it('becomes true once the page has not scrolled for a few frames', () => {
    const main = addElement('main', { left: 0, top: 0, width: 10, height: 10 })
    main.className = 'app-main'
    main.scrollTop = 0
    const results = [1, 2, 3, 4, 5, 6].map(() => scrollHasStopped(4))
    expect(results.at(-1)).toBe(true)
    expect(results[0]).toBe(false)
  })

  it('goes back to false while the page is scrolling', () => {
    const main = addElement('main', { left: 0, top: 0, width: 10, height: 10 })
    main.className = 'app-main'
    for (let i = 0; i < 6; i++) scrollHasStopped(2)
    main.scrollTop = 200
    expect(scrollHasStopped(2)).toBe(false)
  })
})
