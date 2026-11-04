// Small checks the guided tours use to tell when a part of the page is really ready to be lit up.
// They look at what is on the screen (is it there, has it stopped moving, has the page stopped scrolling),
// never at a timer, so the spotlight is never lit around an empty or moving place, however slow the computer is.
// They are asked once per frame by DiscoverTour, so each one remembers what it saw last frame.

const seen = new Map() // selector -> { rect, still } from the frames before

// the element for a selector (or null)
export function find(selector) {
  return selector ? document.querySelector(selector) : null
}

// Is the element there and has it stayed in the same place (and size) for a few frames in a row?
export function isStill(selector, frames = 4) {
  const element = find(selector)
  if (!element) {
    seen.delete(selector)
    return false
  }
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false
  const before = seen.get(selector)
  const same =
    before &&
    Math.abs(before.rect.left - rect.left) < 0.5 &&
    Math.abs(before.rect.top - rect.top) < 0.5 &&
    Math.abs(before.rect.width - rect.width) < 0.5 &&
    Math.abs(before.rect.height - rect.height) < 0.5
  const still = same ? before.still + 1 : 0
  seen.set(selector, { rect, still })
  return still >= frames
}

// Has the element (and everything inside it) finished its entrance animations and transitions?
// (Animations that repeat forever, like a pulse, do not count.)
export function hasSettled(selector) {
  const element = find(selector)
  if (!element) return false
  return element
    .getAnimations({ subtree: true })
    .filter((animation) => animation.effect && animation.effect.getTiming().iterations !== Infinity)
    .every((animation) => animation.playState !== 'running')
}

// Is the whole element on the screen, below the navbar and above the bottom edge?
export function isOnScreen(selector) {
  const element = find(selector)
  if (!element) return false
  const rect = element.getBoundingClientRect()
  const navbar = document.querySelector('.app-main')?.getBoundingClientRect().top || 0
  return rect.top >= navbar + 8 && rect.bottom <= window.innerHeight - 8
}

// Scroll the page (it scrolls inside .app-main) so the element is on the screen.
// A tall element is shown from its top; a short one in the middle of the screen.
export function bringOnScreen(selector) {
  const element = find(selector)
  if (!element || isOnScreen(selector)) return
  const tall = element.getBoundingClientRect().height > window.innerHeight * 0.6
  element.scrollIntoView({ behavior: 'smooth', block: tall ? 'start' : 'center' })
}

// Has the page stopped scrolling? (true once its position has stayed the same for a few frames)
let lastScroll = null
let stillScroll = 0
export function scrollHasStopped(frames = 4) {
  const main = document.querySelector('.app-main')
  const now = main ? main.scrollTop : 0
  stillScroll = now === lastScroll ? stillScroll + 1 : 0
  lastScroll = now
  return stillScroll >= frames
}

// forget everything seen (when a tour starts)
export function forgetSeen() {
  seen.clear()
  lastScroll = null
  stillScroll = 0
}
