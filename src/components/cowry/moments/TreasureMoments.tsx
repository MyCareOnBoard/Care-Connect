import { useEffect, useMemo, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { Heart, Leaf, Music } from "lucide-react"
import { GiftIcon } from "@/components/cowry/GiftIcon"
import type { GiftLike } from "@/components/cowry/giftIcons"
import { celebrateInColors } from "@/components/cowry/celebrate"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"
import { THEMES, type ParticleKind, type TreasureTheme } from "@/components/cowry/treasureTiers"
import { playSound } from "@/lib/sound"

/**
 * The arrivals for Treasures without a scene of their own, scaled to what they cost
 * (treasureTiers.ts). Level 1 is the plain shower, drawn by GiftSplash itself; these are the
 * ones above it:
 *
 *   SparkleBurst     level 2 — sparkles thrown out from the middle, over the shower
 *   SpotlightMoment  level 3 — the icon rises large into a beam of light, then confetti
 *   ThemeMoment      level 4 and 5 — a band of the category's own world across the screen
 *
 * The two moments run in FullScreenMoment, so they are skippable with a tap or Esc, carry
 * the "Congratulations" caption, and hold one still frame under reduced motion.
 */

/** Sparkles bursting from the centre of the screen. Decoration only: it never takes a click. */
export function SparkleBurst({ colors = ["#fff7d6", "#f3c969", "#ffffff", "#5eead4"] }: { colors?: string[] }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.2
        const distance = 18 + Math.random() * 22
        return {
          dx: `${Math.cos(angle) * distance}vmin`,
          dy: `${Math.sin(angle) * distance}vmin`,
          size: 8 + Math.random() * 12,
          delay: Math.random() * 0.15,
          color: colors[i % colors.length],
        }
      }),
    [colors],
  )
  useEffect(() => {
    playSound("sparkle")
  }, [])
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[65] overflow-hidden" aria-hidden="true">
      {sparks.map((spark, i) => (
        <span
          key={i}
          className="treasure-spark absolute left-1/2 top-1/2"
          style={
            {
              width: spark.size,
              height: spark.size,
              animationDelay: `${spark.delay}s`,
              "--spark-dx": spark.dx,
              "--spark-dy": spark.dy,
            } as CSSProperties
          }
        >
          <Sparkle color={spark.color} />
        </span>
      ))}
    </div>,
    document.body,
  )
}

function Sparkle({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 20" className="size-full" aria-hidden="true">
      <path d="M10 0 L12.2 7.8 L20 10 L12.2 12.2 L10 20 L7.8 12.2 L0 10 L7.8 7.8 Z" fill={color} />
    </svg>
  )
}

export const SPOTLIGHT_MS = 3000

