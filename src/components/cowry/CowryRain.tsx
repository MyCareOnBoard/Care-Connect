import { useMemo, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { CowryIcon } from "@/components/cowry/CowryIcon"

/** How long the rain runs before it should be removed. Longest drop is duration + delay. */
export const RAIN_MS = 3400
const RAIN_DROPS = 28

interface IconRainProps {
  /** Changes on every shower, so each one gets fresh positions. */
  seed: number
  drops?: number
  /** Draws one falling item at the given pixel size. */
  renderDrop: (size: number) => ReactNode
  /** Smallest and largest drop, in pixels. */
  sizeRange?: [number, number]
}

/**
 * Anything falling across the whole screen — Cowry shells, or a gift's own icon.
 *
 * Portalled to the body so a dialog's rounded, clipped box does not cut the rain off at
 * its edges. Pointer-events are off: it is weather, not something to click.
 */
export function IconRain({ seed, drops: count = RAIN_DROPS, renderDrop, sizeRange = [18, 44] }: IconRainProps) {
  const [minSize, maxSize] = sizeRange
  const drops = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `${seed}-${i}`,
        left: Math.random() * 100,
        size: Math.round(minSize + Math.random() * (maxSize - minSize)),
        delay: Math.random() * 1.1,
        duration: 1.6 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 18,
        spinFrom: Math.random() * 360,
        spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
      })),
    [seed, count, minSize, maxSize],
  )

  return createPortal(
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-60" aria-hidden="true">
      {drops.map((drop) => (
        <span
          key={drop.id}
          className="cowry-rain-drop drop-shadow-[0_6px_8px_rgba(0,0,0,0.25)]"
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
          {renderDrop(drop.size)}
        </span>
      ))}
    </div>,
    document.body,
  )
}

/** Cowry shells falling across the whole screen. */
export function CowryRain({ seed, drops }: { seed: number; drops?: number }) {
  return <IconRain seed={seed} drops={drops} renderDrop={(size) => <CowryIcon size={size} />} />
}
