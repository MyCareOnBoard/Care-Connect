import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"

/**
 * Rising Sun: night turns to dawn. The sky warms from indigo through rose to gold, a great
 * sun climbs out from behind a line of hills and palms, its rays unfolding and turning, and
 * the whole screen fills with morning light.
 */

export const SUN_MS = 5200

export function RisingSun({ onDone }: { onDone: () => void }) {
  return (
    <FullScreenMoment durationMs={SUN_MS} sound="sunrise" label="A Rising Sun climbs" onDone={onDone}>
      {(still) => (
        <>
          {/* The sky, layered night → dawn → morning, each fading in over the last. */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#070a1f_0%,#141a45_60%,#2a2860_100%)]" />
          <div className={`absolute inset-0 bg-[linear-gradient(180deg,#3b2a6b_0%,#c2416f_55%,#f59e0b_100%)] ${still ? "opacity-100" : "sun-sky-dawn"}`} />
          <div className={`absolute inset-0 bg-[linear-gradient(180deg,#fbbf24_0%,#fde68a_45%,#fff7d6_100%)] ${still ? "opacity-0" : "sun-sky-day"}`} />

          {/* Rays, unfolding behind the sun and slowly turning. */}
          <div
            className={`absolute left-1/2 top-[58%] size-[170vmax] ${still ? "opacity-40" : "sun-rays"}`}
            style={{
              transform: "translate(-50%, -50%)",
              background: "repeating-conic-gradient(from 0deg, rgba(255,236,170,0.5) 0deg 5deg, transparent 5deg 20deg)",
              maskImage: "radial-gradient(circle, black 0%, transparent 50%)",
              WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 50%)",
            }}
            aria-hidden="true"
          />

          {/* The sun. */}
          <div className={`absolute left-1/2 top-[58%] ${still ? "" : "sun-rise"}`} style={{ transform: "translate(-50%, -50%)" }}>
            <span style={{ transform: "translate(-50%, -50%)" }} className="sun-halo absolute left-1/2 top-1/2 size-[min(80vmin,620px)] rounded-full bg-[radial-gradient(circle,rgba(255,214,120,0.7),rgba(255,160,60,0.25)_45%,transparent_70%)]" />
            <span className="relative block size-[min(38vmin,300px)] rounded-full bg-[radial-gradient(circle_at_40%_35%,#fffdf2_0%,#fff1b8_30%,#ffd166_62%,#ff9f1c_100%)] shadow-[0_0_120px_40px_rgba(255,190,80,0.65)]" />
          </div>

          {/* Hills and palms on the horizon, in silhouette. */}
          <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[34vh] w-full" aria-hidden="true">
            <path d="M0 120 C 150 70, 300 90, 420 110 C 560 135, 700 60, 860 90 C 930 104, 970 100, 1000 96 L 1000 200 L 0 200 Z" fill="#1a1030" />
            <path d="M0 150 C 180 120, 360 140, 520 150 C 700 162, 840 130, 1000 140 L 1000 200 L 0 200 Z" fill="#0d0820" />
            {/* Two palms. */}
            <g fill="#0d0820">
              <path d="M180 150 C 182 110, 178 80, 186 50 L 192 52 C 186 82, 190 112, 188 150 Z" />
              <path d="M188 52 C 160 40, 140 46, 124 60 C 150 50, 170 52, 188 56 Z M188 52 C 212 36, 236 40, 252 54 C 226 46, 206 50, 188 56 Z M188 50 C 180 30, 160 22, 146 24 C 166 30, 178 40, 186 54 Z M190 50 C 202 28, 222 22, 236 26 C 216 32, 202 40, 192 54 Z" />
              <path d="M820 142 C 822 112, 818 90, 826 66 L 831 68 C 826 92, 829 114, 827 142 Z" />
              <path d="M828 68 C 806 58, 790 62, 778 74 C 798 66, 814 68, 828 72 Z M828 68 C 848 56, 866 60, 878 72 C 858 64, 842 66, 828 72 Z M828 66 C 822 50, 806 44, 796 46 C 812 50, 822 58, 828 70 Z" />
            </g>
          </svg>

          {/* A wash of morning light across everything at the end. */}
          {!still && <div className="sun-bloom pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(255,244,210,0.9),rgba(255,220,150,0.3)_40%,transparent_75%)]" aria-hidden="true" />}
        </>
      )}
    </FullScreenMoment>
  )
}
