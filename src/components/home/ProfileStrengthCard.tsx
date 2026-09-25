import { useId } from "react"
import { Link } from "react-router"
import { Check, ChevronRight, Eye, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProfileStrength } from "@/components/home/profileStrength"

/**
 * A ring that fills as the profile does.
 *
 * Exported for the welcome strip too, so both show the same ring at different sizes.
 */
export function StrengthRing({
  percent,
  size = 64,
  stroke = 6,
  className,
}: {
  percent: number
  size?: number
  stroke?: number
  className?: string
}) {
  // Each ring gets its own gradient id; two on one page must not share a definition.
  const gradientId = `strength-${useId().replace(/:/g, "")}`
  const radius = (size - stroke) / 2
  const length = 2 * Math.PI * radius
  const complete = percent >= 100
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e8eef1" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={complete ? "#1f9c4c" : `url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - percent / 100)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00b4b8" />
            <stop offset="100%" stopColor="#a782d8" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-sm font-bold tabular-nums text-[#151922]">
        {complete ? <Check className="size-5 text-[#1f9c4c]" aria-hidden="true" /> : `${percent}%`}
      </span>
    </span>
  )
}

interface ProfileStrengthCardProps {
  strength: ProfileStrength
  profileHref: string
  profileViews: number
  applicationViews: number
}

export function ProfileStrengthCard({
  strength,
  profileHref,
  profileViews,
  applicationViews,
}: ProfileStrengthCardProps) {
  const remaining = strength.steps.filter((step) => !step.done).slice(0, 3)
  const complete = strength.percent >= 100
  const noViews = profileViews === 0 && applicationViews === 0

  return (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-5 shadow-[0_4px_20px_rgba(16,20,26,0.05)] backdrop-blur-md">
      <div className="flex items-center gap-4">
        <StrengthRing percent={strength.percent} />
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[#151922]">
            {complete ? "Profile complete" : "Profile strength"}
          </h2>
          <p className="mt-0.5 text-xs text-[#657080]">
            {complete
              ? "You're easy to find and easy to trust."
              : "Complete profiles get found by more providers."}
          </p>
        </div>
      </div>

      {remaining.length > 0 && (
        <ul className="mt-4 space-y-1">
          {remaining.map((step, index) => (
            <li key={step.key}>
              <Link
                to={profileHref}
                className={cn(
                  "group flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition hover:bg-[#f2f8f9]",
                  index === 0 ? "font-semibold text-[#00898c]" : "text-[#383d45]",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    index === 0 ? "animate-cowry-glow border-[#00b4b8]" : "border-[#d7dde3]",
                  )}
                  aria-hidden="true"
                />
                <span className="flex-1">{step.label}</span>
                <ChevronRight className="size-4 text-[#9aa4b2] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#eef1f3] pt-4">
        <div className="rounded-xl bg-[#f7fafb] px-3 py-2">
          <p className="flex items-center gap-1 text-[11px] text-[#657080]">
            <Eye className="size-3" aria-hidden="true" />
            Profile views
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-[#151922]">{profileViews}</p>
        </div>
        <div className="rounded-xl bg-[#f7fafb] px-3 py-2">
          <p className="flex items-center gap-1 text-[11px] text-[#657080]">
            <FileText className="size-3" aria-hidden="true" />
            Application views
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-[#151922]">{applicationViews}</p>
        </div>
      </div>
      {noViews && !complete && (
        <p className="mt-2 text-xs text-[#8a94a3]">
          No views yet — finishing your profile is the quickest way to change that.
        </p>
      )}
    </section>
  )
}