/** Level 3: the icon rises large into a beam of light, its colours thrown out as confetti. */
export function SpotlightMoment({
  gift,
  colors,
  label,
  onDone,
}: {
  gift: GiftLike
  colors: string[]
  label: string
  onDone: () => void
}) {
  useEffect(() => {
    const burst = window.setTimeout(() => celebrateInColors(colors, { x: 0.5, y: 0.5 }, 80), 700)
    return () => window.clearTimeout(burst)
  }, [colors])

  return (
    <FullScreenMoment durationMs={SPOTLIGHT_MS} sound="spotlight" label={label} onDone={onDone}>
      {(still) => (
        <>
          <div className="animate-fadeIn absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,20,26,0.35),rgba(16,20,26,0.82)_70%)]" />
          {/* The beam, turning slowly behind. */}
          <div
            className={`absolute left-1/2 top-1/2 size-[140vmax] ${still ? "opacity-40" : "eagle-rays opacity-60"}`}
            style={{
              transform: "translate(-50%, -50%)",
              background: `repeating-conic-gradient(from 0deg, ${colors[0]}66 0deg 6deg, transparent 6deg 22deg)`,
              maskImage: "radial-gradient(circle, black 0%, transparent 45%)",
              WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 45%)",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={still ? "relative" : "treasure-rise relative"}>
              <span
                className={`absolute inset-[-35%] rounded-full ${still ? "" : "treasure-halo"}`}
                style={{ background: `radial-gradient(circle, ${colors[0]}cc, ${colors[1] ?? colors[0]}44 45%, transparent 70%)` }}
                aria-hidden="true"
              />
              <GiftIcon gift={gift} size={168} className="relative" />
            </div>
          </div>
        </>
      )}
    </FullScreenMoment>
  )
}

export const THEME_MS = 3600

/** One thing that floats, falls or pulses through a themed band. */
function Particle({ kind, color }: { kind: ParticleKind; color: string }) {
  switch (kind) {
    case "orb":
      return <span className="block size-full rounded-full blur-[1px]" style={{ background: `radial-gradient(circle, #ffffff, ${color} 60%, transparent 72%)` }} />
    case "diamond":
      return <span className="block size-full rotate-45 border-2" style={{ borderColor: color, background: `${color}33` }} />
    case "steam":
      return <span className="block h-full w-1/2 rounded-full bg-white/50 blur-md" />
    case "ray":
      return <span className="block h-full w-1/4 rounded-full" style={{ background: `linear-gradient(180deg, ${color}, transparent)` }} />
    case "leaf":
      return <Leaf className="size-full" color={color} fill={color} strokeWidth={1.2} />
    case "note":
      return <Music className="size-full" color={color} strokeWidth={2.4} />
    case "heart":
      return <Heart className="size-full" color={color} fill={color} strokeWidth={1} />
    default:
      return <Sparkle color={color} />
  }
}

/** Levels 4 and 5: a band of the category's own world across the screen, the icon at its heart. */
export function ThemeMoment({
  gift,
  theme,
  label,
  onDone,
}: {
  gift: GiftLike
  theme: TreasureTheme
  label: string
  onDone: () => void
}) {
  const look = THEMES[theme]
  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: Math.random() * 100,
        size: 14 + Math.random() * 26,
        delay: Math.random() * 2.2,
        duration: 2.2 + Math.random() * 1.6,
        drift: `${(Math.random() - 0.5) * 16}vw`,
        spin: `${(Math.random() > 0.5 ? 1 : -1) * (90 + Math.random() * 220)}deg`,
        color: look.colors[i % look.colors.length],
      })),
    [look],
  )

  useEffect(() => {
    const burst = window.setTimeout(() => celebrateInColors(look.colors, { x: 0.5, y: 0.5 }, theme === "premium" ? 140 : 100), 900)
    return () => window.clearTimeout(burst)
  }, [look, theme])

  return (
    <FullScreenMoment durationMs={THEME_MS} sound={look.sound} label={label} onDone={onDone}>
      {(still) => (
        <>
          <div className="animate-fadeIn absolute inset-0 bg-[#0b0f17]/60" />
          {/* The band: the category's world, opening from the middle. */}
          <div
            className={`absolute inset-x-0 top-[24vh] h-[58vh] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.45)] ${still ? "" : "treasure-band"}`}
            style={{ background: look.backdrop }}
          >
            {theme === "heritage" && (
              // A woven pattern drifting across, in the spirit of a printed cloth.
              <div
                className={`absolute inset-0 opacity-25 ${still ? "" : "treasure-weave"}`}
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, #fef3c7 0 3px, transparent 3px 22px), repeating-linear-gradient(-45deg, #fef3c7 0 3px, transparent 3px 22px)",
                }}
                aria-hidden="true"
              />
            )}
            {theme === "music" && !still && (
              // An equaliser pulsing along the bottom.
              <div className="absolute inset-x-0 bottom-0 flex h-1/3 items-end justify-center gap-1.5 px-6 opacity-70" aria-hidden="true">
                {Array.from({ length: 24 }, (_, i) => (
                  <span
                    key={i}
                    className="treasure-eq w-2 rounded-t-full bg-white/80"
                    style={{ animationDelay: `${(i % 6) * 0.12}s`, animationDuration: `${0.5 + (i % 4) * 0.15}s` }}
                  />
                ))}
              </div>
            )}
            {!still &&
              particles.map((particle, i) => (
                <span
                  key={i}
                  className={`absolute ${look.drift === "up" ? "treasure-float bottom-0" : "treasure-fall top-0"}`}
                  style={
                    {
                      left: `${particle.left}%`,
                      width: particle.size,
                      height: look.particle === "steam" ? particle.size * 2 : particle.size,
                      animationDelay: `${particle.delay}s`,
                      animationDuration: `${particle.duration}s`,
                      "--particle-dx": particle.drift,
                      "--particle-spin": particle.spin,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                >
                  <Particle kind={look.particle} color={particle.color} />
                </span>
              ))}
          </div>

          <div className="absolute inset-x-0 top-[24vh] flex h-[58vh] items-center justify-center">
            <div className={still ? "relative" : "treasure-rise relative"}>
              <span
                className={`absolute inset-[-40%] rounded-full ${still ? "" : "treasure-halo"}`}
                style={{ background: `radial-gradient(circle, ${look.colors[0]}, ${look.colors[1]}55 45%, transparent 70%)` }}
                aria-hidden="true"
              />
              <GiftIcon gift={gift} size={theme === "premium" ? 190 : 160} className="relative" />
            </div>
          </div>
        </>
      )}
    </FullScreenMoment>
  )
}
