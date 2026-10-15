import { useEffect, useState, type CSSProperties } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { ArrowUpRight, BarChart3, Briefcase, Building2, Eye, FileText, Store, Users, type LucideIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ViewAllLink } from "@/components/app/ViewAllLink"
import { PostComposer } from "@/components/app/PostComposer"
import { DashboardFeed } from "@/components/app/DashboardFeed"
import { ConnectionsSection, type Connection } from "@/components/app/ConnectionsSection"
import { MarketplacePromoCard } from "@/components/app/MarketplacePromoCard"
import { Routes } from "@/routes/constants"
import { cn, getInitials } from "@/lib/utils"
import { useFeedFocus } from "@/components/home/feedFocus"
import { FeedFocusToggle } from "@/components/home/FeedFocusToggle"
import { FeatureTour } from "@/components/app/FeatureTour"
import { FocusRail, type RailItem } from "@/components/home/FocusRail"
import { AgencyWelcome } from "@/components/home/AgencyWelcome"
import { getAuthErrorMessage, useAuthUser } from "@/utils/auth"
import { getProfile, listProfiles } from "@/utils/careconnect/services/profilesService"
import { listConnections } from "@/utils/careconnect/services/connectionsService"
import { listMyJobs } from "@/utils/careconnect/services/jobsService"
import type { CareConnectProfile, Job } from "@/utils/careconnect/types"

const AVATAR_PALETTE = ["bg-[#00b4b8]", "bg-[#ffa33d]", "bg-[#a782d8]", "bg-[#d193ce]", "bg-[#ffc95c]", "bg-[#33b6a6]"]

/** Map a directory profile into the presentational Connection shape. */
function toConnection(profile: CareConnectProfile, index: number): Connection {
  return {
    name: profile.name || "Care Connect user",
    subtitle: profile.subtitle,
    initials: getInitials(profile.name),
    avatarClassName: AVATAR_PALETTE[index % AVATAR_PALETTE.length],
    profileHref: Routes.app.agency.viewProfile(profile.uid),
    uid: profile.uid,
    isFollowing: profile.isFollowing,
  }
}

/** A number you can tap: it opens the list the number was counted from. */
function StatLinkTile({
  to,
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  to: string
  icon: LucideIcon
  label: string
  value: number
  hint: string
  tone: string
}) {
  return (
    <Link
      to={to}
      className="group relative block rounded-xl bg-[#f7fafb] px-3 py-2.5 ring-1 ring-transparent transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_24px_-14px_rgba(16,20,26,0.35)] hover:ring-[#00b4b8]/30 active:scale-[0.98]"
    >
      <span className="flex items-center justify-between">
        <span className={cn("flex size-6 items-center justify-center rounded-lg", tone)}>
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <ArrowUpRight className="size-3.5 text-[#b4bcc6] transition group-hover:text-[#00898c]" aria-hidden="true" />
      </span>
      <span className="mt-2 block text-xl font-bold tabular-nums text-[#151922]">{value}</span>
      <span className="block text-[11px] font-medium text-[#4a5260]">{label}</span>
      <span className="block truncate text-[10px] text-[#8a94a3]">{hint}</span>
    </Link>
  )
}

function JobOverviewCard({ job, style }: { job: Job; style?: CSSProperties }) {
  return (
    <Link
      to={`${Routes.app.agency.jobs}?job=${encodeURIComponent(job.id)}`}
      style={style}
      className="animate-fade-in-up group block rounded-2xl border border-white/60 bg-white/85 p-4 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00b4b8]/30 hover:shadow-[0_12px_28px_rgba(0,180,184,0.12)]"
    >
      <h3 className="line-clamp-1 text-sm font-bold leading-snug text-[#151922] group-hover:text-[#00898c]">{job.title}</h3>
      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div>
          <p className="text-lg font-bold">{job.viewsCount}</p>
          <p className="text-xs text-[#8a8f98]">Views</p>
        </div>
        <div className="border-x border-[#eef1f3]">
          <p className="text-lg font-bold text-[#00898c]">{job.applicationsCount}</p>
          <p className="text-xs text-[#8a8f98]">Applications</p>
        </div>
        <div>
          <p className="text-lg font-bold">{job.savedCount}</p>
          <p className="text-xs text-[#8a8f98]">Saved</p>
        </div>
      </div>
    </Link>
  )
}

function AgencyDashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 min-h-[calc(100vh-72px)] items-start gap-5 px-7.5 pb-10 pt-4 lg:grid-cols-[clamp(248px,24vw,332px)_minmax(0,1fr)_clamp(248px,24vw,326px)]">
      <aside className="order-2 space-y-10 lg:order-0">
        <Skeleton className="h-20 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </aside>

      <main className="order-1 space-y-8 lg:order-0">
        <Skeleton className="h-32 rounded-[30px]" />
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="rounded-full size-12 shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="w-48 h-5" />
              <Skeleton className="w-full h-4 max-w-md" />
              <Skeleton className="w-full h-4 max-w-sm" />
            </div>
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </main>

      <aside className="order-3 space-y-10 lg:order-0">
        <div className="space-y-4">
          <Skeleton className="w-32 h-4" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="rounded-full size-12 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-32 h-4" />
                <Skeleton className="w-24 h-3" />
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

export default function AgencyDashboardPage() {
  const { user } = useAuthUser()
  const uid = user?.uid
  const [postings, setPostings] = useState<Job[]>([])
  // Every posting, for the totals; `postings` is just the three shown in the overview.
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [companies, setCompanies] = useState<Connection[]>([])
  const [people, setPeople] = useState<Connection[]>([])
  const [profileViews, setProfileViews] = useState(0)
  const [applicationViews, setApplicationViews] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const focus = useFeedFocus()

  useEffect(() => {
    let active = true
    ;(async () => {
      setIsLoading(true)
      try {
        const [myJobs, companyProfiles, peopleProfiles, connections] = await Promise.all([
          listMyJobs().catch(() => []),
          listProfiles({ type: "company", limit: 4 }).catch(() => []),
          listProfiles({ type: "individual", limit: 4 }).catch(() => []),
          listConnections().catch(() => []),
        ])
        if (!active) return
        const followed = new Set(connections.map((connection) => connection.targetId))
        setAllJobs(myJobs)
        setPostings(myJobs.slice(0, 3))
        setCompanies(
          companyProfiles.map((profile, index) => ({ ...toConnection(profile, index), isFollowing: followed.has(profile.uid) })),
        )
        setPeople(
          peopleProfiles.map((profile, index) => ({ ...toConnection(profile, index), isFollowing: followed.has(profile.uid) })),
        )
      } catch (error) {
        if (active) toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Own view/application-view counters for the stats card (no self-increment on GET /:uid).
  useEffect(() => {
    if (!uid) return
    let active = true
    ;(async () => {
      try {
        const me = await getProfile(uid)
        if (!active) return
        setProfileViews(me.profileViewsCount ?? 0)
        setApplicationViews(me.applicationViewsCount ?? 0)
      } catch {
        // stats are non-critical; leave at 0 on failure
      }
    })()
    return () => {
      active = false
    }
  }, [uid])

  if (isLoading) return <AgencyDashboardSkeleton />

  /* Each side section is built once and shown in two places: in its full column, and in the
     focus-mode strip's panel. One definition keeps the two from drifting apart. */
  const jobsPath = Routes.app.agency.jobs
  const openPostings = allJobs.filter((job) => job.status === "open").length
  const totalApplications = allJobs.reduce((sum, job) => sum + (job.applicationsCount ?? 0), 0)
  const totalJobViews = allJobs.reduce((sum, job) => sum + (job.viewsCount ?? 0), 0)

  const statsSection = (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-5 shadow-[0_4px_20px_rgba(16,20,26,0.05)] backdrop-blur-md">
      <h2 className="text-base font-bold text-[#151922]">Your reach</h2>
      {/* Each number opens the list behind it, filtered or sorted to match. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <StatLinkTile
          to={`${jobsPath}?status=open`}
          icon={Briefcase}
          label="Open postings"
          value={openPostings}
          hint="See them"
          tone="bg-[#e3f8f8] text-[#00898c]"
        />
        <StatLinkTile
          to={`${jobsPath}?sort=applications`}
          icon={FileText}
          label="Applications"
          value={totalApplications}
          hint="Busiest postings first"
          tone="bg-[#e9f9f0] text-[#0f8a4d]"
        />
        <StatLinkTile
          to={`${jobsPath}?sort=views`}
          icon={Eye}
          label="Job views"
          value={totalJobViews}
          hint="Most viewed first"
          tone="bg-[#eef0ff] text-[#5b5bd6]"
        />
        <StatLinkTile
          to={`${Routes.app.agency.network}#profile-viewers`}
          icon={Users}
          label="Profile views"
          value={profileViews}
          hint={applicationViews > 0 ? `${applicationViews} application views` : "Who looked"}
          tone="bg-[#fff4e0] text-[#b7791f]"
        />
      </div>
    </section>
  )

  const jobsSection = (
    <section>
      <h2 className="mb-4 text-lg font-bold">Jobs overview</h2>
      {postings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e2e2e2] p-6 text-center text-sm text-[#657080]">
          You haven&apos;t posted any jobs yet.
        </p>
      ) : (
        <div className="space-y-3">
          {postings.map((job, index) => (
            <JobOverviewCard key={job.id} job={job} style={{ animationDelay: `${index * 80}ms` }} />
          ))}
        </div>
      )}
      <ViewAllLink href={Routes.app.agency.jobs} />
    </section>
  )

  const marketplaceSection = <MarketplacePromoCard marketplaceHref={Routes.app.agency.marketplace} />

  /** Keep a suggestion list in step when someone in it is followed, wherever that happened. */
  const markFollowing =
    (setList: typeof setPeople) =>
    (uid: string, following: boolean) =>
      setList((list) => list.map((item) => (item.uid === uid ? { ...item, isFollowing: following } : item)))

  const providersSection = companies.length > 0 && (
    <ConnectionsSection title="Top Healthcare Providers around you" items={companies} actionLabel="Subscribe" activeLabel="Subscribed" relation="subscribe" targetType="company" onFollowChange={markFollowing(setCompanies)} viewAllHref={`${Routes.app.agency.network}?tab=agencies`} />
  )

  const peopleSection = people.length > 0 && (
    <ConnectionsSection title="Professionals you may be interested in" items={people} actionLabel="Linkup" activeLabel="Pending" relation="connect" targetType="individual" onFollowChange={markFollowing(setPeople)} viewAllHref={`${Routes.app.agency.network}?tab=suggestions`} />
  )

  const leftRail: RailItem[] = [
    { key: "stats", label: "Your stats", icon: <BarChart3 className="size-5" aria-hidden="true" />, content: statsSection },
    {
      key: "jobs",
      label: "Jobs overview",
      icon: <Briefcase className="size-5" aria-hidden="true" />,
      // Live postings are what an agency comes back to check on.
      badge: postings.length,
      content: jobsSection,
    },
    { key: "marketplace", label: "Marketplace", icon: <Store className="size-5" aria-hidden="true" />, content: marketplaceSection },
  ]

  const rightRail: RailItem[] = [
    ...(providersSection
      ? [
          {
            key: "providers",
            label: "Healthcare providers",
            icon: <Building2 className="size-5" aria-hidden="true" />,
            badge: companies.filter((company) => !company.isFollowing).length,
            content: providersSection,
          },
        ]
      : []),
    ...(peopleSection
      ? [
          {
            key: "people",
            label: "Professionals",
            icon: <Users className="size-5" aria-hidden="true" />,
            badge: people.filter((person) => !person.isFollowing).length,
            content: peopleSection,
          },
        ]
      : []),
  ]

  const left = focus.aside("left")
  const right = focus.aside("right")
  const asideClass =
    "space-y-10 lg:sticky lg:top-22 lg:row-start-1 lg:max-h-[calc(100vh-104px)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1 scrollbar-hide"

  return (
    <div
      className={cn(
        "relative isolate animate-fade-in-up grid grid-cols-1 min-h-[calc(100vh-72px)] items-start gap-5 px-4 sm:px-8 pb-10 pt-4 w-full",
        focus.grid.className,
      )}
      style={focus.grid.style}
    >
      {/* The same soft wash of brand colour as the member homepage. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-105 bg-[radial-gradient(60%_60%_at_20%_0%,rgba(0,180,184,0.14),transparent_70%),radial-gradient(50%_50%_at_85%_10%,rgba(167,130,216,0.14),transparent_70%)]"
        aria-hidden="true"
      />

      {/* Every column is placed explicitly on wide screens: the focus strips share the side
          cells, and automatic placement would otherwise shuffle the columns around them. */}
      <aside inert={left.inert} className={cn("order-2 lg:order-0 lg:col-start-1", asideClass, left.className)}>
        {statsSection}
        {jobsSection}
        {marketplaceSection}
      </aside>
      <FocusRail side="left" items={leftRail} active={focus.active} />

      <main className="order-1 min-w-0 space-y-6 lg:order-0 lg:col-start-2 lg:row-start-1">
        <FeedFocusToggle focus={focus} />
        <FeatureTour />
        <AgencyWelcome
          name={(user?.fullName || "there").trim().split(" ")[0]}
          postings={postings}
          profileViews={profileViews}
        />
        <PostComposer />
        <DashboardFeed />
      </main>

      <aside inert={right.inert} className={cn("order-3 lg:order-0 lg:col-start-3", asideClass, right.className)}>
        {providersSection}
        {peopleSection}
      </aside>
      <FocusRail side="right" items={rightRail} active={focus.active} />
    </div>
  )
}
