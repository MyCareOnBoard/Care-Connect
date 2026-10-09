import { useSyncExternalStore } from "react"

/**
 * Sound effects, made in the browser.
 *
 * Every sound here is synthesised with the Web Audio API — tones, filtered noise, a few
 * envelopes — rather than loaded from audio files, so there is nothing to download, license
 * or cache, and each cue can be tuned in code.
 *
 * Sound is on by default and can be switched off from the account menu; the choice is
 * remembered per browser. Browsers only allow audio after the person has interacted with
 * the page, so the audio engine wakes on the first tap or key press and anything played
 * before that is silently skipped rather than queued.
 */

export type SoundName =
  | "tap" // a like
  | "pop" // a comment sent
  | "success" // a post published, an application sent
  | "coins" // Cowries earned
  | "gift" // a gift sent or received
  | "eagle" // Golden Eagle arrival
  | "roar" // Golden Lion arrival
  | "harvest" // Earth Harvest arrival
  | "sparkle" // a 200–399 Treasure: a scatter of twinkles
  | "spotlight" // a 400–699 Treasure: a rising shimmer into a bright chord
  | "bloom" // Blooming Rose arrival
  | "thunder" // Thunder Staff arrival
  | "flame" // Eternal Flame arrival
  | "sunrise" // Rising Sun arrival
  | "drums" // Ancestral Mark arrival
  | "city" // City of Lights arrival
  | "phoenix" // Phoenix Rise arrival
  | "pearl" // Ocean Pearl arrival
  | "fanfare" // Cowry Throne arrival

const STORAGE_KEY = "careconnect-sound"
const MASTER_VOLUME = 0.45

/* ── the on/off preference ─────────────────────────────────────────────── */

const listeners = new Set<() => void>()

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off"
  } catch {
    return true
  }
}

let enabled = typeof window === "undefined" ? false : readEnabled()

export function setSoundEnabled(next: boolean): void {
  enabled = next
  try {
    localStorage.setItem(STORAGE_KEY, next ? "on" : "off")
  } catch {
    // Not remembered; applies for this visit.
  }
  listeners.forEach((listener) => listener())
  if (next) playSound("tap")
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => enabled,
    () => false,
  )
}

/* ── the audio engine ──────────────────────────────────────────────────── */

let context: AudioContext | null = null
let master: GainNode | null = null
/** Set on the first tap or key press: until then the browser will not play audio anyway. */
let interacted = false

function engine(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined") return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!context) {
    context = new Ctor()
    master = context.createGain()
    master.gain.value = MASTER_VOLUME
    master.connect(context.destination)
  }
  return context && master ? { ctx: context, out: master } : null
}

// Wake the engine on the first interaction — the moment the browser allows sound.
if (typeof window !== "undefined") {
  const wake = () => {
    interacted = true
    const audio = engine()
    if (audio && audio.ctx.state === "suspended") void audio.ctx.resume()
    if (audio) preloadSamples(audio.ctx)
    window.removeEventListener("pointerdown", wake)
    window.removeEventListener("keydown", wake)
  }
  window.addEventListener("pointerdown", wake)
  window.addEventListener("keydown", wake)
}

/** A shaped tone: attack, hold, exponential release, optional pitch glide. */
function tone(
  ctx: AudioContext,
  out: AudioNode,
  { freq, at = 0, dur = 0.2, type = "sine", gain = 0.2, glide, attack = 0.005 }: {
    freq: number
    at?: number
    dur?: number
    type?: OscillatorType
    gain?: number
    glide?: number
    attack?: number
  },
) {
  const start = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, start + dur)
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(gain, start + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(env).connect(out)
  osc.start(start)
  osc.stop(start + dur + 0.05)
}

let noiseBuffer: AudioBuffer | null = null

