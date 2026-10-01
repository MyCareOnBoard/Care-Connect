import { useId, type CSSProperties } from "react"
import { Crown } from "lucide-react"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { EagleArt } from "@/components/cowry/EagleArt"
import { LionArt } from "@/components/cowry/LionArt"
import { resolveGiftIcon, type GiftIconRule, type GiftLike } from "@/components/cowry/giftIcons"
import { cn } from "@/lib/utils"

/**
 * A gift's own icon, drawn in 3D to sit beside the cowry — which icon a gift gets is
 * decided in giftIcons.ts.
 *
 * The cowry reads as an object rather than a symbol because of three things: a glossy
 * highlight, a body that deepens toward its edges, and a shadow on the ground beneath it.
 * Every gift icon gets the same three, in its own colour:
 *
 *   solid     — the shape itself is shaded: highlight top-left, base colour, darker rim;
 *   coin      — for icons drawn in lines, a glossy 3D coin in the gift's colour with the
 *               icon embossed on it in white;
 *   legendary — the coin again, rimmed in gold, with a warm glow and a slow moving shine,
 *               so the top tier looks like the top tier wherever it appears;
 *   drawn     — the cowry (natural, silver or diamond), the eagle, the King Lion, the pearl and the
 *               cowry throne are illustrated rather than taken from the icon set.
 */

/** Blend two hex colours; `amount` is how much of `to` to mix in. */
function mix(from: string, to: string, amount: number): string {
  const parse = (hex: string) => {
    const h = hex.replace("#", "")
    const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6)
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
  }
  const a = parse(from)
  const b = parse(to)
  return (
    "#" +
    a
      .map((channel, i) => Math.round(channel + (b[i] - channel) * amount).toString(16).padStart(2, "0"))
      .join("")
  )
}

/** The soft shadow on the ground beneath the icon, as the cowry has. */
function GroundShadow({ size }: { size: number }) {
  if (size < 22) return null
  return (
    <span
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-black/20 blur-[1.5px]"
      style={{ bottom: -size * 0.06, width: size * 0.62, height: Math.max(2, size * 0.09) }}
      aria-hidden="true"
    />
  )
}

/** CSS filters that re-finish the drawn cowry in silver or diamond. */
const COWRY_TINTS: Record<NonNullable<GiftIconRule["tint"]>, string> = {
  silver: "grayscale(1) brightness(1.18) contrast(1.08)",
  diamond: "grayscale(1) brightness(1.3) sepia(0.35) hue-rotate(155deg) saturate(2.4) drop-shadow(0 0 3px rgba(120,230,255,0.9))",
}

/** A pearl: a lustrous sphere, pale with a pink-lavender sheen. */
function Pearl({ size }: { size: number }) {
  return (
    <span
      className="relative block rounded-full"
      style={{
        width: size * 0.86,
        height: size * 0.86,
        background:
          "radial-gradient(circle at 34% 28%, #ffffff 0%, #fbf7ff 18%, #e9dcf5 45%, #c7b8e6 72%, #8f7fb3 100%)",
        boxShadow: `inset ${-size * 0.06}px ${-size * 0.08}px ${size * 0.14}px rgba(90,70,140,0.35), 0 ${size * 0.05}px ${size * 0.1}px rgba(0,0,0,0.22)`,
      }}
    >
      {/* A faint rainbow lustre across the lower half, as real pearls have. */}
      <span
        className="absolute inset-0 rounded-full opacity-40 mix-blend-overlay"
        style={{ background: "conic-gradient(from 200deg, #ffd1e8, #d1f0ff, #fff4c2, #ffd1e8)" }}
      />
    </span>
  )
}

