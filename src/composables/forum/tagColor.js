
const COLORS = [
  'var(--genre-pop)',
  'var(--genre-mandopop)',
  'var(--genre-electronic)',
  'var(--genre-hip-hop)',
  'var(--genre-traditional)',
  '#7c4dff',
  '#2bbf2b',
  '#22c1e8',
]

function hashOf(key) {
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}


export const tagColor = (key) => COLORS[hashOf(String(key).toLowerCase()) % COLORS.length]


export const tagStyle = (key) => ({ '--tag': tagColor(key) })
