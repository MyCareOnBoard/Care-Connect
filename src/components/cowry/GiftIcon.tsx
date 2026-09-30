import { useId, type CSSProperties } from "react"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { resolveGiftIcon, type GiftLike } from "@/components/cowry/giftIcons"
import { cn } from "@/lib/utils"

/**
 * A gift's own icon, drawn in 3D to sit beside the cowry — which icon a gift gets is
 * decided in giftIcons.ts.
 *
 * The cowry reads as an object rather than a symbol because of three things: a glossy
 * highlight, a body that deepens toward its edges, and a shadow on the ground beneath it.
 * Every gift icon gets the same three, in its own colour:
 *
 *   solid — the shape itself is shaded: highlight top-left, base colour, darker rim;
 *   coin  — for icons drawn in lines, a glossy 3D coin in the gift's colour with the icon
 *           embossed on it in white.
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
  if (rule.icon === "cowry") return <CowryIcon size={size} className={className} />

  const Icon = rule.icon
  const light = mix(rule.color, "#ffffff", 0.7)
  const dark = mix(rule.color, "#000000", 0.38)

  if (rule.form === "solid") {
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

  // Coin: a glossy disc in the gift's colour, the icon embossed on it in white.
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={box} aria-hidden="true">
      <span
        className="relative flex size-full items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 32% 26%, #ffffff 0%, ${light} 18%, ${rule.color} 58%, ${dark} 100%)`,
          boxShadow: [
            `inset 0 ${-size * 0.07}px ${size * 0.12}px ${dark}80`,
            `inset 0 ${size * 0.05}px ${size * 0.08}px rgba(255,255,255,0.65)`,
            `0 ${size * 0.05}px ${size * 0.1}px rgba(0,0,0,0.2)`,
          ].join(", "),
        }}
      >
        <Icon
          width={size * 0.56}
          height={size * 0.56}
          color="#ffffff"
          strokeWidth={2.4}
          style={{ filter: `drop-shadow(0 ${Math.max(0.5, size * 0.02)}px 0 ${dark})` }}
        />
      </span>
      <GroundShadow size={size} />
    </span>
  )
}
