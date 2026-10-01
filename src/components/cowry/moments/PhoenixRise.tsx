import { useId, useMemo, type CSSProperties } from "react"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"

/**
 * Phoenix Rise: embers glow in the dark, then a phoenix of fire rises out of them — wings
 * folded, then sweeping open — climbing into a sky that burns from night to flame, sparks
 * streaming from its feathers.
 */

export const PHOENIX_MS = 4800

/** One wing of flame-feathers, drawn for the right side; the left is its mirror. */
const WING = "M0 0 C 40 -30, 110 -80, 190 -150 C 170 -110, 150 -80, 140 -60 C 175 -80, 205 -95, 235 -100 C 200 -70, 175 -50, 160 -35 C 190 -40, 215 -40, 240 -30 C 200 -15, 160 0, 120 5 C 80 10, 40 10, 0 12 Z"

function Phoenix({ still }: { still: boolean }) {
  const id = useId().replace(/:/g, "")
  const fire = `${id}-fire`
  const body = `${id}-body`
  return (
    <svg viewBox="-260 -200 520 420" className="w-[min(86vw,720px)] drop-shadow-[0_0_40px_rgba(255,120,30,0.8)]" aria-hidden="true">
      <defs>
        <linearGradient id={fire} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#7f1d1d" />
          <stop offset="35%" stopColor="#ef4444" />
          <stop offset="65%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <radialGradient id={body} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#dc2626" />
        </radialGradient>
      </defs>

      {/* Wings: folded, then sweeping open. */}
      <g className={still ? undefined : "phoenix-wing-right"}>
        <path d={WING} fill={`url(#${fire})`} opacity="0.95" />
      </g>
      <g className={still ? undefined : "phoenix-wing-left"} transform="scale(-1 1)">
        <path d={WING} fill={`url(#${fire})`} opacity="0.95" />
      </g>

      {/* Tail of long flame feathers. */}
      <path d="M-14 40 C -40 110, -70 160, -90 210 C -50 170, -20 140, 0 100 C 20 140, 50 170, 90 210 C 70 160, 40 110, 14 40 Z" fill={`url(#${fire})`} className={still ? undefined : "phoenix-tail"} />
      {/* Body and head. */}
      <path d="M0 -70 C 22 -40, 26 10, 14 50 C 8 64, -8 64, -14 50 C -26 10, -22 -40, 0 -70 Z" fill={`url(#${body})`} />
      <circle cx="0" cy="-78" r="16" fill={`url(#${body})`} />
      <path d="M0 -94 C 10 -120, 4 -140, -6 -150 C 0 -130, -10 -118, -8 -96 Z M8 -92 C 26 -110, 30 -128, 26 -140 C 22 -122, 12 -112, 4 -94 Z" fill="#fde68a" />
      <path d="M12 -80 L 26 -74 L 12 -70 Z" fill="#b45309" />
      <circle cx="5" cy="-81" r="2.5" fill="#450a0a" />
    </svg>
  )
}

export function PhoenixRise({ onDone }: { onDone: () => void }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 36 }, () => ({
        left: 30 + Math.random() * 40,
        delay: 0.8 + Math.random() * 3,
        duration: 1.6 + Math.random() * 1.4,
        size: 3 + Math.random() * 5,
        drift: (Math.random() - 0.5) * 40,
      })),
    [],
  )

  return (
    <FullScreenMoment durationMs={PHOENIX_MS} sound="phoenix" label="A Phoenix rises" onDone={onDone}>
      {(still) => (
        <>
          <div className="absolute inset-0 bg-[#0a0402]" />
          <div className={`absolute inset-0 bg-[linear-gradient(0deg,#7c2d12_0%,#dc2626_35%,#f97316_65%,#fbbf24_100%)] ${still ? "opacity-70" : "phoenix-sky"}`} />
          {/* The embers it rises from. */}
          <div className="phoenix-embers absolute inset-x-0 bottom-0 h-[26vh] bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,140,40,0.9),rgba(180,40,10,0.5)_40%,transparent_75%)]" />

          {!still &&
            sparks.map((spark, i) => (
              <span
                key={i}
                className="flame-ember absolute bottom-[10vh] rounded-full bg-[#ffd27a] shadow-[0_0_10px_3px_rgba(255,170,60,0.9)]"
                style={
                  {
                    left: `${spark.left}%`,
                    width: spark.size,
                    height: spark.size,
                    animationDelay: `${spark.delay}s`,
                    animationDuration: `${spark.duration}s`,
                    "--ember-dx": `${spark.drift}vw`,
                  } as CSSProperties
                }
                aria-hidden="true"
              />
            ))}

          <div className={`absolute inset-x-0 top-[12vh] flex justify-center ${still ? "" : "phoenix-rise"}`}>
            <Phoenix still={still} />
          </div>
        </>
      )}
    </FullScreenMoment>
  )
}