/** Filtered white noise: whooshes, crackles, rumbles. */
function noise(
  ctx: AudioContext,
  out: AudioNode,
  { at = 0, dur = 0.5, filter = "bandpass", freq = 1000, sweepTo, q = 1, gain = 0.2, attack = 0.02 }: {
    at?: number
    dur?: number
    filter?: BiquadFilterType
    freq?: number
    sweepTo?: number
    q?: number
    gain?: number
    attack?: number
  },
) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const start = ctx.currentTime + at
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  src.loop = true
  const biquad = ctx.createBiquadFilter()
  biquad.type = filter
  biquad.Q.value = q
  biquad.frequency.setValueAtTime(freq, start)
  if (sweepTo) biquad.frequency.exponentialRampToValueAtTime(sweepTo, start + dur)
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(gain, start + attack)
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  src.connect(biquad).connect(env).connect(out)
  src.start(start)
  src.stop(start + dur + 0.05)
}

/* ── the cues ──────────────────────────────────────────────────────────── */

type Cue = (ctx: AudioContext, out: AudioNode) => void

const CUES: Partial<Record<SoundName, Cue>> = {
  tap: (ctx, out) => tone(ctx, out, { freq: 880, glide: 1320, dur: 0.09, gain: 0.14 }),

  pop: (ctx, out) => tone(ctx, out, { freq: 620, glide: 900, dur: 0.07, type: "triangle", gain: 0.12 }),

  success: (ctx, out) => {
    tone(ctx, out, { freq: 1046.5, dur: 0.18, gain: 0.14 })
    tone(ctx, out, { freq: 1568, at: 0.11, dur: 0.3, gain: 0.14 })
  },

  coins: (ctx, out) => {
    ;[2093, 2637, 3136].forEach((freq, i) => tone(ctx, out, { freq, at: i * 0.07, dur: 0.18, type: "triangle", gain: 0.08 }))
  },

  gift: (ctx, out) => {
    ;[523.3, 659.3, 784, 1046.5, 1318.5].forEach((freq, i) =>
      tone(ctx, out, { freq, at: i * 0.07, dur: 0.35, type: "triangle", gain: 0.1 }),
    )
    tone(ctx, out, { freq: 2093, at: 0.36, dur: 0.5, gain: 0.05 })
  },

  // A rushing sweep of wind as it passes, and a distant cry.
  eagle: (ctx, out) => {
    noise(ctx, out, { dur: 1.6, filter: "bandpass", freq: 300, sweepTo: 2200, q: 0.8, gain: 0.35, attack: 0.5 })
    noise(ctx, out, { at: 1.6, dur: 1.6, filter: "bandpass", freq: 2200, sweepTo: 300, q: 0.8, gain: 0.25, attack: 0.05 })
    tone(ctx, out, { freq: 1900, glide: 2500, at: 0.7, dur: 0.35, type: "sawtooth", gain: 0.04, attack: 0.03 })
    tone(ctx, out, { freq: 2500, glide: 1500, at: 1.05, dur: 0.55, type: "sawtooth", gain: 0.035 })
  },

  // A rising harp run as the petals open, over a soft warm pad.
  bloom: (ctx, out) => {
    ;[523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5, 1568].forEach((freq, i) =>
      tone(ctx, out, { freq, at: 0.15 + i * 0.13, dur: 1.4, type: "sine", gain: 0.09 }),
    )
    ;[261.6, 329.6, 392].forEach((freq) => tone(ctx, out, { freq, dur: 3.5, type: "triangle", gain: 0.04, attack: 1 }))
  },

  // A crack, the long roll after it, and a second strike.
  thunder: (ctx, out) => {
    noise(ctx, out, { dur: 0.18, filter: "highpass", freq: 1800, gain: 0.5, attack: 0.002 })
    noise(ctx, out, { at: 0.05, dur: 2.4, filter: "lowpass", freq: 260, sweepTo: 90, gain: 0.55, attack: 0.08 })
    noise(ctx, out, { at: 1.5, dur: 0.14, filter: "highpass", freq: 2200, gain: 0.4, attack: 0.002 })
    noise(ctx, out, { at: 1.55, dur: 2, filter: "lowpass", freq: 220, sweepTo: 80, gain: 0.45, attack: 0.08 })
  },

  // The roar of a fire rising, with crackles through it.
  flame: (ctx, out) => {
    noise(ctx, out, { dur: 3.8, filter: "lowpass", freq: 250, sweepTo: 700, gain: 0.35, attack: 0.9 })
    noise(ctx, out, { dur: 3.8, filter: "bandpass", freq: 900, q: 0.6, gain: 0.12, attack: 1.2 })
    for (let i = 0; i < 22; i++) {
      noise(ctx, out, {
        at: 0.3 + Math.random() * 3.2,
        dur: 0.03 + Math.random() * 0.04,
        filter: "highpass",
        freq: 2500 + Math.random() * 3000,
        gain: 0.12 + Math.random() * 0.15,
        attack: 0.002,
      })
    }
  },

  // A slow warm chord swelling like light, and a shimmer as the sun clears the horizon.
  sunrise: (ctx, out) => {
    ;[196, 261.6, 329.6, 392, 523.3].forEach((freq) => tone(ctx, out, { freq, dur: 4.2, type: "triangle", gain: 0.05, attack: 1.8 }))
    ;[1046.5, 1318.5, 1568, 2093].forEach((freq, i) => tone(ctx, out, { freq, at: 1.9 + i * 0.16, dur: 1.2, gain: 0.05 }))
  },
}

