import { useEffect, useMemo, type CSSProperties } from "react"
import { Hand, Heart } from "lucide-react"
import { GiftIcon } from "@/components/cowry/GiftIcon"
import type { GiftLike } from "@/components/cowry/giftIcons"
import { celebrateInColors } from "@/components/cowry/celebrate"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"
import type { SoundName } from "@/lib/sound"
import type { HumanScene } from "@/components/cowry/treasureTiers"

/**
 * The Human Connection Treasures, each arriving full screen as a scene of what it means:
 *
 *   The Thank You          thanks rising across the screen in the languages it is said in
 *   The Friendship Thread  a golden thread woven across the screen, tied into a heart
 *   The Warm Embrace       two arms closing round a glowing heart, warmth rippling out
 *   The Helping Hand       a hand reaching down, a hand reaching up, meeting in light
 *   The Welcome            a door swinging open, light flooding through
 *
 * All in the category's rose and warm gold, all in FullScreenMoment (skippable, captioned,
 * one still frame under reduced motion).
 */

export const HUMAN_MS = 4800

const ROSE = ["#fecdd3", "#fb7185", "#ffffff", "#fde68a", "#f43f5e"]

const SOUNDS: Record<HumanScene, SoundName> = {
  "thank-you": "bloom",
  "friendship-thread": "pearl",
  "warm-embrace": "sunrise",
  "helping-hand": "spotlight",
  welcome: "fanfare",
}

/** The rose dusk every Human Connection scene opens on. */
function Backdrop() {
  return (
    <div className="animate-fadeIn absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,#be123c_0%,#881337_45%,#3b0718_100%)]" />
  )
}

/* ── The Thank You ─────────────────────────────────────────────────────────── */

/** Thank you, as it is said across the continent and beyond. */
const THANKS = ["Medaase", "E ṣé", "Na gode", "Daalụ", "Asante", "Akpe", "Merci", "Thank you", "Ngiyabonga", "Obrigado"]

function ThankYou({ gift, still }: { gift: GiftLike; still: boolean }) {
  const words = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        text: THANKS[i % THANKS.length],
        left: 6 + Math.random() * 88,
        size: 16 + Math.random() * 22,
        delay: Math.random() * 2.6,
        duration: 2.6 + Math.random() * 1.4,
      })),
    [],
  )
  return (
    <>
      {!still &&
        words.map((word, i) => (
          <span
            key={i}
            className="human-word absolute bottom-[-8vh] whitespace-nowrap font-bold text-[#ffe4e6] drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]"
            style={{ left: `${word.left}%`, fontSize: word.size, animationDelay: `${word.delay}s`, animationDuration: `${word.duration}s` }}
          >
            {word.text}
          </span>
        ))}
      <Hero gift={gift} still={still} />
    </>
  )
}

/* ── The Friendship Thread ─────────────────────────────────────────────────── */

const THREAD = "M -40 340 C 120 120, 260 520, 420 300 S 700 80, 840 300 S 1000 520, 1040 300"
const HEART = "M500 410 C 440 360, 380 320, 380 270 C 380 235, 405 215, 435 215 C 465 215, 485 235, 500 255 C 515 235, 535 215, 565 215 C 595 215, 620 235, 620 270 C 620 320, 560 360, 500 410 Z"
const BEADS = [[110, 214], [260, 400], [420, 300], [590, 165], [760, 236], [920, 420]]

function FriendshipThread({ still }: { still: boolean }) {
  return (
    <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <linearGradient id="human-thread" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <filter id="human-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#human-glow)">
        <path d={THREAD} fill="none" stroke="url(#human-thread)" strokeWidth="7" strokeLinecap="round" pathLength={1} className={still ? undefined : "human-draw"} />
        {BEADS.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="13" fill="#fde68a" stroke="#ffffff" strokeWidth="3" className={still ? undefined : "human-bead"} style={{ animationDelay: `${0.35 + i * 0.22}s` }} />
        ))}
        {/* The ends: two people, as points of light. */}
        <circle cx="40" cy="250" r="22" fill="#fff1f2" className={still ? undefined : "human-pulse"} />
        <circle cx="960" cy="350" r="22" fill="#fff1f2" className={still ? undefined : "human-pulse"} />
        {/* Tied into a heart. */}
        <path
          d={HEART}
          fill="#f43f5e"
          fillOpacity="0.85"
          stroke="#fde68a"
          strokeWidth="7"
          strokeLinejoin="round"
          pathLength={1}
          className={still ? undefined : "human-heart-tie"}
        />
      </g>
    </svg>
  )
}

