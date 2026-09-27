#!/usr/bin/env node
/**
 * Generate the dark theme from the colours the app actually uses.
 *
 * The UI was built light-only, with colours written straight into class names
 * (`bg-white`, `text-[#151922]`, `hover:bg-[#f2f6f8]` …) rather than through theme tokens —
 * about three hundred distinct ones across the codebase. Adding a `dark:` twin beside every
 * one by hand would touch nearly every file and drift the moment someone adds a colour.
 *
 * So this reads every colour class in `src/`, works out a dark counterpart for each, and
 * writes one stylesheet of overrides that apply under `html.dark`:
 *
 *   - light surfaces (backgrounds, gradients stops) become dark surfaces, keeping a hint of
 *     their hue, and ordered so a white card still sits above the page behind it;
 *   - light borders become quiet dark borders;
 *   - dark and grey text becomes light and mid-grey text;
 *   - brand and status colours (teal buttons, red errors, gold Cowries) are left alone, except
 *     that dark-toned *text* is lifted so it stays readable on a dark background;
 *   - white used as a translucent glass (`bg-white/10` on a dark hero) is left alone.
 *
 * Run it after adding colours:   node scripts/generate-dark-theme.mjs
 * It is deterministic, so the output diff shows exactly what changed.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const srcDir = join(root, "src")
const outFile = join(srcDir, "styles", "dark-theme.generated.css")

/* ── colour maths ──────────────────────────────────────────────────────── */

const NAMED = {
  white: "#ffffff",
  black: "#000000",
  "gray-50": "#f9fafb",
  "gray-100": "#f3f4f6",
  "gray-200": "#e5e7eb",
  "gray-300": "#d1d5db",
  "gray-400": "#9ca3af",
  "gray-500": "#6b7280",
  "gray-600": "#4b5563",
  "gray-700": "#374151",
  "gray-800": "#1f2937",
  "gray-900": "#111827",
  "slate-50": "#f8fafc",
  "slate-100": "#f1f5f9",
  "slate-200": "#e2e8f0",
  "slate-300": "#cbd5e1",
  "slate-400": "#94a3b8",
  "slate-500": "#64748b",
  "slate-600": "#475569",
  "slate-700": "#334155",
  "slate-800": "#1e293b",
  "slate-900": "#0f172a",
}

function parseHex(hex) {
  let h = hex.replace("#", "")
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("")
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
  return { r, g, b, a }
}

function toHsl({ r, g, b }) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: h * 60, s, l }
}

function hslToHex({ h, s, l }) {
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return (
    "#" +
    [f(0), f(8), f(4)]
      .map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0"))
      .join("")
  )
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))

/** The two base surfaces. Kept in step with --background and --card in index.css. */
const PAGE = "#0d1117"
const CARD = "#161b22"

/** Colours used as whole-page backgrounds (AppShell, admin, auth, body). */
const PAGE_BACKGROUNDS = new Set(["#f5f8fa", "#eef4f5", "#f7f8fa"])

/**
 * The dark counterpart of one colour, for one kind of property.
 * Returns null when the colour should be left exactly as it is.
 */
function darken(hex, kind) {
  const { h, s, l } = toHsl(parseHex(hex))

  if (kind === "surface") {
    // The page itself sits lowest. Named, because the same pale greys are also used for
    // chips and hover fills, which must sit *above* a card rather than below it.
    if (PAGE_BACKGROUNDS.has(hex.toLowerCase())) return PAGE
    // Near-white is a card or panel.
    if (l >= 0.985) return s > 0.05 ? hslToHex({ h, s: 0.2, l: 0.12 }) : CARD
    // Pale greys and tints: chips, hover fills, selected states. A step above the card,
    // more so the deeper the tint was, keeping a hint of its hue.
    if (l >= 0.9) return hslToHex({ h, s: s * 0.45, l: clamp(0.15 + (0.985 - l) * 0.8, 0.15, 0.22) })
    if (l >= 0.78) return hslToHex({ h, s: s * 0.45, l: clamp(0.2 + (0.9 - l) * 0.5, 0.2, 0.28) })
    return null
  }

  if (kind === "border") {
    if (l >= 0.78) return hslToHex({ h, s: s * 0.3, l: clamp(0.2 + (1 - l) * 0.35, 0.2, 0.3) })
    return null
  }

  // Text, icons, placeholders.
  if (s < 0.25) {
    // Near-black text becomes near-white; greys become mid-greys, keeping their rank.
    if (l <= 0.3) return hslToHex({ h, s: s * 0.4, l: clamp(0.93 - l * 0.3, 0.84, 0.94) })
    if (l <= 0.62) return hslToHex({ h, s: s * 0.6, l: clamp(0.38 + l * 0.55, 0.5, 0.74) })
    return null
  }
  // Coloured text: lift the dark tones so teal, red and friends stay legible on dark.
  // Saturation comes down as lightness goes up, or brand teal turns neon.
  if (l < 0.5) return hslToHex({ h, s: s * 0.65, l: clamp(l + 0.12, 0.45, 0.6) })
  return null
}

