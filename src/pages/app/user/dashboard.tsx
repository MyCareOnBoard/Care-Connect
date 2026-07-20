import { useEffect, useState, type CSSProperties } from "react"
import { Link } from "react-router"
import { Heart } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatRow } from "@/components/app/StatRow"
import { ViewAllLink } from "@/components/app/ViewAllLink"
import { PostComposer } from "@/components/app/PostComposer"
import { DashboardFeed } from "@/components/app/DashboardFeed"
import { ConnectionsSection, type Connection } from "@/components/app/ConnectionsSection"
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
import { formatSalary, type CareConnectProfile, type Job } from "@/utils/careconnect/types"

const AVATAR_PALETTE = [
  "bg-[#087fff]",
  "bg-[#ffa33d]",
  "bg-[#a782d8]",
  "bg-[#d193ce]",
  "bg-[#ffc95c]",
  "bg-[#33b6a6]",
]

/** Map a directory profile into the presentational Connection shape. */
function toConnection(profile: CareConnectProfile, index: number): Connection {
  return {
    name: profile.name || "Care Connect user",
    subtitle: profile.subtitle,
    initials: getInitials(profile.name),
    avatarClassName: AVATAR_PALETTE[index % AVATAR_PALETTE.length],
    profileHref: Routes.app.user.viewProfile(profile.uid),
    uid: profile.uid,
    isFollowing: profile.isFollowing,
  }
}

function JobCard({
  job,
  liked,
  onToggleLike,
  style,
}: {
  job: Job
  liked: boolean
  onToggleLike: () => void
  style?: CSSProperties
}) {
  return (
    <article
      style={style}
      className="animate-fade-in-up group rounded-xl border border-white/60 bg-white/80 p-4 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#087fff]/30 hover:shadow-[0_12px_28px_rgba(8,127,255,0.12)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-[1.35]">{job.title}</h3>
        <button
          type="button"
          onClick={onToggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Unsave job" : "Save job"}
          className="shrink-0 cursor-pointer text-[#20242c] transition-transform duration-150 hover:scale-110 active:scale-90"
        >
          <Heart
            key={liked ? "liked" : "unliked"}
            className={cn("size-5 transition-colors duration-200", liked && "fill-[#ff3e66] text-[#ff3e66] animate-heart-pop")}
          />
        </button>
      </div>
      <p className="mt-4 text-sm text-[#20242c]">{job.company}</p>
      <p className="mt-2 text-sm leading-6 text-[#20242c]">{job.location}</p>
      {formatSalary(job) && (
        <p className="mt-2 text-sm font-semibold text-[#087fff]">{formatSalary(job)}</p>
      )}
      {job.tags && job.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {job.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#dddddd] px-3 py-1 text-sm font-semibold text-[#20242c]">
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
    <div className="grid min-h-[calc(100vh-72px)] items-start gap-5 px-0 pb-10 pt-4 xl:grid-cols-[332px_minmax(560px,680px)_326px] w-full">
      <aside className="space-y-10">
        <Skeleton className="h-20 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </aside>

      <main className="space-y-8">
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

      <aside className="space-y-10">
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
          companyProfiles.map((profile, index) => ({
            ...toConnection(profile, index),
            isFollowing: followed.has(profile.uid),
          })),
        )
        setPeople(
          peopleProfiles.map((profile, index) => ({
            ...toConnection(profile, index),
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

  const toggleLike = async (id: string) => {
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
    <div className="animate-fade-in-up grid min-h-[calc(100vh-72px)] items-start gap-5 px-8 sm:w-full pb-10 pt-4 xl:grid-cols-[332px_minmax(560px,1fr)_326px] w-full">
      <aside className="space-y-10 xl:sticky xl:top-22 xl:max-h-[calc(100vh-104px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1 scrollbar-hide">
        <section className="rounded-lg border border-white/60 bg-white/80 px-4 py-3 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md">
          <div className="space-y-5">
            <StatRow label="Profile views" value={String(profileViews)} />
            <StatRow label="Application views" value={String(applicationViews)} />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold">Jobs for you</h2>
          {jobs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#e2e2e2] p-6 text-center text-sm text-[#657080]">
              No jobs yet.
            </p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job, index) => (
                <JobCard
                  key={job.id}
                  job={job}
                  liked={savedJobIds.has(job.id)}
                  onToggleLike={() => toggleLike(job.id)}
                  style={{ animationDelay: `${index * 80}ms` }}
                />
              ))}
            </div>
          )}
          <ViewAllLink href={Routes.app.user.jobs} />
        </section>

        <section className="group relative overflow-hidden rounded-lg bg-[#e9e1ff] p-2 shadow-[0_8px_24px_rgba(90,78,224,0.15)]">
          <div className="relative overflow-hidden rounded-md border border-[#d5cafa] bg-[linear-gradient(55deg,rgba(92,72,215,0.08)_25%,transparent_25%,transparent_50%,rgba(92,72,215,0.08)_50%,rgba(92,72,215,0.08)_75%,transparent_75%)] bg-size-[36px_36px] px-2 py-3">
            <span className="absolute inset-y-0 w-1/2 pointer-events-none animate-shimmer -left-1/2 bg-linear-to-r from-transparent via-white/40 to-transparent" />
            <h2 className="text-2xl font-bold leading-tight text-[#2a0c4a]">Turn your equipment into opportunity</h2>
            <p className="mt-3 text-sm leading-5 text-[#321c47]">
              Have medical equipment or supplies to sell? List them and connect with the right people
            </p>
            <Button
              asChild
              className="mt-5 h-11 w-full bg-linear-to-r from-[#5a4ee0] to-[#7a6ff0] text-white shadow-[0_4px_14px_rgba(90,78,224,0.35)] transition-transform duration-200 hover:scale-[1.02] active:scale-95"
            >
              <Link to={`${Routes.app.user.marketplace}?add=1`}>Sell an Item</Link>
            </Button>
          </div>
        </section>
      </aside>

      <main className="space-y-8">
        <PostComposer />
        <DashboardFeed />
      </main>

      <aside className="space-y-10 xl:sticky xl:top-22 xl:max-h-[calc(100vh-104px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1 scrollbar-hide">
        {companies.length > 0 && (
          <ConnectionsSection title="Top agencies around you" items={companies} actionLabel="Subscribe" activeLabel="Subscribed" relation="subscribe" targetType="company" />
        )}
        {people.length > 0 && (
          <ConnectionsSection title="Professionals you may be interested in" items={people} actionLabel="Connect" activeLabel="Pending" relation="connect" targetType="individual" />
        )}
      </aside>
    </div>
  )
}
