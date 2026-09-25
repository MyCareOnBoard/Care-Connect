import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { Bookmark, Sparkles, Users } from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { ViewAllLink } from "@/components/app/ViewAllLink"
import { PostComposer } from "@/components/app/PostComposer"
import { DashboardFeed } from "@/components/app/DashboardFeed"
import { ConnectionsSection, type Connection } from "@/components/app/ConnectionsSection"
import { MarketplacePromoCard } from "@/components/app/MarketplacePromoCard"
import { avatarColor } from "@/components/app/avatarColor"
import { WelcomeStrip } from "@/components/home/WelcomeStrip"
import { ProfileStrengthCard } from "@/components/home/ProfileStrengthCard"
import { profileStrength } from "@/components/home/profileStrength"
import { Routes } from "@/routes/constants"
import { cn, getInitials } from "@/lib/utils"
import { getAuthErrorMessage, useAuthUser } from "@/utils/auth"
import {
  listJobs,
  listSavedJobs,
  saveJob,
  unsaveJob,
} from "@/utils/careconnect/services/jobsService"
import { getProfile, listProfiles } from "@/utils/careconnect/services/profilesService"
import { listConnections } from "@/utils/careconnect/services/connectionsService"
import { formatSalary, toDate, type CareConnectProfile, type Job } from "@/utils/careconnect/types"
import { onCowryEarned } from "@/utils/careconnect/cowryEarned"
import { isCowryPathEnabled } from "@/utils/careconnect/cowryPages"
import { getEarnSummary, type CowryEarnSummary } from "@/utils/careconnect/services/cowryService"

/** A job posted within this many days wears a "New" badge. */
const NEW_JOB_DAYS = 7

/** Map a directory profile into the presentational Connection shape. */
function toConnection(profile: CareConnectProfile): Connection {
  return {
    name: profile.name || "Care Connect user",
    subtitle: profile.subtitle,
    initials: getInitials(profile.name),
    // Coloured by who they are, so a person keeps one colour across the page.
    avatarClassName: avatarColor(profile.uid),
    photo: profile.photo,
    profileHref: Routes.app.user.viewProfile(profile.uid),
    uid: profile.uid,
    isFollowing: profile.isFollowing,
  }
}