/* ── The Warm Embrace ──────────────────────────────────────────────────────── */

function WarmEmbrace({ still }: { still: boolean }) {
  return (
    <>
      {!still &&
        [0, 0.5, 1, 1.5].map((delay) => (
          <span
            key={delay}
            className="human-ring absolute left-1/2 top-1/2 size-[50vmin] rounded-full border-4 border-[#fde68a]/60"
            style={{ animationDelay: `${1.3 + delay}s`, transform: "translate(-50%, -50%)" }}
            aria-hidden="true"
          />
        ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative size-[min(70vmin,560px)]">
          <span className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.85),rgba(251,113,133,0.3)_50%,transparent_70%)]" aria-hidden="true" />
          <span className={`absolute inset-0 flex items-center justify-center ${still ? "" : "human-heartbeat"}`}>
            <Heart className="size-[42%] drop-shadow-[0_10px_30px_rgba(0,0,0,0.4)]" color="#fff1f2" fill="#f43f5e" strokeWidth={1.2} aria-hidden="true" />
          </span>
          {/* Two arms, sweeping in from each side to hold it. */}
          <svg viewBox="0 0 400 400" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id="human-arm" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>
            </defs>
            <path d="M70 340 C 10 240, 40 110, 175 70" stroke="url(#human-arm)" strokeWidth="38" strokeLinecap="round" fill="none" className={still ? undefined : "human-arm-left"} />
            <path d="M330 340 C 390 240, 360 110, 225 70" stroke="url(#human-arm)" strokeWidth="38" strokeLinecap="round" fill="none" className={still ? undefined : "human-arm-right"} />
          </svg>
        </div>
      </div>
    </>
  )
}

/* ── The Helping Hand ──────────────────────────────────────────────────────── */

function HelpingHand({ still }: { still: boolean }) {
  return (
    <>
      {!still && (
        <span
          className="human-flash absolute left-1/2 top-1/2 size-[80vmin] rounded-full bg-[radial-gradient(circle,rgba(255,250,235,0.95),rgba(253,230,138,0.45)_35%,transparent_65%)]"
          style={{ transform: "translate(-50%, -50%)" }}
          aria-hidden="true"
        />
      )}
      {/* Reaching down from above … */}
      <div className="absolute inset-x-0 top-0 flex h-1/2 justify-center">
        <span className={still ? "mt-[14vh]" : "human-reach-down"}>
          <Hand className="size-[min(34vmin,260px)] rotate-180 drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]" color="#fff1f2" fill="#fda4af" strokeWidth={1.2} aria-hidden="true" />
        </span>
      </div>
      {/* … and up from below, meeting in the middle. */}
      <div className="absolute inset-x-0 bottom-0 flex h-1/2 items-end justify-center">
        <span className={still ? "mb-[14vh]" : "human-reach-up"}>
          <Hand className="size-[min(34vmin,260px)] drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]" color="#fff1f2" fill="#fde68a" strokeWidth={1.2} aria-hidden="true" />
        </span>
      </div>
    </>
  )
}

/* ── The Welcome ───────────────────────────────────────────────────────────── */