const EXTRA_CUES: Partial<Record<SoundName, Cue>> = {
  // Deep drum pulses, like a heartbeat, under a low droning chant.
  drums: (ctx, out) => {
    ;[0, 0.45, 0.9, 1.2, 1.65, 2.1, 2.4, 2.85, 3.3].forEach((at, i) => {
      tone(ctx, out, { freq: i % 3 === 2 ? 110 : 70, glide: 42, at, dur: 0.35, gain: 0.5, attack: 0.004 })
      noise(ctx, out, { at, dur: 0.08, filter: "lowpass", freq: 400, gain: 0.18, attack: 0.002 })
    })
    tone(ctx, out, { freq: 98, dur: 4, type: "sawtooth", gain: 0.025, attack: 1.2 })
    tone(ctx, out, { freq: 147, dur: 4, type: "triangle", gain: 0.03, attack: 1.4 })
  },

  // Twinkling bells as the windows light, over a soft city hum.
  city: (ctx, out) => {
    tone(ctx, out, { freq: 110, dur: 4.2, type: "triangle", gain: 0.04, attack: 1 })
    const bells = [1318.5, 1568, 1760, 2093, 2349, 2637, 3136]
    for (let i = 0; i < 16; i++) {
      tone(ctx, out, { freq: bells[i % bells.length], at: 0.3 + i * 0.22 + Math.random() * 0.1, dur: 0.6, gain: 0.05 })
    }
  },

  // A fire rushing up, and a bright rising call as the wings open.
  phoenix: (ctx, out) => {
    noise(ctx, out, { dur: 2.6, filter: "bandpass", freq: 300, sweepTo: 2600, q: 0.7, gain: 0.3, attack: 1.2 })
    noise(ctx, out, { dur: 3.4, filter: "lowpass", freq: 300, sweepTo: 800, gain: 0.25, attack: 0.8 })
    tone(ctx, out, { freq: 880, glide: 1760, at: 1.8, dur: 0.7, type: "triangle", gain: 0.08, attack: 0.1 })
    ;[1046.5, 1318.5, 1568, 2093].forEach((freq, i) => tone(ctx, out, { freq, at: 2.3 + i * 0.1, dur: 1, gain: 0.05 }))
  },

  // Water moving, a few bubbles, and a clear chime as the pearl is revealed.
  pearl: (ctx, out) => {
    noise(ctx, out, { dur: 4, filter: "lowpass", freq: 500, sweepTo: 350, gain: 0.18, attack: 0.8 })
    for (let i = 0; i < 12; i++) {
      tone(ctx, out, { freq: 300 + Math.random() * 500, glide: 900 + Math.random() * 600, at: 0.2 + Math.random() * 2.2, dur: 0.12, gain: 0.05 })
    }
    ;[1568, 2093, 2637, 3136].forEach((freq, i) => tone(ctx, out, { freq, at: 2.2 + i * 0.05, dur: 2, gain: 0.07, attack: 0.01 }))
  },

  // A short royal fanfare as the crown lands, with coins shimmering after.
  fanfare: (ctx, out) => {
    const notes: Array<[number, number, number]> = [
      [392, 0.2, 0.18],
      [523.3, 0.4, 0.18],
      [659.3, 0.6, 0.18],
      [784, 0.8, 0.7],
    ]
    for (const [freq, at, dur] of notes) {
      tone(ctx, out, { freq, at, dur, type: "sawtooth", gain: 0.05, attack: 0.02 })
      tone(ctx, out, { freq: freq / 2, at, dur, type: "square", gain: 0.02, attack: 0.02 })
    }
    ;[523.3, 659.3, 784, 1046.5].forEach((freq) => tone(ctx, out, { freq, at: 1.6, dur: 1.6, type: "sawtooth", gain: 0.03, attack: 0.05 }))
    ;[2093, 2637, 3136, 2637, 3520].forEach((freq, i) => tone(ctx, out, { freq, at: 1.8 + i * 0.09, dur: 0.25, type: "triangle", gain: 0.06 }))
  },
}

