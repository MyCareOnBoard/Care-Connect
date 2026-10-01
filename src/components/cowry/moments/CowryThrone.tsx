import { useId, useMemo, type CSSProperties } from "react"
import { Crown } from "lucide-react"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"

/**
 * Cowry Throne: royal purple, gold light fanning out; a golden throne studded with cowries
 * rises into place, a crown descends and settles on it with a flash, and a shower of cowry
 * shells falls around it.
 */

export const THRONE_MS = 5000

function Throne() {
  const id = useId().replace(/:/g, "")
  const gold = `${id}-gold`
  // Cowries set along the throne's back, in an arch.
  const studs = Array.from({ length: 7 }, (_, i) => {
    const t = (i / 6) * Math.PI
    return { x: 100 - Math.cos(t) * 62, y: 70 - Math.sin(t) * 52 }
  })
  return (
    <svg viewBox="0 0 200 260" className="h-[min(56vh,440px)] overflow-visible drop-shadow-[0_24px_40px_rgba(0,0,0,0.6)]" aria-hidden="true">
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff4cf" />
          <stop offset="35%" stopColor="#f3c969" />
          <stop offset="70%" stopColor="#c8963e" />
          <stop offset="100%" stopColor="#6b4410" />
        </linearGradient>
      </defs>
      {/* The high arched back. */}
      <path d="M30 150 L 30 70 C 30 20, 170 20, 170 70 L 170 150 Z" fill={`url(#${gold})`} stroke="#6b4410" strokeWidth="3" />
      <path d="M48 150 L 48 78 C 48 44, 152 44, 152 78 L 152 150 Z" fill="#6d28d9" stroke="#4c1d95" strokeWidth="2" />
      {/* Seat and arms. */}
      <rect x="20" y="146" width="160" height="26" rx="8" fill={`url(#${gold})`} stroke="#6b4410" strokeWidth="3" />
      <rect x="8" y="118" width="30" height="40" rx="8" fill={`url(#${gold})`} stroke="#6b4410" strokeWidth="3" />
      <rect x="162" y="118" width="30" height="40" rx="8" fill={`url(#${gold})`} stroke="#6b4410" strokeWidth="3" />
      {/* Legs. */}
      <path d="M34 172 L 28 250 L 48 250 L 54 172 Z M146 172 L 152 250 L 172 250 L 166 172 Z" fill={`url(#${gold})`} stroke="#6b4410" strokeWidth="3" />
      {/* Cowries set along the back. */}
      {studs.map((stud, i) => (
        <foreignObject key={i} x={stud.x - 9} y={stud.y - 9} width="18" height="18">
          <CowryIcon size={18} />
        </foreignObject>
      ))}
      <ellipse cx="80" cy="60" rx="18" ry="6" fill="#ffffff" opacity="0.35" transform="rotate(-20 80 60)" />
    </svg>
  )
}

export function CowryThrone({ onDone }: { onDone: () => void }) {
  // Cowries showering down once it is crowned (drawn inside the scene, which sits above the
  // app-wide rain layer). The rain keyframes are shared with IconRain.
  const shower = useMemo(
    () =>
      Array.from({ length: 36 }, () => {
        const spinFrom = Math.random() * 360
        return {
          left: Math.random() * 100,
          size: Math.round(22 + Math.random() * 22),
          delay: 2.3 + Math.random() * 1.2,
          duration: 1.6 + Math.random() * 1.2,
          drift: (Math.random() - 0.5) * 18,
          spinFrom,
          spinTo: spinFrom + (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
        }
      }),
    [],
  )
  return (
    <FullScreenMoment durationMs={THRONE_MS} sound="fanfare" label="The Cowry Throne is crowned" onDone={onDone}>
      {(still) => (
        <>
          <div className="animate-fadeIn absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,#5b21b6_0%,#2e1065_50%,#12052b_100%)]" />
          {/* Royal light fanning out behind the throne. */}
          <div
            className={`absolute left-1/2 top-[55%] size-[160vmax] ${still ? "opacity-30" : "eagle-rays"}`}
            style={{
              transform: "translate(-50%, -50%)",
              background: "repeating-conic-gradient(from 0deg, rgba(243,201,105,0.45) 0deg 5deg, transparent 5deg 18deg)",
              maskImage: "radial-gradient(circle, black 0%, transparent 50%)",
              WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 50%)",
            }}
            aria-hidden="true"
          />

          <div className="absolute inset-0 flex flex-col items-center justify-end pb-[8vh]">
            {/* The crown, descending onto the throne. */}
            <span className={still ? "relative z-10 -mb-6" : "throne-crown relative z-10 -mb-6"}>
              <span className="absolute inset-[-40%] rounded-full bg-[radial-gradient(circle,rgba(255,220,120,0.8),transparent_65%)]" aria-hidden="true" />
              <Crown
                className="relative size-[min(18vmin,130px)] drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
                color="#6b4410"
                fill="#f3c969"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </span>
            <span className={still ? "" : "throne-rise"}>
              <Throne />
            </span>
          </div>

          {/* The flash as the crown lands. */}
          {!still && <div className="throne-flash pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,236,170,0.95),transparent_60%)]" aria-hidden="true" />}

          {/* Cowries showering down once it is crowned. */}
          {!still &&
            shower.map((drop, i) => (
              <span
                key={i}
                className="cowry-rain-drop drop-shadow-[0_6px_8px_rgba(0,0,0,0.35)]"
                style={
                  {
                    left: `${drop.left}%`,
                    "--cowry-rain-dur": `${drop.duration}s`,
                    "--cowry-rain-delay": `${drop.delay}s`,
                    "--cowry-rain-dx": `${drop.drift}vw`,
                    "--cowry-rain-r0": `${drop.spinFrom}deg`,
                    "--cowry-rain-r1": `${drop.spinTo}deg`,
                  } as CSSProperties
                }
                aria-hidden="true"
              >
                <CowryIcon size={drop.size} />
              </span>
            ))}
        </>
      )}
    </FullScreenMoment>
  )
}
