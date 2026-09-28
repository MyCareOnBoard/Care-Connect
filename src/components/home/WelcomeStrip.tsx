import type { ReactNode } from "react"
import { Link } from "react-router"
import { Briefcase, Check, ChevronRight, Flame, PenLine } from "lucide-react"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { openComposer } from "@/components/app/composeEvent"
import { StrengthRing } from "@/components/home/ProfileStrengthCard"
import type { ProfileStrength } from "@/components/home/profileStrength"
import { cn } from "@/lib/utils"
import { formatCowries } from "@/utils/careconnect/cowry"
import type { CowryStreak } from "@/utils/careconnect/services/cowryService"

/**
 * The top of the homepage: a greeting, and a row of next steps.
 *
 * Each card is something the member can act on right now, built only from data the page has
 * already loaded — the streak and today's post reward from the Earn summary, the profile's
 * completeness, and the jobs list. A card with nothing true to say is left out rather than
 * padded with a guess.
 */

interface WelcomeStripProps {
  firstName: string
  /** This week's streak. Null when Cowry earning is off or the summary did not load. */
  streak: CowryStreak | null
  earnHref: string | null
  /** Cowries a post earns now, and whether any posts are still paid today. */
  postReward: { value: number; remaining: number } | null
  strength: ProfileStrength | null
  profileHref: string
  jobs: { count: number; firstTitle?: string; href: string }
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function StripCard({
  children,
  to,
  onClick,
  className,
  delay,
}: {
  children: ReactNode
  to?: string
  onClick?: () => void
  className?: string
  delay: number
}) {
  const base = cn(
    "cowry-lift cowry-press cowry-hover animate-fade-in-up relative flex w-[15.5rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl p-4 text-left ring-1 transition",
    className,
  )
  const style = { animationDelay: `${delay}ms` }
  return to ? (
    <Link to={to} className={base} style={style}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={base} style={style}>
      {children}
    </button>
  )
}

function CardFooter({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("mt-auto flex items-center gap-1 pt-3 text-xs font-semibold", className)}>
      {label}
      <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </span>
  )
}

export function WelcomeStrip({
  firstName,
  streak,
  earnHref,
  postReward,
  strength,
  profileHref,
  jobs,
}: WelcomeStripProps) {
  const cards: ReactNode[] = []
  let delay = 0
  const next = () => (delay += 70)

  if (streak && earnHref) {
    const left = Math.max(0, streak.daysRequired - streak.daysActive)
    cards.push(
      <StripCard
        key="streak"
        to={earnHref}
        delay={next()}
        className={cn(
          "group ring-[#f5d2ae]",
          streak.earned ? "bg-[linear-gradient(135deg,#e2f7e8,#f4fbf6)] ring-[#bfe8cc]" : "bg-[linear-gradient(135deg,#fff6ec,#ffe9d6)]",
        )}
      >
        <span className="flex items-center gap-2">
          <Flame
            className={cn("size-5", streak.daysActive > 0 ? "animate-cowry-flame text-[#d97a2b]" : "text-[#c9a27c]")}
            aria-hidden="true"
          />
          <span className="text-sm font-bold text-[#151922]">
            {streak.earned ? "Streak complete!" : `${streak.daysActive} of ${streak.daysRequired} days this week`}
          </span>
        </span>
        <span className="mt-3 flex gap-1.5" aria-hidden="true">
          {Array.from({ length: streak.daysRequired }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full",
                i < streak.daysActive ? "bg-[#f0913a]" : "bg-[#f5dcc4]",
                streak.earned && "bg-[#34c26b]",
              )}
            />
          ))}
        </span>
        <span className="mt-2 text-xs text-[#8a5a2b]">
          {streak.earned
            ? `You earned ${formatCowries(streak.reward)} Cowries this week`
            : `${left} more day${left === 1 ? "" : "s"} for ${formatCowries(streak.reward)} Cowries`}
        </span>
        <CardFooter label="See what pays" className="text-[#b86a1e]" />
      </StripCard>,
    )
  }

  if (postReward) {
    const paid = postReward.remaining > 0 && postReward.value > 0
    cards.push(
      <StripCard
        key="post"
        onClick={() => openComposer()}
        delay={next()}
        className="group bg-[linear-gradient(135deg,#0c2a33,#0b5f68_60%,#00a3a7)] text-white ring-transparent"
      >
        <span className="flex items-center gap-2">
          <PenLine className="size-5 text-white/85" aria-hidden="true" />
          <span className="text-sm font-bold">{paid ? "Share a post" : "You've posted today"}</span>
        </span>
        {paid ? (
          <span className="mt-3 flex items-center gap-2 text-2xl font-bold">
            <CowryIcon size={26} className="cowry-wobble" />+{formatCowries(postReward.value)}
          </span>
        ) : (
          <span className="mt-3 flex items-center gap-2 text-sm text-white/85">
            <Check className="size-5 text-[#7ef0c0]" aria-hidden="true" />
            Today&apos;s post reward is in
          </span>
        )}
        <span className="mt-1 text-xs text-white/75">
          {paid ? "Cowries for your next post today" : "Posts still reach your network"}
        </span>
        <CardFooter label="Write something" />
      </StripCard>,
    )
  }

  if (strength && strength.percent < 100) {
    cards.push(
      <StripCard
        key="profile"
        to={profileHref}
        delay={next()}
        // The side column carries the full card on wide screens; this is its phone twin.
        className="group bg-white ring-[#e8edf0] xl:hidden"
      >
        <span className="flex items-center gap-3">
          <StrengthRing percent={strength.percent} size={48} stroke={5} />
          <span>
            <span className="block text-sm font-bold text-[#151922]">Profile strength</span>
            <span className="block text-xs text-[#657080]">Get found by more providers</span>
          </span>
        </span>
        {strength.next && <span className="mt-3 text-sm font-medium text-[#00898c]">{strength.next.label}</span>}
        <CardFooter label="Finish your profile" className="text-[#00898c]" />
      </StripCard>,
    )
  }

  if (jobs.count > 0) {
    cards.push(
      <StripCard key="jobs" to={jobs.href} delay={next()} className="group bg-[linear-gradient(135deg,#f1e8ff,#faf6ff)] ring-[#e4d6fb]">
        <span className="flex items-center gap-2">
          <Briefcase className="size-5 text-[#7a4fd1]" aria-hidden="true" />
          <span className="text-sm font-bold text-[#151922]">Jobs picked for you</span>
        </span>
        {jobs.firstTitle && (
          <span className="mt-3 line-clamp-2 text-sm font-medium text-[#3b2a5c]">{jobs.firstTitle}</span>
        )}
        <CardFooter label="Browse jobs" className="text-[#7a4fd1]" />
      </StripCard>,
    )
  }

  return (
    <section aria-label="Welcome" className="space-y-4">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight text-[#151922] sm:text-[28px]">
          {greeting()}, {firstName}{" "}
          <span className="animate-wave" aria-hidden="true">
            👋
          </span>
        </h1>
        <p className="mt-1 text-sm text-[#657080]">Here&apos;s what&apos;s happening in your care network.</p>
      </div>

      {cards.length > 0 && (
        // Scrolls sideways on a phone, snapping card by card; the fade on the right edge
        // says there is more to see.
        <div className="relative -mx-4 sm:mx-0">
          <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:px-0">
            {cards}
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#f5f8fa] to-transparent sm:hidden"
            aria-hidden="true"
          />
        </div>
      )}
    </section>
  )
}
