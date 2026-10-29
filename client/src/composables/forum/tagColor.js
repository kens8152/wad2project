const COLORS = [
  '--bs-primary',
  '--bs-success',
  '--bs-danger',
  '--bs-purple',
  '--bs-pink',
  '--bs-teal',
  '--bs-indigo',
]

function hashOf(key) {
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}


export const tagColor = (key) => `var(${COLORS[hashOf(key) % COLORS.length]})`