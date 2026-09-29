import type { ReactNode } from "react"
import { Briefcase, Eye, Plus, Users } from "lucide-react"
import { CardFooter, StripCard } from "@/components/home/WelcomeStrip"
import { greeting } from "@/components/home/greeting"
import { Routes } from "@/routes/constants"
import type { Job } from "@/utils/careconnect/types"

/**
 * The top of the agency homepage, brought up to the member one: a greeting and a row of
 * cards for what an agency comes back to do — check on its jobs, post another, see who is
 * looking, and find people to hire. Built from what the page already loads.
 */
export function AgencyWelcome({
  name,
  postings,
  profileViews,
}: {
  name: string
  postings: Job[]
  profileViews: number
}) {
  const applicants = postings.reduce((sum, job) => sum + (job.applicationsCount ?? 0), 0)
  const cards: ReactNode[] = []
  let delay = 0
  const next = () => (delay += 70)

  cards.push(
    <StripCard
      key="jobs"
      to={Routes.app.agency.jobs}
      delay={next()}
      className="group bg-[linear-gradient(135deg,#0c2a33,#0b5f68_60%,#00a3a7)] text-white ring-transparent"
    >
      <span className="flex items-center gap-2">
        <Briefcase className="size-5 text-white/85" aria-hidden="true" />
        <span className="text-sm font-bold">Your jobs</span>
      </span>
      <span className="mt-3 text-3xl font-bold tabular-nums">{postings.length}</span>
      <span className="text-xs text-white/75">
        {postings.length === 0
          ? "Nothing posted yet"
          : `${applicants} applicant${applicants === 1 ? "" : "s"} so far`}
      </span>
      <CardFooter label="Review applicants" />
    </StripCard>,
  )

  cards.push(
    <StripCard key="post" to={`${Routes.app.agency.jobs}?new=1`} delay={next()} className="group bg-white ring-[#e8edf0]">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-[#e6f8f8] text-[#00898c]">
        <Plus className="size-5 transition-transform duration-300 group-hover:rotate-90" aria-hidden="true" />
      </span>
      <span className="mt-3 text-sm font-bold text-[#151922]">Post a job</span>
      <span className="text-xs text-[#657080]">Reach care professionals near you.</span>
      <CardFooter label="Start a posting" className="text-[#00898c]" />
    </StripCard>,
  )

  cards.push(
    <StripCard
      key="views"
      to={Routes.app.agency.profile}
      delay={next()}
      className="group bg-[linear-gradient(135deg,#f1e8ff,#faf6ff)] ring-[#e4d6fb]"
    >
      <span className="flex items-center gap-2">
        <Eye className="size-5 text-[#7a4fd1]" aria-hidden="true" />
        <span className="text-sm font-bold text-[#151922]">Profile views</span>
      </span>
      <span className="mt-3 text-3xl font-bold tabular-nums text-[#3b2a5c]">{profileViews}</span>
      <span className="text-xs text-[#6b5a8a]">
        {profileViews === 0 ? "A full profile gets found more" : "People checking you out"}
      </span>
      <CardFooter label="Polish your profile" className="text-[#7a4fd1]" />
    </StripCard>,
  )

  cards.push(
    <StripCard
      key="people"
      to={`${Routes.app.agency.network}?tab=connections`}
      delay={next()}
      className="group bg-[linear-gradient(135deg,#fff6ec,#ffe9d6)] ring-[#f5d2ae]"
    >
      <span className="flex items-center gap-2">
        <Users className="size-5 text-[#d97a2b]" aria-hidden="true" />
        <span className="text-sm font-bold text-[#151922]">Find professionals</span>
      </span>
      <span className="mt-3 text-sm text-[#8a5a2b]">Connect with nurses, carers and specialists.</span>
      <CardFooter label="Browse people" className="text-[#b86a1e]" />
    </StripCard>,
  )

  return (
    <section aria-label="Welcome" className="space-y-4">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight text-[#151922] sm:text-[28px]">
          {greeting()}, {name}{" "}
          <span className="animate-wave" aria-hidden="true">
            👋
          </span>
        </h1>
        <p className="mt-1 text-sm text-[#657080]">Here&apos;s how your organisation is doing today.</p>
      </div>
      <div className="relative -mx-4 sm:mx-0">
        <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:px-0">{cards}</div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#f5f8fa] to-transparent sm:hidden"
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