function Welcome({ still }: { still: boolean }) {
  const petals = useMemo(
    () =>
      Array.from({ length: 24 }, () => ({
        left: Math.random() * 100,
        delay: 1.8 + Math.random() * 1.8,
        duration: 2.4 + Math.random() * 1.4,
        drift: `${(Math.random() - 0.5) * 20}vw`,
        color: ["#fecdd3", "#fde68a", "#ffffff", "#fda4af"][Math.floor(Math.random() * 4)],
      })),
    [],
  )
  return (
    <>
      {/* The light that floods out once the door is open. */}
      <span
        className={`absolute left-1/2 top-1/2 size-[46vmin] rounded-full bg-[radial-gradient(circle,rgba(255,247,214,1),rgba(253,230,138,0.6)_40%,transparent_70%)] ${still ? "opacity-70" : "human-flood"}`}
        style={{ transform: "translate(-50%, -50%)" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center [perspective:900px]">
        <div className="relative h-[min(54vmin,440px)] w-[min(34vmin,280px)] rounded-t-[999px] border-[10px] border-[#7c2d12] bg-[radial-gradient(ellipse_at_50%_40%,#fffbeb,#fde68a_45%,#f59e0b)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          {/* The door itself, swinging open on its left hinge. */}
          <div className={`absolute inset-0 origin-left rounded-t-[999px] bg-[linear-gradient(90deg,#9a3412,#c2410c_50%,#7c2d12)] ${still ? "opacity-0" : "human-door"}`}>
            <span className="absolute right-[14%] top-1/2 size-[9%] rounded-full bg-[#fde68a] shadow-[0_0_8px_#fde68a]" />
            <span className="absolute inset-x-[16%] top-[18%] h-[30%] rounded-t-[999px] border-2 border-[#fed7aa]/40" />
            <span className="absolute inset-x-[16%] bottom-[10%] h-[30%] rounded border-2 border-[#fed7aa]/40" />
          </div>
        </div>
      </div>
      <p className={`absolute inset-x-0 bottom-[12vh] text-center font-serif text-5xl font-bold italic text-[#fff7d6] drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] sm:text-6xl ${still ? "" : "human-welcome"}`}>
        Welcome
      </p>
      {!still &&
        petals.map((petal, i) => (
          <span
            key={i}
            className="human-petal absolute top-0 h-3 w-4 rounded-[60%_10%_60%_10%]"
            style={
              {
                left: `${petal.left}%`,
                background: petal.color,
                animationDelay: `${petal.delay}s`,
                animationDuration: `${petal.duration}s`,
                "--petal-dx": petal.drift,
              } as CSSProperties
            }
            aria-hidden="true"
          />
        ))}
    </>
  )
}

/** The treasure itself, rising large in the middle on a warm glow. */
function Hero({ gift, still }: { gift: GiftLike; still: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className={still ? "relative" : "treasure-rise relative"}>
        <span className={`absolute inset-[-40%] rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.9),rgba(251,113,133,0.35)_45%,transparent_70%)] ${still ? "" : "treasure-halo"}`} aria-hidden="true" />
        <GiftIcon gift={gift} size={170} className="relative" />
      </div>
    </div>
  )
}

export function HumanConnectionMoment({
  scene,
  gift,
  label,
  onDone,
}: {
  scene: HumanScene
  gift: GiftLike
  label: string
  onDone: () => void
}) {
  // The confetti lands at each scene's high point: the heart tied, the hands meeting, the door open.
  useEffect(() => {
    const at = scene === "thank-you" ? 900 : scene === "welcome" ? 1900 : 1700
    const burst = window.setTimeout(() => celebrateInColors(ROSE, { x: 0.5, y: 0.5 }, 110), at)
    return () => window.clearTimeout(burst)
  }, [scene])

  return (
    <FullScreenMoment durationMs={HUMAN_MS} sound={SOUNDS[scene]} label={label} onDone={onDone}>
      {(still) => (
        <>
          <Backdrop />
          {scene === "thank-you" && <ThankYou gift={gift} still={still} />}
          {scene === "friendship-thread" && <FriendshipThread still={still} />}
          {scene === "warm-embrace" && <WarmEmbrace still={still} />}
          {scene === "helping-hand" && <HelpingHand still={still} />}
          {scene === "welcome" && <Welcome still={still} />}
        </>
      )}
    </FullScreenMoment>
  )
}
