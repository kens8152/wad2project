import { ref } from 'vue'

const STORAGE_KEY = 'forum-drums-muted'

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export const muted = ref(readMuted())

export function setMuted(value) {
  muted.value = value
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    
  }
}

let ctx = null
let out = null
let noiseBuf = null


function audio() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
    const compressor = ctx.createDynamicsCompressor()
    out = ctx.createGain()
    out.gain.value = 0.8
    out.connect(compressor)
    compressor.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function noiseBuffer(c) {
  if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
    const length = Math.floor(c.sampleRate * 0.4)
    noiseBuf = c.createBuffer(1, length, c.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}


const SOUNDS = {
  kick: (tone, noise) => {
    tone(160, 45, 0.45, 1)
    noise(0.03, 0.25, 800)
  },
  tomLow: (tone, noise) => {
    tone(190, 90, 0.35, 0.8)
    noise(0.04, 0.2, 1500)
  },
  tomMid: (tone, noise) => {
    tone(260, 130, 0.3, 0.8)
    noise(0.04, 0.2, 1500)
  },
  snare: (tone, noise) => {
    tone(200, 150, 0.12, 0.5)
    noise(0.18, 0.55, 1800)
  },
  tomHigh: (tone, noise) => {
    tone(380, 200, 0.25, 0.7)
    noise(0.03, 0.2, 2000)
  },
}

export function playDrum(name) {
  if (muted.value) return
  const sound = SOUNDS[name]
  const c = audio()
  if (!sound || !c) return

  const t = c.currentTime

  const tone = (from, to, decay, peak) => {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(to, t + decay * 0.6)
    gain.gain.setValueAtTime(peak, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay)
    osc.connect(gain)
    gain.connect(out)
    osc.start(t)
    osc.stop(t + decay + 0.02)
  }

  const noise = (decay, peak, highpass) => {
    const src = c.createBufferSource()
    const filter = c.createBiquadFilter()
    const gain = c.createGain()
    src.buffer = noiseBuffer(c)
    filter.type = 'highpass'
    filter.frequency.value = highpass
    gain.gain.setValueAtTime(peak, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(out)
    src.start(t)
    src.stop(t + decay + 0.02)
  }

  sound(tone, noise)
}