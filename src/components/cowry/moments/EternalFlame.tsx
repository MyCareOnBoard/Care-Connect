import { useId, useMemo, type CSSProperties } from "react"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"

/**
 * Eternal Flame: fire rises across the whole width of the screen — a wall of tongues, each
 * flickering on its own rhythm — climbs until it fills the view, embers streaming upward,
 * then settles back to one steady flame at the centre that does not go out.
 */

export const FLAME_MS = 4800

/** One tongue of fire, base at the bottom of a 100×160 view. */
const TONGUE = "M50 160 C 12 150, 6 110, 28 82 C 36 70, 30 52, 44 30 C 46 58, 58 60, 60 42 C 78 64, 96 104, 84 138 C 78 152, 66 160, 50 160 Z"
const CORE = "M50 160 C 30 154, 26 128, 40 108 C 44 118, 52 118, 54 104 C 66 120, 72 142, 62 154 C 58 158, 54 160, 50 160 Z"

function Tongue({ gradient, core, style, className }: { gradient: string; core: string; style?: CSSProperties; className?: string }) {
  return (
    <svg viewBox="0 0 100 160" className={className} style={style} preserveAspectRatio="none" aria-hidden="true">
      <path d={TONGUE} fill={`url(#${gradient})`} />
      <path d={CORE} fill={`url(#${core})`} opacity="0.9" />
    </svg>
  )
}

export function EternalFlame({ onDone }: { onDone: () => void }) {
  const id = useId().replace(/:/g, "")
  const tongues = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: (i / 15) * 100,
        height: 55 + Math.random() * 35,
        width: 12 + Math.random() * 8,
        flicker: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 0.6,
      })),
    [],
  )
  const embers = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        left: Math.random() * 100,
        delay: 0.3 + Math.random() * 3.2,
        duration: 1.8 + Math.random() * 1.6,
        size: 3 + Math.random() * 5,
        drift: (Math.random() - 0.5) * 16,
      })),
    [],
  )
  const fire = `${id}-fire`
  const core = `${id}-core`

  return (
    <FullScreenMoment durationMs={FLAME_MS} sound="flame" label="An Eternal Flame blazes" onDone={onDone}>
      {(still) => (
        <>
          {/* Shared gradients for every tongue. */}
          <svg width="0" height="0" className="absolute" aria-hidden="true">
            <defs>
              <linearGradient id={fire} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#7f1d1d" />
                <stop offset="25%" stopColor="#dc2626" />
                <stop offset="55%" stopColor="#f97316" />
                <stop offset="85%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#fde68a" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id={core} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#fff7d6" />
                <stop offset="70%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          <div className="animate-fadeIn absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,#7c2d12_0%,#2a0d05_55%,#0a0402_100%)]" />
          <div className="flame-heat absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,140,40,0.55),transparent_70%)]" />

          {/* The wall of fire, rising to fill the screen and settling back. */}
          {!still && (
            <div className="flame-wall absolute inset-x-0 bottom-0 h-full" aria-hidden="true">
              {tongues.map((tongue, i) => (
                <Tongue
                  key={i}
                  gradient={fire}
                  core={core}
                  className="flame-flicker absolute bottom-0"
                  style={
                    {
                      left: `calc(${tongue.left}% - ${tongue.width / 2}vw)`,
                      width: `${tongue.width}vw`,
                      height: `${tongue.height}%`,
                      animationDuration: `${tongue.flicker}s`,
                      animationDelay: `${tongue.delay}s`,
                      filter: "blur(0.5px) drop-shadow(0 0 18px rgba(255,120,30,0.6))",
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}

          {/* Embers streaming up. */}
          {!still &&
            embers.map((ember, i) => (
              <span
                key={i}
                className="flame-ember absolute bottom-0 rounded-full bg-[#ffd27a] shadow-[0_0_8px_3px_rgba(255,170,60,0.9)]"
                style={
                  {
                    left: `${ember.left}%`,
                    width: ember.size,
                    height: ember.size,
                    animationDelay: `${ember.delay}s`,
                    animationDuration: `${ember.duration}s`,
                    "--ember-dx": `${ember.drift}vw`,
                  } as CSSProperties
                }
                aria-hidden="true"
              />
            ))}

          {/* The flame that stays. */}
          <div className="absolute inset-x-0 bottom-[12vh] flex justify-center">
            <Tongue
              gradient={fire}
              core={core}
              className={still ? "" : "flame-eternal flame-flicker"}
              style={{ width: "min(26vw, 220px)", height: "min(46vh, 380px)", filter: "drop-shadow(0 0 40px rgba(255,150,40,0.9))" }}
            />
          </div>
        </>
      )}
    </FullScreenMoment>
  )
}