Object.assign(CUES, EXTRA_CUES)

/* ── the lion's roar ───────────────────────────────────────────────────────
   A real roar is not a clean tone. It comes from huge, loose vocal folds, so its pitch
   wanders and its loudness flutters unevenly; it is loud enough to overdrive itself into a
   rasp; it is shaped by an open mouth — an "aaah" closing to an "oooh" — and it carries a
   heavy chest rumble an octave below. It swells in, holds, falls away, and is followed by a
   run of shorter grunts, each lower and softer. Outdoors, it echoes.

   So each call below is: rough, jittering sawtooth voices plus breath, driven through a
   soft clipper, then through mouth-shaped (formant) filters that glide from aah to ooh,
   over a sub-octave rumble — all into a short outdoor reverb. */

function noiseSource(ctx: AudioContext): AudioBufferSourceNode {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  src.loop = true
  // Start each one somewhere different, so two random wobbles never move together.
  src.playbackRate.value = 0.8 + Math.random() * 0.4
  return src
}

/** Slow random movement (for jitter and flutter): noise smoothed down to `rate` Hz. */
function wobble(ctx: AudioContext, rate: number, depth: number, start: number, stop: number): AudioNode {
  const src = noiseSource(ctx)
  const smooth = ctx.createBiquadFilter()
  smooth.type = "lowpass"
  smooth.frequency.value = rate
  const amount = ctx.createGain()
  amount.gain.value = depth
  src.connect(smooth).connect(amount)
  src.start(start, Math.random() * 1.5)
  src.stop(stop)
  return amount
}

let clipCurve: Float32Array<ArrayBuffer> | null = null
function softClip(ctx: AudioContext): WaveShaperNode {
  if (!clipCurve) {
    clipCurve = new Float32Array(1024)
    for (let i = 0; i < clipCurve.length; i++) {
      const x = (i / (clipCurve.length - 1)) * 2 - 1
      clipCurve[i] = Math.tanh(3.2 * x)
    }
  }
  const shaper = ctx.createWaveShaper()
  shaper.curve = clipCurve
  shaper.oversample = "2x"
  return shaper
}