export function GiftIcon({
  gift,
  size = 20,
  className,
}: {
  gift: GiftLike | null | undefined
  size?: number
  className?: string
}) {
  const gradientId = `gift-${useId().replace(/:/g, "")}`
  const resolved = resolveGiftIcon(gift)
  const box: CSSProperties = { width: size, height: size }

  if (resolved.kind === "emoji") {
    return (
      <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={box} aria-hidden="true">
        <span className="leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]" style={{ fontSize: size * 0.9 }}>
          {resolved.emoji}
        </span>
        <GroundShadow size={size} />
      </span>
    )
  }

  const { rule } = resolved
  const light = mix(rule.color, "#ffffff", 0.7)
  const dark = mix(rule.color, "#000000", 0.38)

  /* ── Drawn icons ── */
  if (rule.icon === "cowry") {
    return (
      <span className={cn("relative inline-flex shrink-0", className)} style={{ ...box, filter: rule.tint ? COWRY_TINTS[rule.tint] : undefined }} aria-hidden="true">
        <CowryIcon size={size} />
      </span>
    )
  }
  if (rule.icon === "eagle") {
    // Wider than it is tall, so it is centred in the same square every other icon uses.
    return (
      <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={box} aria-hidden="true">
        {rule.legendary && <span className="legendary-aura absolute inset-[-12%] rounded-full" />}
        <EagleArt size={size * 1.15} className="relative drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]" />
        <GroundShadow size={size} />
      </span>
    )
  }
  if (rule.icon === "lion") {
    return (
      <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={box} aria-hidden="true">
        {rule.legendary && <span className="legendary-aura absolute inset-[-12%] rounded-full" />}
        <LionArt size={size * 1.02} className="relative drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]" />
        <GroundShadow size={size} />
      </span>
    )
  }
  if (rule.icon === "pearl") {
    return (
      <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={box} aria-hidden="true">
        {rule.legendary && <span className="legendary-aura absolute inset-[-12%] rounded-full" />}
        <Pearl size={size} />
        <GroundShadow size={size} />
      </span>
    )
  }
  if (rule.icon === "cowry-throne") {
    return (
      <span className={cn("relative inline-flex shrink-0 items-end justify-center", className)} style={box} aria-hidden="true">
        {rule.legendary && <span className="legendary-aura absolute inset-[-12%] rounded-full" />}
        <CowryIcon size={size * 0.88} className="relative" />
        {/* The crown that makes it a throne, set on the shell's crest. */}
        <Crown
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: -size * 0.12, width: size * 0.5, height: size * 0.5, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))" }}
          color="#7a5310"
          fill="#f3c969"
          strokeWidth={1.8}
        />
      </span>
    )
  }

  const Icon = rule.icon

  /* ── Solid: the shape itself shaded ── */
  if (rule.form === "solid" && !rule.legendary) {
    return (
      <span className={cn("relative inline-flex shrink-0", className)} style={box} aria-hidden="true">
        <Icon
          width={size}
          height={size}
          color={dark}
          fill={`url(#${gradientId})`}
          strokeWidth={size >= 40 ? 1.1 : size >= 24 ? 1.35 : 1.7}
          style={{ filter: "drop-shadow(0 1px 0.6px rgba(0,0,0,0.2))" }}
        >
          <defs>
            <radialGradient id={gradientId} cx="34%" cy="26%" r="85%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="16%" stopColor={light} />
              <stop offset="58%" stopColor={rule.color} />
              <stop offset="100%" stopColor={dark} />
            </radialGradient>
          </defs>
        </Icon>
        <GroundShadow size={size} />
      </span>
    )
  }

  /* ── Coin (and the gold-rimmed legendary coin) ── */
  const legendary = Boolean(rule.legendary)
  const rim = Math.max(1.5, size * 0.07)
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={box} aria-hidden="true">
      {legendary && <span className="legendary-aura absolute inset-[-14%] rounded-full" />}
      <span
        className={cn("relative flex size-full items-center justify-center overflow-hidden rounded-full", legendary && "legendary-shine")}
        style={{
          background: `radial-gradient(circle at 32% 26%, #ffffff 0%, ${light} 18%, ${rule.color} 58%, ${dark} 100%)`,
          boxShadow: [
            `inset 0 ${-size * 0.07}px ${size * 0.12}px ${dark}80`,
            `inset 0 ${size * 0.05}px ${size * 0.08}px rgba(255,255,255,0.65)`,
            // A gold rim with a dark edge — the legendary tier's frame.
            ...(legendary ? [`0 0 0 ${rim}px #f3c969`, `0 0 0 ${rim + 1}px #7a5310`] : []),
            `0 ${size * 0.05}px ${size * 0.1}px rgba(0,0,0,0.2)`,
          ].join(", "),
        }}
      >
        <Icon
          width={size * (legendary ? 0.52 : 0.56)}
          height={size * (legendary ? 0.52 : 0.56)}
          color="#ffffff"
          strokeWidth={2.4}
          style={{ filter: `drop-shadow(0 ${Math.max(0.5, size * 0.02)}px 0 ${dark})` }}
        />
      </span>
      <GroundShadow size={size} />
    </span>
  )
}
