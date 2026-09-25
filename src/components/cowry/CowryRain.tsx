import { useMemo, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { CowryIcon } from "@/components/cowry/CowryIcon"

/** How long the rain runs before it should be removed. Longest drop is duration + delay. */
export const RAIN_MS = 3400
const RAIN_DROPS = 28

/**
 * Shells falling across the whole screen.
 *
 * Portalled to the body so the dialog's rounded, clipped box does not cut the rain off at
 * its edges. Pointer-events are off: it is weather, not something to click.
 */
export function CowryRain({ seed, drops: count = RAIN_DROPS }: { seed: number; drops?: number }) {
  const drops = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `${seed}-${i}`,
        left: Math.random() * 100,
        size: 18 + Math.random() * 26,
        delay: Math.random() * 1.1,
        duration: 1.6 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 18,
        spinFrom: Math.random() * 360,
        spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
      })),
    [seed, count],
  )

  return createPortal(
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-60" aria-hidden="true">
      {drops.map((drop) => (
        <span
          key={drop.id}
          className="cowry-rain-drop"
          style={
            {
              left: `${drop.left}%`,
              "--cowry-rain-dur": `${drop.duration}s`,
              "--cowry-rain-delay": `${drop.delay}s`,
              "--cowry-rain-dx": `${drop.drift}vw`,
              "--cowry-rain-r0": `${drop.spinFrom}deg`,
              "--cowry-rain-r1": `${drop.spinFrom + drop.spin}deg`,
            } as CSSProperties
          }
        >
          <CowryIcon size={drop.size} className="drop-shadow-[0_6px_8px_rgba(0,0,0,0.25)]" />
        </span>
      ))}
    </div>,
    document.body,
  )
}