let outdoorImpulse: AudioBuffer | null = null
/** A short, dark outdoor echo: decaying noise as the room. */
function outdoors(ctx: AudioContext, out: AudioNode, wet: number): AudioNode {
  if (!outdoorImpulse || outdoorImpulse.sampleRate !== ctx.sampleRate) {
    const length = Math.round(ctx.sampleRate * 1.8)
    outdoorImpulse = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const data = outdoorImpulse.getChannelData(channel)
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2)
    }
  }
  const input = ctx.createGain()
  const verb = ctx.createConvolver()
  verb.buffer = outdoorImpulse
  const dark = ctx.createBiquadFilter()
  dark.type = "lowpass"
  dark.frequency.value = 1800
  const wetGain = ctx.createGain()
  wetGain.gain.value = wet
  input.connect(out)
  input.connect(verb).connect(dark).connect(wetGain).connect(out)
  return input
}

/** One vocalisation — the great roar, or a grunt after it. */
function roarCall(
  ctx: AudioContext,
  out: AudioNode,
  {
    at,
    dur,
    pitch,
    gain,
    swell,
  }: {
    at: number
    dur: number
    /** Start, peak and end of the fundamental, in Hz. */
    pitch: [number, number, number]
    gain: number
    /** How long it takes to reach full voice. */
    swell: number
  },
) {
  const start = ctx.currentTime + at
  const end = start + dur
  const peakAt = start + Math.min(dur * 0.35, swell + 0.1)
  const [from, peak, to] = pitch

  // The voice: two rough sawtooths a hair apart, pitch wandering by ±~8%.
  const voice = ctx.createGain()
  voice.gain.value = 0.5
  const jitter = wobble(ctx, 22, peak * 0.08, start, end + 0.1)
  for (const detune of [-14, 11]) {
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.detune.value = detune
    osc.frequency.setValueAtTime(from, start)
    osc.frequency.exponentialRampToValueAtTime(peak, peakAt)
    osc.frequency.exponentialRampToValueAtTime(peak * 0.85, start + dur * 0.7)
    osc.frequency.exponentialRampToValueAtTime(to, end)
    jitter.connect(osc.frequency)
    osc.connect(voice)
    osc.start(start)
    osc.stop(end + 0.05)
  }

  // Breath and rasp through the throat.
  const breath = noiseSource(ctx)
  const throat = ctx.createBiquadFilter()
  throat.type = "bandpass"
  throat.frequency.value = 900
  throat.Q.value = 0.6
  const breathGain = ctx.createGain()
  breathGain.gain.value = 0.55
  breath.connect(throat).connect(breathGain).connect(voice)
  breath.start(start)
  breath.stop(end + 0.05)

  // Flutter: the loudness shudders unevenly, as loose vocal folds do.
  const flutter = ctx.createGain()
  flutter.gain.value = 0.75
  wobble(ctx, 45, 0.55, start, end + 0.1).connect(flutter.gain)

  // Overdriven into a rasp.
  const drive = ctx.createGain()
  drive.gain.value = 2.2
  const clip = softClip(ctx)
  voice.connect(flutter).connect(drive).connect(clip)

  // The open mouth: formants gliding from "aaah" to "oooh" as the roar closes.
  const envelope = ctx.createGain()
  const formants: Array<[number, number, number, number]> = [
    // [start Hz, end Hz, Q, level]
    [720, 380, 3.5, 1],
    [1150, 760, 4, 0.55],
    [2500, 2300, 5, 0.18],
  ]
  for (const [f0, f1, q, level] of formants) {
    const band = ctx.createBiquadFilter()
    band.type = "bandpass"
    band.Q.value = q
    band.frequency.setValueAtTime(f0 * 0.8, start)
    band.frequency.linearRampToValueAtTime(f0, peakAt)
    band.frequency.exponentialRampToValueAtTime(f1, end)
    const bandGain = ctx.createGain()
    bandGain.gain.value = level * 2.4
    clip.connect(band).connect(bandGain).connect(envelope)
  }
  // The chest: the whole voice, low-passed, for weight.
  const chest = ctx.createBiquadFilter()
  chest.type = "lowpass"
  chest.frequency.value = 380
  const chestGain = ctx.createGain()
  chestGain.gain.value = 0.9
  clip.connect(chest).connect(chestGain).connect(envelope)

  // A rumble an octave below.
  const sub = ctx.createOscillator()
  sub.type = "sine"
  sub.frequency.setValueAtTime(from / 2, start)
  sub.frequency.exponentialRampToValueAtTime(peak / 2, peakAt)
  sub.frequency.exponentialRampToValueAtTime(to / 2, end)
  const subGain = ctx.createGain()
  subGain.gain.value = 0.7
  sub.connect(subGain).connect(envelope)
  sub.start(start)
  sub.stop(end + 0.05)

  // Swell in, hold, fall away.
  envelope.gain.setValueAtTime(0.0001, start)
  envelope.gain.exponentialRampToValueAtTime(gain, start + swell)
  envelope.gain.setValueAtTime(gain, start + dur * 0.6)
  envelope.gain.exponentialRampToValueAtTime(0.0001, end)
  envelope.connect(out)
}

