import { useEffect, useState, type CSSProperties } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { StatRow } from "@/components/app/StatRow"
import { ViewAllLink } from "@/components/app/ViewAllLink"
import { PostComposer } from "@/components/app/PostComposer"
import { DashboardFeed } from "@/components/app/DashboardFeed"
import { ConnectionsSection, type Connection } from "@/components/app/ConnectionsSection"
import { MarketplacePromoCard } from "@/components/app/MarketplacePromoCard"
import { Routes } from "@/routes/constants"
import { getInitials } from "@/lib/utils"
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

function JobOverviewCard({ job, style }: { job: Job; style?: CSSProperties }) {
  return (
    <Link
      to={Routes.app.agency.jobs}
      style={style}
      className="animate-fade-in-up block rounded-xl border border-white/60 bg-white/80 p-4 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00b4b8]/30 hover:shadow-[0_12px_28px_rgba(0,180,184,0.12)]"
    >
      <h3 className="text-base font-semibold leading-[1.35] line-clamp-1">{job.title}</h3>
      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div>
          <p className="text-lg font-bold">{job.viewsCount}</p>
          <p className="text-xs text-[#8a8f98]">Views</p>
        </div>
        <div className="border-x border-[#eef1f3]">
          <p className="text-lg font-bold">{job.applicationsCount}</p>
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
    <div className="grid grid-cols-1 min-h-[calc(100vh-72px)] items-start gap-5 px-7.5 pb-10 pt-4 xl:grid-cols-[332px_minmax(560px,680px)_326px]">
      <aside className="order-2 space-y-10 xl:order-0">
        <Skeleton className="h-20 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </aside>

      <main className="order-1 space-y-8 xl:order-0">
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

      <aside className="order-3 space-y-10 xl:order-0">
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
  const [companies, setCompanies] = useState<Connection[]>([])
  const [people, setPeople] = useState<Connection[]>([])
  const [profileViews, setProfileViews] = useState(0)
  const [applicationViews, setApplicationViews] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

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

  return (
    <div className="animate-fade-in-up grid grid-cols-1 min-h-[calc(100vh-72px)] items-start gap-5 px-4 sm:px-8 pb-10 pt-4 xl:grid-cols-[332px_minmax(560px,1fr)_326px] w-full">
      <aside className="order-2 xl:order-0 space-y-10 xl:sticky xl:top-22 xl:max-h-[calc(100vh-104px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1 scrollbar-hide">
        <section className="rounded-lg border border-white/60 bg-white/80 px-4 py-3 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md">
          <div className="space-y-5">
            <StatRow label="Profile views" value={String(profileViews)} />
            <StatRow label="Application views" value={String(applicationViews)} />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Jobs overview</h2>
          <ViewAllLink href={Routes.app.agency.jobs} />
          {postings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#e2e2e2] p-6 text-center text-sm text-[#657080]">
              You haven&apos;t posted any jobs yet.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {postings.map((job, index) => (
                <JobOverviewCard key={job.id} job={job} style={{ animationDelay: `${index * 80}ms` }} />
              ))}
            </div>
          )}
        </section>

        <MarketplacePromoCard marketplaceHref={Routes.app.agency.marketplace} />
      </aside>

      <main className="order-1 space-y-8 xl:order-0">
        <PostComposer />
        <DashboardFeed />
      </main>

      <aside className="order-3 xl:order-0 space-y-10 xl:sticky xl:top-22 xl:max-h-[calc(100vh-104px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1 scrollbar-hide">
        {companies.length > 0 && (
          <ConnectionsSection title="Top Healthcare Providers around you" items={companies} actionLabel="Subscribe" activeLabel="Subscribed" relation="subscribe" targetType="company" viewAllHref={`${Routes.app.agency.network}?tab=agencies`} />
        )}
        {people.length > 0 && (
          <ConnectionsSection title="Professionals you may be interested in" items={people} actionLabel="Connect" activeLabel="Pending" relation="connect" targetType="individual" viewAllHref={`${Routes.app.agency.network}?tab=connections`} />
        )}
      </aside>
    </div>
  )
}
