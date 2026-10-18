import { moving, useStill } from "@/components/cowry/moments/scene/sceneKit"

/**
 * Pieces only one Treasure scene uses (treasureScenes.tsx): the Safe Harbour's lighthouse,
 * the Golden Mile's road, the Open Door, the Legacy's scroll and the Rhythm's equaliser.
 */

/** The Safe Harbour's lighthouse, its beam sweeping the water. */
export function Lighthouse() {
  const still = useStill()
  return (
    <div className="absolute bottom-[33vh] left-[80%] h-[30vmin] w-[7vmin] -translate-x-1/2">
      <div
        className="absolute inset-0"
        style={{ clipPath: "polygon(22% 0, 78% 0, 100% 100%, 0 100%)", background: "repeating-linear-gradient(180deg, #f8fafc 0 18%, #dc2626 18% 36%)" }}
      />
      <span className="absolute -top-[3vmin] left-1/2 block h-[4vmin] w-[5vmin] -translate-x-1/2 rounded-t-full bg-[#fde68a] shadow-[0_0_30px_12px_rgba(253,230,138,0.8)]" />
      <span
        className={`${moving(still, "scene-beam")} absolute -top-[1vmin] right-1/2 block h-[16vmin] w-[90vw] -translate-y-1/2`}
        style={{ transformOrigin: "100% 50%", background: "linear-gradient(270deg, rgba(254,243,199,0.75), transparent)", clipPath: "polygon(0 0, 100% 45%, 100% 55%, 0 100%)" }}
      />
    </div>
  )
}

/** The Golden Mile: a road to the horizon, its markings running past, posts along it. */
export function GoldenRoad() {
  const still = useStill()
  return (
    <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full" aria-hidden="true">
      <path d="M300 600 L488 340 L512 340 L700 600 Z" fill="#b45309" />
      <path d="M300 600 L488 340 M700 600 L512 340" stroke="#fde68a" strokeWidth="4" />
      <path d="M500 600 L500 340" stroke="#fef3c7" strokeWidth="8" strokeDasharray="30 30" className={moving(still, "scene-road")} />
      {[0, 1, 2, 3].map((i) => {
        const t = 0.25 + i * 0.2
        const y = 600 - t * 260
        const spread = 200 * (1 - t) + 12
        const h = 40 * (1 - t) + 6
        return (
          <g key={i}>
            {[-1, 1].map((side) => (
              <rect key={side} x={500 + side * spread - 3} y={y - h} width="6" height={h} rx="2" fill="#fde68a" className={moving(still, "scene-pop")} style={{ animationDelay: `${0.4 + (3 - i) * 0.2}s` }} />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

/** The Open Door: a plain door in the dark, swinging inward onto light. */
export function Doorway() {
  const still = useStill()
  return (
    <div className="absolute inset-0 flex items-center justify-center [perspective:900px]">
      <div className="relative mb-[8vh] h-[min(56vmin,440px)] w-[min(32vmin,250px)] border-[10px] border-[#1e293b] bg-[radial-gradient(ellipse_at_50%_50%,#fffbeb,#fde68a_45%,#f59e0b)] shadow-[0_0_80px_rgba(253,230,138,0.5)]">
        <div className={`absolute inset-0 origin-left bg-[linear-gradient(90deg,#1e3a8a,#1e40af_50%,#172554)] ${moving(still, "scene-door")}`} style={still ? { transform: "rotateY(-105deg)" } : undefined}>
          <span className="absolute right-[12%] top-1/2 size-[8%] rounded-full bg-[#fde68a]" />
          <span className="absolute inset-x-[14%] top-[10%] h-[36%] border-2 border-[#93c5fd]/30" />
          <span className="absolute inset-x-[14%] bottom-[10%] h-[36%] border-2 border-[#93c5fd]/30" />
        </div>
        <span className="absolute -bottom-[calc(10px+3vmin)] left-1/2 h-[3vmin] w-[130%] -translate-x-1/2 bg-[#334155]" />
      </div>
    </div>
  )
}

/** The Legacy's scroll, unrolling, its lines written in. */
export function Scroll() {
  const still = useStill()
  return (
    <div className="absolute inset-x-0 top-[52%] flex justify-center">
      <div className={`relative h-[30vh] w-[min(80vw,640px)] ${moving(still, "scene-unroll")}`} style={{ animationDelay: "0.3s" }}>
        <div className="absolute inset-y-[6%] inset-x-[3%] rounded-sm bg-[linear-gradient(180deg,#fef3c7,#fde68a_60%,#f3c969)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]" />
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`absolute left-[14%] block h-[3px] rounded-full bg-[#92400e]/60 ${moving(still, "scene-unroll")}`}
            style={{ top: `${26 + i * 15}%`, width: `${72 - (i % 2) * 18}%`, transformOrigin: "0 50%", animationDelay: `${1.3 + i * 0.25}s` }}
          />
        ))}
        {[0, 100].map((x) => (
          <span key={x} className="absolute top-0 block h-full w-[5%] -translate-x-1/2 rounded-full bg-[linear-gradient(90deg,#78350f,#b45309_50%,#451a03)]" style={{ left: `${x}%` }} />
        ))}
      </div>
    </div>
  )
}

/** The Rhythm's equaliser, jumping along the bottom. */
export function Equaliser() {
  const still = useStill()
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-1/3 items-end justify-center gap-1.5 px-6 opacity-70" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} className={`${moving(still, "treasure-eq")} h-[40%] w-2 rounded-t-full bg-[linear-gradient(0deg,#a855f7,#f0abfc)]`} style={{ animationDelay: `${(i % 7) * 0.1}s`, animationDuration: `${0.4 + (i % 4) * 0.12}s` }} />
      ))}
    </div>
  )
}