/** The great roar, then its grunts, each lower and softer — with an outdoor echo. */
function roar(ctx: AudioContext, out: AudioNode, at: number) {
  const space = outdoors(ctx, out, 0.45)
  roarCall(ctx, space, { at, dur: 1.75, pitch: [95, 185, 85], gain: 0.42, swell: 0.32 })
  ;[
    { offset: 1.95, pitch: [110, 135, 80] as [number, number, number], gain: 0.3 },
    { offset: 2.4, pitch: [100, 120, 72] as [number, number, number], gain: 0.24 },
    { offset: 2.8, pitch: [90, 105, 65] as [number, number, number], gain: 0.18 },
    { offset: 3.15, pitch: [80, 92, 60] as [number, number, number], gain: 0.13 },
  ].forEach(({ offset, pitch, gain }) => roarCall(ctx, space, { at: at + offset, dur: 0.34, pitch, gain, swell: 0.08 }))
}

/* ── recorded sounds ───────────────────────────────────────────────────────
   A few cues are better as real recordings than synthesis — a lion's roar above all. They
   live in public/sounds, are fetched and decoded once (when the engine wakes on the first
   tap), and if one is missing or fails to load, its cue falls back to the synthesised
   version, so a scene is never silent. */

const SAMPLE_URLS = {
  roar: `${import.meta.env.BASE_URL}sounds/lion-roar.mp3`,
} as const
type SampleName = keyof typeof SAMPLE_URLS

const samples = new Map<SampleName, AudioBuffer>()
const loading = new Map<SampleName, Promise<void>>()