/* ── class scanning ────────────────────────────────────────────────────── */

const PROPS = {
  bg: { kind: "surface", decl: (c) => `background-color: ${c}` },
  from: { kind: "surface", decl: (c) => `--tw-gradient-from: ${c}` },
  via: { kind: "surface", decl: (c) => `--tw-gradient-via: ${c}` },
  to: { kind: "surface", decl: (c) => `--tw-gradient-to: ${c}` },
  border: { kind: "border", decl: (c) => `border-color: ${c}` },
  "border-t": { kind: "border", decl: (c) => `border-top-color: ${c}` },
  "border-b": { kind: "border", decl: (c) => `border-bottom-color: ${c}` },
  "border-l": { kind: "border", decl: (c) => `border-left-color: ${c}` },
  "border-r": { kind: "border", decl: (c) => `border-right-color: ${c}` },
  "border-x": { kind: "border", decl: (c) => `border-left-color: ${c}; border-right-color: ${c}` },
  "border-y": { kind: "border", decl: (c) => `border-top-color: ${c}; border-bottom-color: ${c}` },
  ring: { kind: "border", decl: (c) => `--tw-ring-color: ${c}` },
  outline: { kind: "border", decl: (c) => `outline-color: ${c}` },
  divide: { kind: "border", decl: (c) => `border-color: ${c}`, divide: true },
  text: { kind: "text", decl: (c) => `color: ${c}` },
  fill: { kind: "text", decl: (c) => `fill: ${c}` },
  stroke: { kind: "text", decl: (c) => `stroke: ${c}` },
  decoration: { kind: "text", decl: (c) => `text-decoration-color: ${c}` },
  caret: { kind: "text", decl: (c) => `caret-color: ${c}` },
}

const PROP_PATTERN = Object.keys(PROPS)
  .sort((a, b) => b.length - a.length)
  .join("|")
const COLOR_PATTERN = `\\[#[0-9a-fA-F]{3,8}\\]|white|black|(?:gray|slate)-\\d{2,3}`
const CLASS_RE = new RegExp(
  `(?<![\\w\\-\\[:/#])((?:[a-z][a-z0-9-]*:)*)(${PROP_PATTERN})-(${COLOR_PATTERN})(?:/(\\d{1,3}))?(?![\\w\\-\\[/])`,
  "g",
)

/** Variants we can reproduce faithfully. Anything else is skipped, not guessed at. */
const PSEUDO = {
  hover: ":hover",
  focus: ":focus",
  "focus-visible": ":focus-visible",
  "focus-within": ":focus-within",
  active: ":active",
  disabled: ":disabled",
  placeholder: "::placeholder",
  "data-highlighted": "[data-highlighted]",
  "aria-pressed": '[aria-pressed="true"]',
  "aria-selected": '[aria-selected="true"]',
}
const GROUP = { "group-hover": ".group:hover", "group-focus-visible": ".group:focus-visible" }
const MEDIA = { sm: "40rem", md: "48rem", lg: "64rem", xl: "80rem", "2xl": "96rem" }

function escapeClass(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      if (entry === "__tests__" || entry === "__mocks__") continue
      walk(path, files)
    } else if (/\.(tsx|ts)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      files.push(path)
    }
  }
  return files
}

const rules = new Map() // media -> Map(selector -> declaration)
let skipped = 0

