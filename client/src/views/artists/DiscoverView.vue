<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEventsStore } from '@/stores/events'
import { buildArtists } from '@/utils/artists/artists'
import RecommendedSongs from '@/components/artists/RecommendedSongs.vue'

const router = useRouter()
const eventsStore = useEventsStore()

// ── Data ──────────────────────────────────────────────────────────────────────

const allArtists = computed(() => buildArtists(eventsStore.events))

const genres = computed(() => {
  const seen = {}
  for (const a of allArtists.value) {
    if (!seen[a.genre.id]) {
      seen[a.genre.id] = { id: a.genre.id, name: a.genre.name, color: a.genre.color }
    }
  }
  return Object.values(seen)
})

const activeGenres = ref([])

const visibleArtists = computed(() => {
  if (activeGenres.value.length === 0) return allArtists.value
  return allArtists.value.filter(a => activeGenres.value.includes(a.genre.id))
})

// ── Stars background ──────────────────────────────────────────────────────────

const starsCanvasRef = ref(null)
let starsAnimFrame = null

function initStars() {
  const canvas = starsCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight

  const starCount = 150
  const stars = []
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
    })
  }

  const mouse = { x: null, y: null }
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect()
    mouse.x = e.clientX - rect.left
    mouse.y = e.clientY - rect.top
  })
  canvas.addEventListener('mouseleave', () => { mouse.x = mouse.y = null })

  function animateStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
    grad.addColorStop(0, '#02021e')
    grad.addColorStop(1, '#08104d')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // draw stars
    ctx.fillStyle = 'white'
    for (const s of stars) {
      s.x += s.vx
      s.y += s.vy
      if (s.x < 0) s.x += canvas.width
      if (s.x > canvas.width) s.x -= canvas.width
      if (s.y < 0) s.y += canvas.height
      if (s.y > canvas.height) s.y -= canvas.height
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }

    // lines between nearby stars
    ctx.lineWidth = 0.5
    for (let i = 0; i < starCount; i++) {
      for (let j = i + 1; j < starCount; j++) {
        const a = stars[i], b = stars[j]
        const dx = a.x - b.x, dy = a.y - b.y
        const distSq = dx * dx + dy * dy
        const threshold = 100 * 100
        if (distSq < threshold) {
          const alpha = 1 - distSq / threshold
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.3})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
    }

    // lines to mouse cursor
    if (mouse.x !== null) {
      for (const s of stars) {
        const dx = s.x - mouse.x, dy = s.y - mouse.y
        const distSq = dx * dx + dy * dy
        const threshold = 120 * 120
        if (distSq < threshold) {
          const alpha = 1 - distSq / threshold
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.6})`
          ctx.beginPath()
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.stroke()
        }
      }
    }

    starsAnimFrame = requestAnimationFrame(animateStars)
  }

  animateStars()
}

function resizeStarsCanvas() {
  const canvas = starsCanvasRef.value
  if (!canvas) return
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
}

// ── Canvas & viewport ─────────────────────────────────────────────────────────

const canvasRef = ref(null)

const panX = ref(0)
const panY = ref(0)
const zoom = ref(1)
const MIN_ZOOM = 0.3
const MAX_ZOOM = 3

const WORLD_W = 1500
const WORLD_H = 1000
const positions = ref({})

function dotRadius(artist) {
  const min = 8, max = 22
  const maxEvents = Math.max(...allArtists.value.map(a => a.events.length), 1)
  return min + ((artist.events.length / maxEvents) * (max - min))
}

const edges = computed(() => {
  const pairs = []
  const visible = visibleArtists.value
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i]
      const b = visible[j]
      if (a.venues.some(v => b.venues.includes(v))) {
        pairs.push([a.id, b.id])
      }
    }
  }
  return pairs
})

function assignPositions() {
  const artists = allArtists.value
  const genreGroups = {}
  for (const a of artists) {
    if (!genreGroups[a.genre.id]) genreGroups[a.genre.id] = []
    genreGroups[a.genre.id].push(a)
  }
  const genreIds = Object.keys(genreGroups)
  const cols = Math.ceil(Math.sqrt(genreIds.length))
  const padding = 180

  const newPos = { ...positions.value }
  genreIds.forEach((gid, gi) => {
    const col = gi % cols
    const row = Math.floor(gi / cols)
    const cx = padding + (col + 0.5) * ((WORLD_W - padding * 2) / cols)
    const cy = padding + (row + 0.5) * ((WORLD_H - padding * 2) / Math.ceil(genreIds.length / cols))
    const group = genreGroups[gid]
    const spread = Math.min(WORLD_W, WORLD_H) * 0.12
    group.forEach((artist, i) => {
      if (newPos[artist.id]) return
      const angle = (i / group.length) * Math.PI * 2
      const r = spread * (0.5 + Math.random() * 0.5)
      newPos[artist.id] = {
        x: Math.max(padding / 2, Math.min(WORLD_W - padding / 2, cx + Math.cos(angle) * r)),
        y: Math.max(padding / 2, Math.min(WORLD_H - padding / 2, cy + Math.sin(angle) * r)),
      }
    })
  })
  positions.value = newPos
}

// ── Smooth animated pan/zoom ──────────────────────────────────────────────────

let animFrame = null

function animateTo(targetPanX, targetPanY, targetZoom) {
  if (animFrame) cancelAnimationFrame(animFrame)

  const startPanX = panX.value
  const startPanY = panY.value
  const startZoom = zoom.value
  const duration = 400
  const startTime = performance.now()

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3)
  }

  function step(now) {
    const elapsed = now - startTime
    const t = Math.min(1, elapsed / duration)
    const e = easeOut(t)

    panX.value = startPanX + (targetPanX - startPanX) * e
    panY.value = startPanY + (targetPanY - startPanY) * e
    zoom.value = startZoom + (targetZoom - startZoom) * e
    draw()

    if (t < 1) {
      animFrame = requestAnimationFrame(step)
    }
  }
  animFrame = requestAnimationFrame(step)
}

function centreView(animated = false) {
  const canvas = canvasRef.value
  if (!canvas) return
  const targetPanX = (canvas.width / 2) - (WORLD_W / 2) * 1
  const targetPanY = (canvas.height / 2) - (WORLD_H / 2) * 1 + 70
  const targetZoom = 1
  if (animated) {
    animateTo(targetPanX, targetPanY, targetZoom)
  } else {
    panX.value = targetPanX
    panY.value = targetPanY
    zoom.value = targetZoom
  }
}

function centreOnArtists(artists) {
  const canvas = canvasRef.value
  if (!canvas || artists.length === 0) return

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const artist of artists) {
    const p = positions.value[artist.id]
    if (!p) continue
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }

  if (minX === Infinity) return

  const padding = 80
  const groupW = maxX - minX + padding * 2
  const groupH = maxY - minY + padding * 2

  const scaleX = canvas.width / groupW
  const scaleY = canvas.height / groupH
  const targetZoom = Math.min(1.6, Math.min(scaleX, scaleY))

  const groupCX = (minX + maxX) / 2
  const groupCY = (minY + maxY) / 2
  const targetPanX = canvas.width / 2 - groupCX * targetZoom
  const targetPanY = canvas.height / 2 - groupCY * targetZoom

  animateTo(targetPanX, targetPanY, targetZoom)
}

// ── Drawing ───────────────────────────────────────────────────────────────────

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.translate(panX.value, panY.value)
  ctx.scale(zoom.value, zoom.value)

  const visible = visibleArtists.value
  const pos = positions.value

  // Draw edges
  ctx.lineWidth = 1 / zoom.value
  for (const [idA, idB] of edges.value) {
    const a = pos[idA]
    const b = pos[idB]
    if (!a || !b) continue
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.stroke()
  }

  // Draw dots
  for (const artist of visible) {
    const p = pos[artist.id]
    if (!p) continue
    const r = dotRadius(artist)
    const isHovered = hoveredArtist.value?.id === artist.id

    if (isHovered) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, r + 10, 0, Math.PI * 2)
      ctx.fillStyle = artist.genre.color + '55'
      ctx.fill()
    }

    ctx.shadowColor = artist.genre.color
    ctx.shadowBlur = 18 / zoom.value  
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fillStyle = artist.genre.color
    ctx.globalAlpha = isHovered ? 1 : 0.9
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0

    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 2 / zoom.value
    ctx.stroke()

    if (zoom.value > 1.2 || isHovered) {
      ctx.font = `${Math.max(10, 12 / zoom.value)}px sans-serif`
      ctx.fillStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.85)'
      ctx.textAlign = 'center'
      ctx.fillText(artist.name, p.x, p.y + r + 14 / zoom.value)
    }
  }

  ctx.restore()
}

// ── Coordinate helpers ────────────────────────────────────────────────────────

function screenToWorld(sx, sy) {
  return {
    x: (sx - panX.value) / zoom.value,
    y: (sy - panY.value) / zoom.value,
  }
}

function canvasPos(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.touches ? e.touches[0].clientX : e.clientX
  const y = e.touches ? e.touches[0].clientY : e.clientY
  return { x: x - rect.left, y: y - rect.top }
}

function artistAtWorld(wx, wy) {
  const visible = [...visibleArtists.value].reverse()
  for (const artist of visible) {
    const p = positions.value[artist.id]
    if (!p) continue
    const r = dotRadius(artist)
    const dx = p.x - wx
    const dy = p.y - wy
    if (dx * dx + dy * dy <= r * r) return artist
  }
  return null
}

// ── Mouse / touch interaction ─────────────────────────────────────────────────

const hoveredArtist = ref(null)
const tooltip = ref({ visible: false, x: 0, y: 0, name: '' })

let isPanning = false
let panStart = { x: 0, y: 0 }
let panOrigin = { x: 0, y: 0 }
let didPan = false

function onMouseDown(e) {
  if (animFrame) cancelAnimationFrame(animFrame)
  isPanning = true
  didPan = false
  panStart = { x: e.clientX, y: e.clientY }
  panOrigin = { x: panX.value, y: panY.value }
  canvasRef.value.style.cursor = 'grabbing'
}

function onMouseMove(e) {
  if (isPanning) {
    const dx = e.clientX - panStart.x
    const dy = e.clientY - panStart.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan = true
    panX.value = panOrigin.x + dx
    panY.value = panOrigin.y + dy
    draw()
    return
  }
  const { x: sx, y: sy } = canvasPos(e)
  const { x: wx, y: wy } = screenToWorld(sx, sy)
  const found = artistAtWorld(wx, wy)
  hoveredArtist.value = found
  canvasRef.value.style.cursor = found ? 'pointer' : 'grab'
  tooltip.value = found
    ? { visible: true, x: sx + 14, y: sy - 10, name: found.name }
    : { ...tooltip.value, visible: false }
  draw()
}

function onMouseUp(e) {
  isPanning = false
  canvasRef.value.style.cursor = hoveredArtist.value ? 'pointer' : 'grab'
  if (!didPan) {
    const { x: sx, y: sy } = canvasPos(e)
    const { x: wx, y: wy } = screenToWorld(sx, sy)
    const found = artistAtWorld(wx, wy)
    if (found) router.push({ name: 'artist-detail', params: { id: found.id } })
  }
}

function onMouseLeave() {
  isPanning = false
  hoveredArtist.value = null
  tooltip.value.visible = false
  draw()
}

function onWheel(e) {
  e.preventDefault()
  if (animFrame) cancelAnimationFrame(animFrame)
  const { x: sx, y: sy } = canvasPos(e)
  const delta = e.deltaY < 0 ? 1.1 : 0.9
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value * delta))
  panX.value = sx - (sx - panX.value) * (newZoom / zoom.value)
  panY.value = sy - (sy - panY.value) * (newZoom / zoom.value)
  zoom.value = newZoom
  draw()
}

let touchStart = null
let touchPanOrigin = null

function onTouchStart(e) {
  if (animFrame) cancelAnimationFrame(animFrame)
  if (e.touches.length === 1) {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    touchPanOrigin = { x: panX.value, y: panY.value }
    didPan = false
  }
}

function onTouchMove(e) {
  e.preventDefault()
  if (e.touches.length === 1 && touchStart) {
    const dx = e.touches[0].clientX - touchStart.x
    const dy = e.touches[0].clientY - touchStart.y
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) didPan = true
    panX.value = touchPanOrigin.x + dx
    panY.value = touchPanOrigin.y + dy
    draw()
  }
}

function onTouchEnd(e) {
  if (!didPan && e.changedTouches.length === 1) {
    const rect = canvasRef.value.getBoundingClientRect()
    const sx = e.changedTouches[0].clientX - rect.left
    const sy = e.changedTouches[0].clientY - rect.top
    const { x: wx, y: wy } = screenToWorld(sx, sy)
    const found = artistAtWorld(wx, wy)
    if (found) router.push({ name: 'artist-detail', params: { id: found.id } })
  }
  touchStart = null
}

function zoomIn() {
  const canvas = canvasRef.value
  const cx = canvas.width / 2, cy = canvas.height / 2
  const newZoom = Math.min(MAX_ZOOM, zoom.value * 1.25)
  animateTo(
    cx - (cx - panX.value) * (newZoom / zoom.value),
    cy - (cy - panY.value) * (newZoom / zoom.value),
    newZoom
  )
}

function zoomOut() {
  const canvas = canvasRef.value
  const cx = canvas.width / 2, cy = canvas.height / 2
  const newZoom = Math.max(MIN_ZOOM, zoom.value * 0.8)
  animateTo(
    cx - (cx - panX.value) * (newZoom / zoom.value),
    cy - (cy - panY.value) * (newZoom / zoom.value),
    newZoom
  )
}

// ── Genre chip click — filter + animate to group ──────────────────────────────

function selectGenre(genreId) {
  const i = activeGenres.value.indexOf(genreId)
  if (i === -1) {
    activeGenres.value.push(genreId)
  } else {
    activeGenres.value.splice(i, 1)
  }
  setTimeout(() => {
    if (activeGenres.value.length === 0) {
      centreView(true)
    } else {
      centreOnArtists(visibleArtists.value)
    }
  }, 0)
}

// ── Resize ────────────────────────────────────────────────────────────────────

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  resizeStarsCanvas()
  centreView(false)
  draw()
}

let resizeObserver = null

onMounted(async () => {
  if (eventsStore.events.length === 0) {
    await eventsStore.fetchEvents()
  }
  assignPositions()
  resizeCanvas()
  initStars()
  canvasRef.value.addEventListener('wheel', onWheel, { passive: false })
  canvasRef.value.addEventListener('touchmove', onTouchMove, { passive: false })
  resizeObserver = new ResizeObserver(resizeCanvas)
  resizeObserver.observe(document.body)
})

onUnmounted(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
  if (starsAnimFrame) cancelAnimationFrame(starsAnimFrame)
  if (resizeObserver) resizeObserver.disconnect()
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('wheel', onWheel)
    canvasRef.value.removeEventListener('touchmove', onTouchMove)
  }
})

watch(visibleArtists, () => { draw() })
</script>

<template>
  <div class="discover-map">
    <RecommendedSongs v-if="!eventsStore.loading && !eventsStore.error" :artists="allArtists" />

    <div v-if="eventsStore.loading" class="discover-map__state">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else-if="eventsStore.error" class="discover-map__state">
      <i class="bi bi-exclamation-triangle fs-1 text-warning"></i>
      <p class="mb-3">{{ eventsStore.error }}</p>
      <button class="btn btn-riffle" @click="eventsStore.fetchEvents()">Try again</button>
    </div>

    <template v-else>
      <!-- Stars background canvas -->
      <canvas ref="starsCanvasRef" class="discover-map__stars"></canvas>

      <!-- Network graph canvas -->
      <canvas
        ref="canvasRef"
        class="discover-map__canvas"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseLeave"
        @touchstart.prevent="onTouchStart"
        @touchend.prevent="onTouchEnd"
      ></canvas>
    </template>

    <!-- Genre filter chips -->
   <div v-if="!eventsStore.loading && !eventsStore.error" class="discover-map__chips">
      <button v-for="genre in genres" :key="genre.id" type="button" class="genre-chip"
        :class="{ 'is-active': activeGenres.includes(genre.id) }" :style="activeGenres.includes(genre.id)
          ? { background: genre.color, borderColor: genre.color, color: '#fff' }
          : { borderColor: genre.color }" @click="selectGenre(genre.id)">
        {{ genre.name }}
      </button>
    </div>

    <!-- Tooltip -->
    <div
      v-if="tooltip.visible"
      class="node-tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      {{ tooltip.name }}
    </div>

    <!-- Controls: zoom + centre — bottom right -->
    <div v-if="!eventsStore.loading && !eventsStore.error" class="zoom-controls">
      <button type="button" class="zoom-btn" @click="zoomIn" aria-label="Zoom in">
        <i class="bi bi-plus-lg"></i>
      </button>
      <button type="button" class="zoom-btn" @click="zoomOut" aria-label="Zoom out">
        <i class="bi bi-dash-lg"></i>
      </button>
      <button type="button" class="zoom-btn centre-btn" @click="centreView(true)" aria-label="Centre view">
        <i class="bi bi-fullscreen"></i>
      </button>
    </div>

    <!-- Legend — bottom left -->
    <div v-if="!eventsStore.loading && !eventsStore.error" class="legend">
      <div class="legend__title"><i class="bi bi-info-circle"></i> Legend</div>
      <div class="legend__genres">
        <!-- <span v-for="g in genres" :key="g.id" class="legend__genre">
          <span class="legend__dot" :style="{ background: g.color }"></span>
          {{ g.name }}
        </span> -->
      </div>
      <p class="legend__row"><strong>Bigger dot</strong> = more events</p>
      <p class="legend__row"><strong>Line</strong> = shared venue</p>
    </div>

  </div>
</template>

<style scoped>
.discover-map {
  position: fixed;
  inset: 0;
  top: var(--navbar-height, 56px);
  background: linear-gradient(to bottom, #02021e, #08104d);
  overflow: hidden;
}

/* Stars canvas — fills the whole container, sits behind everything */
.discover-map__stars {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

/* Network canvas — sits on top, transparent background so stars show through */
.discover-map__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  background: transparent;
}
.discover-map__canvas:active {
  cursor: grabbing;
}

.discover-map__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  text-align: center;
  color: #fff;
}

.discover-map__chips {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  /* max-width: calc(100vw - 2rem); */
  pointer-events: auto;
}

.genre-chip {
  display:inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  border: 1.5px solid rgba(255,255,255,0.25);
  background: rgba(10,10,40,0.75);
  backdrop-filter: blur(8px);
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
}
.genre-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0,0,0,0.4);
  background: rgba(30,30,70,0.9);
}
.genre-chip:active {
  transform: scale(0.95);
}
.genre-chip__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.node-tooltip {
  position: absolute;
  pointer-events: none;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  background: rgba(10,10,40,0.92);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.15);
  z-index: 20;
}

.zoom-controls {
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.zoom-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(10,10,40,0.75);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 1.1rem;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: transform 0.1s, box-shadow 0.1s;
}
.zoom-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 14px rgba(0,0,0,0.4);
  background: rgba(30,30,70,0.9);
}
.centre-btn {
  margin-top: 0.4rem;
  border-top: 2px solid rgba(255,255,255,0.1);
}

.legend {
  position: absolute;
  bottom: 1.5rem;
  left: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  background: rgba(10,10,40,0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.15);
  font-size: 0.82rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  max-width: 200px;
  color: #fff;
}
.legend__title {
  font-weight: 800;
  margin-bottom: 0.5rem;
  font-size: 0.88rem;
  color: #fff;
}
.legend__genres {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.5rem;
}
.legend__genre {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: rgba(255,255,255,0.85);
}
.legend__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend__row {
  margin: 0.1rem 0;
  color: rgba(255,255,255,0.6);
  font-size: 0.8rem;
}
</style>