function JobCard({
  job,
  saved,
  onToggleSave,
  style,
}: {
  job: Job
  saved: boolean
  onToggleSave: () => void
  style?: CSSProperties
}) {
  const posted = toDate(job.createdAt ?? null)
  const isNew = posted ? Date.now() - posted.getTime() < NEW_JOB_DAYS * 86_400_000 : false
  const salary = formatSalary(job)

  return (
    <article
      style={style}
      className="animate-fade-in-up group rounded-2xl border border-white/60 bg-white/85 p-4 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00b4b8]/30 hover:shadow-[0_12px_28px_rgba(0,180,184,0.12)]"
    >
      <div className="flex items-start gap-3">
        {/* A monogram tile stands in for a company logo until jobs carry one. */}
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm",
            avatarColor(job.company),
          )}
          aria-hidden="true"
        >
          {getInitials(job.company)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold leading-snug text-[#151922]">{job.title}</h3>
            {isNew && (
              <span className="shrink-0 rounded-full bg-[#e2f7e8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1f9c4c]">
                New
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-[#565f6d]">
            {job.company}
            {job.location && ` · ${job.location}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-label={saved ? "Unsave job" : "Save job"}
          className="-mr-1 -mt-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#20242c] transition hover:bg-[#f2f6f8] active:scale-90"
        >
          <Bookmark
            key={saved ? "saved" : "unsaved"}
            className={cn("size-5 transition-colors duration-200", saved && "fill-[#00b4b8] text-[#00b4b8] animate-heart-pop")}
          />
        </button>
      </div>

      {(salary || job.applicationsCount > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {salary && <span className="text-sm font-bold text-[#00898c]">{salary}</span>}
          {job.applicationsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-[#657080]">
              <Users className="size-3.5" aria-hidden="true" />
              {job.applicationsCount} applied
            </span>
          )}
        </div>
      )}

      {job.tags && job.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {job.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-[#eef4f6] px-2.5 py-0.5 text-xs font-medium text-[#3f4855]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 min-h-[calc(100vh-72px)] items-start gap-5 px-4 pb-10 pt-4 sm:px-8 xl:grid-cols-[332px_minmax(560px,680px)_326px] w-full">
      <aside className="order-2 space-y-10 xl:order-0">
        <Skeleton className="h-56 rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </aside>

      <main className="order-1 space-y-6 xl:order-0">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-[15.5rem] shrink-0 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-[30px]" />
        <Skeleton className="h-96 rounded-2xl" />
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

export default function DashboardPage() {
  const { user } = useAuthUser()
  const [jobs, setJobs] = useState<Job[]>([])
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [companies, setCompanies] = useState<Connection[]>([])
  const [people, setPeople] = useState<Connection[]>([])
  const [profileViews, setProfileViews] = useState(0)
  const [applicationViews, setApplicationViews] = useState(0)
  const [me, setMe] = useState<CareConnectProfile | null>(null)
  const [earn, setEarn] = useState<CowryEarnSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const uid = user?.uid

  useEffect(() => {
    let active = true
    ;(async () => {
      setIsLoading(true)
      try {
        const [feedJobs, saved, companyProfiles, peopleProfiles, connections] = await Promise.all([
          listJobs({ limit: 3 }),
          listSavedJobs().catch(() => []),
          listProfiles({ type: "company", limit: 4 }).catch(() => []),
          listProfiles({ type: "individual", limit: 4 }).catch(() => []),
          listConnections().catch(() => []),
        ])
        if (!active) return
        // Seed follow-state from the viewer's authoritative connections, not the
        // directory's isFollowing (which can lag), so it persists across reloads.
        const followed = new Set(connections.map((connection) => connection.targetId))
        setJobs(feedJobs)
        setSavedJobIds(new Set(saved.map((job) => job.id)))
        setCompanies(
          companyProfiles.map((profile) => ({
            ...toConnection(profile),
            isFollowing: followed.has(profile.uid),
          })),
        )
        setPeople(
          peopleProfiles.map((profile) => ({
            ...toConnection(profile),
            isFollowing: followed.has(profile.uid),
          })),
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

  // Own profile: view counters for the stats (no self-increment on GET /:uid), and the
  // fields the profile-strength ring is worked out from.
  useEffect(() => {
    if (!uid) return
    let active = true
    ;(async () => {
      try {
        const profile = await getProfile(uid)
        if (!active) return
        setMe(profile)
        setProfileViews(profile.profileViewsCount ?? 0)
        setApplicationViews(profile.applicationViewsCount ?? 0)
      } catch {
        // stats are non-critical; leave at 0 on failure
      }
    })()
    return () => {
      active = false
    }
  }, [uid])

  // Streak and today's post reward, for the welcome strip and the composer's Cowry pill.
  // Refetched when an award lands, so the "+10" goes once today's posts are paid.
  const earnEnabled = isCowryPathEnabled(Routes.app.user.cowryEarn)
  useEffect(() => {
    if (!earnEnabled) return
    let active = true
    const load = () =>
      getEarnSummary()
        .then((summary) => {
          if (active) setEarn(summary)
        })
        .catch(() => undefined)
    void load()
    const unsubscribe = onCowryEarned(() => void load())
    return () => {
      active = false
      unsubscribe()
    }
  }, [earnEnabled])

  const strength = useMemo(() => (me ? profileStrength(me) : null), [me])
  const postRow = earn?.today.find((row) => row.activityType === "post")
  const postReward = postRow ? { value: postRow.value, remaining: postRow.remaining } : null
  const firstName = (user?.fullName || "there").trim().split(" ")[0]

  const toggleSaved = async (id: string) => {
    const isSaved = savedJobIds.has(id)
    setSavedJobIds((current) => {
      const next = new Set(current)
      if (isSaved) next.delete(id)
      else next.add(id)
      return next
    })
    try {
      if (isSaved) await unsaveJob(id)
      else await saveJob(id)
    } catch (error) {
      // Revert on failure
      setSavedJobIds((current) => {
        const next = new Set(current)
        if (isSaved) next.add(id)
        else next.delete(id)
        return next
      })
      toast.error(getAuthErrorMessage(error))
    }
  }

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="relative isolate animate-fade-in-up grid grid-cols-1 min-h-[calc(100vh-72px)] items-start gap-5 px-4 sm:px-8 sm:w-full pb-10 pt-4 xl:grid-cols-[332px_minmax(560px,1fr)_326px] w-full">
      {/* A soft wash of brand colour behind the top of the page, so it does not open on flat grey. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_60%_at_20%_0%,rgba(0,180,184,0.14),transparent_70%),radial-gradient(50%_50%_at_85%_10%,rgba(167,130,216,0.14),transparent_70%)]"
        aria-hidden="true"
      />

      <aside className="order-2 xl:order-0 space-y-10 xl:sticky xl:top-22 xl:max-h-[calc(100vh-104px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1 scrollbar-hide">
        {strength && (
          <ProfileStrengthCard
            strength={strength}
            profileHref={Routes.app.user.profile}
            profileViews={profileViews}
            applicationViews={applicationViews}
          />
        )}

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Sparkles className="size-4 text-[#00b4b8]" aria-hidden="true" />
            Jobs for you
          </h2>
          {jobs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#e2e2e2] p-6 text-center text-sm text-[#657080]">
              No jobs yet. New roles appear here as providers post them.
            </p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job, index) => (
                <JobCard
                  key={job.id}
                  job={job}
                  saved={savedJobIds.has(job.id)}
                  onToggleSave={() => toggleSaved(job.id)}
                  style={{ animationDelay: `${index * 80}ms` }}
                />
              ))}
            </div>
          )}
          <ViewAllLink href={Routes.app.user.jobs} />
        </section>

        <MarketplacePromoCard marketplaceHref={Routes.app.user.marketplace} />
      </aside>

      <main className="order-1 space-y-6 xl:order-0">
        <WelcomeStrip
          firstName={firstName}
          streak={earn?.streak ?? null}
          earnHref={earnEnabled ? Routes.app.user.cowryEarn : null}
          postReward={postReward}
          strength={strength}
          profileHref={Routes.app.user.profile}
          jobs={{ count: jobs.length, firstTitle: jobs[0]?.title, href: Routes.app.user.jobs }}
        />
        <PostComposer
          photo={me?.photo}
          cowryReward={postReward && postReward.remaining > 0 ? postReward.value : 0}
        />
        <DashboardFeed />
      </main>

      <aside className="order-3 xl:order-0 space-y-10 xl:sticky xl:top-22 xl:max-h-[calc(100vh-104px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1 scrollbar-hide">
        {companies.length > 0 && (
          <ConnectionsSection title="Top healthcare providers around you" items={companies} actionLabel="Subscribe" activeLabel="Subscribed" relation="subscribe" targetType="company" viewAllHref={`${Routes.app.user.network}?tab=agencies`} />
        )}
        {people.length > 0 && (
          <ConnectionsSection title="Professionals you may be interested in" items={people} actionLabel="Connect" activeLabel="Pending" relation="connect" targetType="individual" viewAllHref={`${Routes.app.user.network}?tab=connections`} />
        )}
      </aside>
    </div>
  )
}