for (const file of walk(srcDir)) {
  const text = readFileSync(file, "utf8")
  for (const match of text.matchAll(CLASS_RE)) {
    const [full, variantChain, prop, rawColor, alphaRaw] = match
    const spec = PROPS[prop]
    const hex = rawColor.startsWith("[") ? rawColor.slice(1, -1) : NAMED[rawColor]
    if (!hex) continue

    const alpha = alphaRaw ? Number(alphaRaw) / 100 : parseHex(hex).a
    // White glass on dark heroes stays glass. It is already designed for a dark backdrop.
    if (hex.toLowerCase() === "#ffffff" && alpha <= 0.3) continue
    // White text is almost always on a coloured button or a dark hero; keep it.
    if (spec.kind === "text" && hex.toLowerCase() === "#ffffff") continue

    const mapped = darken(hex, spec.kind)
    if (!mapped) continue
    const color =
      alpha < 1
        ? `color-mix(in srgb, ${mapped} ${Math.round(alpha * 100)}%, transparent)`
        : mapped

    const variants = variantChain ? variantChain.slice(0, -1).split(":") : []
    let pseudo = ""
    let groupPrefix = ""
    let media = ""
    let ok = true
    for (const variant of variants) {
      if (PSEUDO[variant]) pseudo += PSEUDO[variant]
      else if (GROUP[variant]) groupPrefix = `${GROUP[variant]} `
      else if (MEDIA[variant]) media = MEDIA[variant]
      else ok = false
    }
    if (!ok) {
      skipped += 1
      continue
    }

    let selector = `html.dark ${groupPrefix}.${escapeClass(full)}${pseudo}`
    if (spec.divide) selector = `html.dark .${escapeClass(full)} > :not(:last-child)`
    const bucket = rules.get(media) ?? new Map()
    bucket.set(selector, spec.decl(color))
    rules.set(media, bucket)
  }
}

/*
 * Inline gradients: `bg-[linear-gradient(135deg,#fffaf0,#fbeed2)]` and friends. Each light
 * stop is darkened the same way a flat background would be; dark and saturated stops (the
 * teal heroes) are left as they are, and a gradient with nothing to change is skipped.
 */
const GRADIENT_RE =
  /(?<![\w\-[:/#])((?:[a-z][a-z0-9-]*:)*)bg-\[((?:linear|radial|conic)-gradient\([^\]\s"'`]*\))\](?![\w\-[/])/g

for (const file of walk(srcDir)) {
  const text = readFileSync(file, "utf8")
  for (const match of text.matchAll(GRADIENT_RE)) {
    const [full, variantChain, value] = match
    if (variantChain) continue
    let changed = false
    const css = value
      .replace(/_/g, " ")
      .replace(/#[0-9a-fA-F]{3,8}\b/g, (hex) => {
        const mapped = darken(hex, "surface")
        if (!mapped) return hex
        changed = true
        return mapped
      })
    if (!changed) continue
    const bucket = rules.get("") ?? new Map()
    bucket.set(`html.dark .${escapeClass(full)}`, `background-image: ${css}`)
    rules.set("", bucket)
  }
}

/* ── output ────────────────────────────────────────────────────────────── */

const lines = [
  "/*",
  " * GENERATED by scripts/generate-dark-theme.mjs — do not edit by hand.",
  " * Re-run the script after adding colour classes: node scripts/generate-dark-theme.mjs",
  " *",
  " * Unlayered on purpose: it must win over Tailwind's utilities layer, which it overrides.",
  " */",
  "",
]

const emit = (bucket, indent = "") => {
  for (const selector of [...bucket.keys()].sort()) {
    lines.push(`${indent}${selector} { ${bucket.get(selector)}; }`)
  }
}

emit(rules.get("") ?? new Map())
for (const [media, width] of Object.entries(MEDIA)) {
  const bucket = rules.get(width)
  if (!bucket) continue
  lines.push("", `@media (min-width: ${width}) {`)
  emit(bucket, "  ")
  lines.push("}")
}

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, lines.join("\n") + "\n")

const count = [...rules.values()].reduce((sum, bucket) => sum + bucket.size, 0)
console.log(
  `Wrote ${count} dark-theme rules to ${relative(root, outFile)}` +
    (skipped ? ` (${skipped} classes with unsupported variants skipped)` : ""),
)
