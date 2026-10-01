import { useId, useMemo } from "react"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"

/**
 * Ocean Pearl: the screen sinks underwater — shafts of light swaying through deep blue,
 * bubbles rising — and a great shell on the sea floor slowly opens to reveal a pearl that
 * glows brighter and brighter, its lustre shifting through soft rainbow colours.
 */

export const PEARL_MS = 5000

function Shell({ still }: { still: boolean }) {
  const id = useId().replace(/:/g, "")
  const shell = `${id}-shell`
  // A scalloped half-shell, with ribs fanning from the hinge.
  const half = "M-150 0 C -150 -90, -80 -150, 0 -150 C 80 -150, 150 -90, 150 0 Z"
  const ribs = [-120, -80, -40, 0, 40, 80, 120].map((x) => `M0 0 L ${x} ${-Math.sqrt(Math.max(0, 150 * 150 - x * x)) * 0.95}`).join(" ")
  return (
    <svg viewBox="-190 -200 380 330" className="w-[min(76vw,560px)] overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={shell} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbe8f0" />
          <stop offset="55%" stopColor="#e9b7cb" />
          <stop offset="100%" stopColor="#a86c86" />
        </linearGradient>
        <radialGradient id={`${id}-pearl`} cx="36%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#fbf7ff" />
          <stop offset="60%" stopColor="#e3d6f3" />
          <stop offset="100%" stopColor="#9d8cc4" />
        </radialGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="40%" stopColor="rgba(220,235,255,0.45)" />
          <stop offset="100%" stopColor="rgba(220,235,255,0)" />
        </radialGradient>
      </defs>

      {/* Bottom half, resting on the sea floor. */}
      <g transform="scale(1 -0.55)">
        <path d={half} fill={`url(#${shell})`} stroke="#8a4f69" strokeWidth="2" />
        <path d={ribs} stroke="#b77a94" strokeWidth="2" fill="none" opacity="0.6" />
      </g>

      {/* Top half, lifting open on its hinge — behind the pearl, which grows out of it. */}
      <g className={still ? undefined : "pearl-lid"} transform={still ? "translate(0 -36)" : undefined}>
        <path d={half} fill={`url(#${shell})`} stroke="#8a4f69" strokeWidth="2" />
        <path d={ribs} stroke="#b77a94" strokeWidth="2" fill="none" opacity="0.6" />
      </g>

      {/* The pearl, glowing brighter as the shell opens. */}
      <circle cx="0" cy="-34" r="120" fill={`url(#${id}-glow)`} className={still ? undefined : "pearl-glow"} />
      <g className={still ? undefined : "pearl-reveal"}>
        <circle cx="0" cy="-34" r="38" fill={`url(#${id}-pearl)`} className={still ? undefined : "pearl-lustre"} />
        <ellipse cx="-12" cy="-48" rx="11" ry="7" fill="#ffffff" opacity="0.85" />
      </g>
    </svg>
  )
}

export function OceanPearl({ onDone }: { onDone: () => void }) {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 30 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 3.5,
        duration: 2.4 + Math.random() * 2,
        size: 6 + Math.random() * 16,
      })),
    [],
  )

  return (
    <FullScreenMoment durationMs={PEARL_MS} sound="pearl" label="An Ocean Pearl is revealed" onDone={onDone}>
      {(still) => (
        <>
          <div className="animate-fadeIn absolute inset-0 bg-[linear-gradient(180deg,#0a4a6b_0%,#06304f_45%,#041a33_100%)]" />
          {/* Light shafts from the surface, swaying. */}
          {!still && (
            <div className="pearl-caustics absolute -inset-x-1/4 top-0 h-full opacity-50" aria-hidden="true">
              {[10, 28, 46, 64, 82].map((left, i) => (
                <span
                  key={left}
                  className="absolute top-0 h-full w-[7vw] bg-[linear-gradient(180deg,rgba(180,230,255,0.55),transparent_75%)]"
                  style={{ left: `${left}%`, transform: `skewX(${-12 + i * 5}deg)` }}
                />
              ))}
            </div>
          )}
          {/* Bubbles rising. */}
          {!still &&
            bubbles.map((bubble, i) => (
              <span
                key={i}
                className="pearl-bubble absolute bottom-0 rounded-full border border-white/60 bg-white/10"
                style={{ left: `${bubble.left}%`, width: bubble.size, height: bubble.size, animationDelay: `${bubble.delay}s`, animationDuration: `${bubble.duration}s` }}
                aria-hidden="true"
              />
            ))}
          {/* Sand. */}
          <div className="absolute inset-x-0 bottom-0 h-[18vh] bg-[radial-gradient(ellipse_at_50%_120%,#c2a476_0%,#5d4a33_55%,transparent_80%)]" />

          <div className="absolute inset-x-0 bottom-[10vh] flex justify-center">
            <Shell still={still} />
          </div>
        </>
      )}
    </FullScreenMoment>
  )
}