function loadSample(ctx: AudioContext, name: SampleName): Promise<void> {
  const existing = loading.get(name)
  if (existing) return existing
  const promise = fetch(SAMPLE_URLS[name])
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status}`)
      return response.arrayBuffer()
    })
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      samples.set(name, buffer)
    })
    .catch(() => {
      // Keep the synthesised fallback; allow another try later.
      loading.delete(name)
    })
  loading.set(name, promise)
  return promise
}

function preloadSamples(ctx: AudioContext) {
  for (const name of Object.keys(SAMPLE_URLS) as SampleName[]) void loadSample(ctx, name)
}

/** Play a recording `at` seconds from now, with short fades so it never clicks. */
function playSample(ctx: AudioContext, out: AudioNode, buffer: AudioBuffer, at: number, gain: number) {
  const start = ctx.currentTime + at
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(gain, start + 0.03)
  env.gain.setValueAtTime(gain, Math.max(start + 0.03, start + buffer.duration - 0.2))
  env.gain.exponentialRampToValueAtTime(0.0001, start + buffer.duration)
  src.connect(env).connect(out)
  src.start(start)
  src.stop(start + buffer.duration + 0.05)
}

// Rain pouring onto the earth with a far-off rumble, then rising chimes as the garden comes
// up, a warm chord as the sun breaks through, and birdsong.
CUES.harvest = (ctx, out) => {
  noise(ctx, out, { at: 0.2, dur: 3.6, filter: "highpass", freq: 2400, gain: 0.16, attack: 0.6 })
  noise(ctx, out, { at: 0.2, dur: 3.6, filter: "bandpass", freq: 700, q: 0.5, gain: 0.08, attack: 0.8 })
  noise(ctx, out, { at: 0.7, dur: 2.2, filter: "lowpass", freq: 160, sweepTo: 70, gain: 0.22, attack: 0.3 })
  for (let i = 0; i < 46; i++) {
    tone(ctx, out, { freq: 1800 + Math.random() * 1600, glide: 900, at: 0.4 + Math.random() * 3, dur: 0.05, gain: 0.025 })
  }
  // The shoots: a rising pentatonic run, like growth.
  ;[523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5].forEach((freq, i) =>
    tone(ctx, out, { freq, at: 1.9 + i * 0.2, dur: 0.6, type: "triangle", gain: 0.09 }),
  )
  // The sun: a warm, open chord.
  ;[261.6, 329.6, 392, 523.3].forEach((freq) => tone(ctx, out, { freq, at: 3.5, dur: 2, gain: 0.06, attack: 0.4 }))
  // Birds.
  ;[4.0, 4.12, 4.5, 4.62, 4.74].forEach((at) => tone(ctx, out, { freq: 2600, glide: 3600, at, dur: 0.08, gain: 0.05 }))
}

// A quick scatter of high twinkles, like light catching glitter.
CUES.sparkle = (ctx, out) => {
  ;[2637, 3136, 3520, 2794, 3951, 3322].forEach((freq, i) =>
    tone(ctx, out, { freq, at: 0.05 + i * 0.06 + Math.random() * 0.03, dur: 0.18, type: "sine", gain: 0.05 }),
  )
}

// A shimmer that rises as the icon does, landing on a bright, open chord.
CUES.spotlight = (ctx, out) => {
  noise(ctx, out, { dur: 0.9, filter: "bandpass", freq: 1200, sweepTo: 6000, q: 1.2, gain: 0.08, attack: 0.5 })
  ;[523.3, 659.3, 784, 1046.5].forEach((freq, i) => tone(ctx, out, { freq, at: 0.1 + i * 0.09, dur: 0.4, type: "triangle", gain: 0.07 }))
  ;[523.3, 784, 1046.5, 1568].forEach((freq) => tone(ctx, out, { freq, at: 0.55, dur: 1.4, gain: 0.05, attack: 0.05 }))
}

// A crack of thunder, rain pouring, a second strike — and the roar.
CUES.roar = (ctx, out) => {
  noise(ctx, out, { dur: 5, filter: "highpass", freq: 3000, gain: 0.06, attack: 0.4 })
  noise(ctx, out, { dur: 0.18, filter: "highpass", freq: 1800, gain: 0.45, attack: 0.002 })
  noise(ctx, out, { at: 0.05, dur: 1.8, filter: "lowpass", freq: 260, sweepTo: 90, gain: 0.5, attack: 0.08 })
  noise(ctx, out, { at: 1.4, dur: 0.14, filter: "highpass", freq: 2200, gain: 0.4, attack: 0.002 })
  // Kept low and short, so it rolls under the roar rather than over it.
  noise(ctx, out, { at: 1.45, dur: 1.4, filter: "lowpass", freq: 200, sweepTo: 60, gain: 0.22, attack: 0.08 })
  // The recorded roar, in a little of the storm's outdoor echo; the synthesised one if the
  // recording is not loaded (yet).
  const recorded = samples.get("roar")
  if (recorded) playSample(ctx, outdoors(ctx, out, 0.25), recorded, 1.6, 1)
  else {
    void loadSample(ctx, "roar")
    roar(ctx, out, 1.6)
  }
}

/** Play a cue — if sound is on and the browser is ready for it. Never throws. */
export function playSound(name: SoundName): void {
  if (!enabled || !interacted) return
  try {
    const audio = engine()
    if (!audio || audio.ctx.state !== "running") return
    CUES[name]?.(audio.ctx, audio.out)
  } catch {
    // Sound is a nicety; nothing depends on it.
  }
}
