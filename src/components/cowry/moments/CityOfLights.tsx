import { useMemo, type CSSProperties } from "react"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"

/**
 * City of Lights: a night skyline across the bottom of the screen. Window by window the city
 * switches on in warm gold, searchlights sweep the sky, and soft lights float up like a city
 * glowing at night.
 */

export const CITY_MS = 4800

/** Buildings as [x, width, height] in a 1000-wide skyline. */
const BUILDINGS: Array<[number, number, number]> = [
  [0, 70, 180], [72, 50, 250], [124, 80, 150], [206, 60, 300], [268, 90, 210],
  [360, 55, 340], [417, 75, 190], [494, 65, 280], [561, 95, 230], [658, 50, 320],
  [710, 80, 170], [792, 60, 260], [854, 85, 200], [941, 59, 290],
]

export function CityOfLights({ onDone }: { onDone: () => void }) {
  // Every window, with a random moment to switch on.
  const windows = useMemo(() => {
    const list: Array<{ x: number; y: number; delay: number; warm: boolean }> = []
    for (const [x, width, height] of BUILDINGS) {
      for (let wy = 400 - height + 14; wy < 390; wy += 18) {
        for (let wx = x + 8; wx < x + width - 10; wx += 14) {
          if (Math.random() < 0.72) list.push({ x: wx, y: wy, delay: 0.2 + Math.random() * 2.6, warm: Math.random() < 0.8 })
        }
      }
    }
    return list
  }, [])
  const lights = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        left: Math.random() * 100,
        top: 20 + Math.random() * 50,
        size: 6 + Math.random() * 18,
        delay: Math.random() * 3,
        hue: ["#ffd166", "#ff9fb3", "#9ad0ff", "#fff1c7"][Math.floor(Math.random() * 4)],
      })),
    [],
  )

  return (
    <FullScreenMoment durationMs={CITY_MS} sound="city" label="The City of Lights switches on" onDone={onDone}>
      {(still) => (
        <>
          <div className="animate-fadeIn absolute inset-0 bg-[linear-gradient(180deg,#050816_0%,#0f1638_55%,#2a1f4d_100%)]" />

          {/* Searchlights sweeping the sky. */}
          {!still &&
            [18, 50, 82].map((left, i) => (
              <span
                key={left}
                className="city-beam absolute bottom-[30vh] h-[80vh] w-[14vw] origin-bottom bg-[linear-gradient(0deg,rgba(255,236,170,0.35),transparent)]"
                style={{ left: `calc(${left}% - 7vw)`, animationDelay: `${i * 0.5}s`, clipPath: "polygon(45% 100%, 55% 100%, 100% 0, 0 0)" } as CSSProperties}
                aria-hidden="true"
              />
            ))}

          {/* Floating lights. */}
          {lights.map((light, i) => (
            <span
              key={i}
              className={still ? "absolute rounded-full" : "city-bokeh absolute rounded-full"}
              style={{
                left: `${light.left}%`,
                top: `${light.top}%`,
                width: light.size,
                height: light.size,
                background: light.hue,
                filter: "blur(2px)",
                boxShadow: `0 0 ${light.size}px ${light.hue}`,
                opacity: still ? 0.6 : undefined,
                animationDelay: `${light.delay}s`,
              }}
              aria-hidden="true"
            />
          ))}

          {/* The skyline, its windows switching on. */}
          <svg viewBox="0 0 1000 400" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[55vh] w-full" aria-hidden="true">
            {BUILDINGS.map(([x, width, height]) => (
              <rect key={x} x={x} y={400 - height} width={width} height={height} fill="#0a0d1f" stroke="#1c2350" strokeWidth="1" />
            ))}
            {windows.map((window, i) => (
              <rect
                key={i}
                x={window.x}
                y={window.y}
                width="7"
                height="9"
                rx="1"
                fill={window.warm ? "#ffd166" : "#9ad0ff"}
                className={still ? undefined : "city-window"}
                style={{ animationDelay: `${window.delay}s`, filter: "drop-shadow(0 0 3px rgba(255,210,110,0.9))" }}
              />
            ))}
          </svg>
        </>
      )}
    </FullScreenMoment>
  )
}
