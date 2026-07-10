import { useState, type CSSProperties } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatRow } from "@/components/app/StatRow"
import { ViewAllLink } from "@/components/app/ViewAllLink"
import { PostComposer } from "@/components/app/PostComposer"
import { FeaturedPost } from "@/components/app/FeaturedPost"
import { ConnectionsSection, type Connection } from "@/components/app/ConnectionsSection"
import { useDelayedLoading } from "@/hooks/useDelayedLoading"
import { cn } from "@/lib/utils"

const jobs = [
  {
    title: "In Home Caregiver",
    company: "National senior home care",
    location: "4140 Parker Rd. Allentown, New Mexico 31134",
  },
  {
    title: "Synergy HomeCare has Caregiver Opportunities in Cherry Hill, Vorhees...",
    company: "SYNERGY HOMECARE",
    location: "4517 Washington Ave. Manchester, Kentucky 39495",
  },
  {
    title: "Direct Support Professional",
    company: "Assurance care & support Inc",
    location: "Carneys point, NJ 08069",
    tags: ["401(K)", "Flexible schedule"],
  },
]

const agencies: Connection[] = [
  { name: "HHC Bellevue Hospital...", subtitle: "Austin , TX", initials: "LA", avatarClassName: "border border-[#dedede] bg-white" },
  { name: "Harlem Hospital Center", subtitle: "Pasadena, Oklahoma", initials: "HG", avatarClassName: "bg-[#efefef]" },
  { name: "NYU Langone Medical...", subtitle: "Great Falls, Maryland", initials: "NY", avatarClassName: "bg-[#ffa33d]" },
  { name: "Gracie Square Hospital", subtitle: "Kent, Utah", initials: "GS", avatarClassName: "bg-[#a782d8]" },
]

const professionals: Connection[] = [
  { name: "Jerome Bell", subtitle: "Registered Nurse | Ment...", initials: "JB", avatarClassName: "bg-[#ffc95c]" },
  { name: "Esther Howard", subtitle: "Doctor", initials: "EH", avatarClassName: "bg-[#d193ce]" },
  { name: "Theresa Webb", subtitle: "Counsellor", initials: "TW", avatarClassName: "bg-[#ffc33d]" },
  { name: "Eleanor Pena", subtitle: "Psychiatrist", initials: "EP", avatarClassName: "bg-[#cdbeb5]" },
]

function JobCard({
  job,
  liked,
  onToggleLike,
  style,
}: {
  job: (typeof jobs)[number]
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
      {job.tags && (
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
    <div className="grid min-h-[calc(100vh-72px)] items-start gap-5 px-7.5 pb-10 pt-4 xl:grid-cols-[332px_minmax(560px,680px)_326px]">
      <aside className="space-y-10">
        <Skeleton className="h-20 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
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
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-full max-w-sm" />
            </div>
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </main>

      <aside className="space-y-10">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

export default function DashboardPage() {
  const [likedJobs, setLikedJobs] = useState<Set<string>>(new Set())
  const isLoading = useDelayedLoading()

  const toggleLike = (title: string) => {
    setLikedJobs((current) => {
      const next = new Set(current)
      if (next.has(title)) {
        next.delete(title)
      } else {
        next.add(title)
      }
      return next
    })
  }

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="animate-fade-in-up grid min-h-[calc(100vh-72px)] items-start gap-5 px-7.5 pb-10 pt-4 xl:grid-cols-[332px_minmax(560px,680px)_326px]">
      <aside className="space-y-10 xl:sticky xl:top-22 xl:max-h-[calc(100vh-104px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1 scrollbar-hide">
        <section className="rounded-lg border border-white/60 bg-white/80 px-4 py-3 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md">
          <div className="space-y-5">
            <StatRow label="Profile views" value="17" />
            <StatRow label="Application views" value="12" />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold">Jobs for you</h2>
          <div className="space-y-3">
            {jobs.map((job, index) => (
              <JobCard
                key={job.title}
                job={job}
                liked={likedJobs.has(job.title)}
                onToggleLike={() => toggleLike(job.title)}
                style={{ animationDelay: `${index * 80}ms` }}
              />
            ))}
          </div>
          <ViewAllLink />
        </section>

        <section className="group relative overflow-hidden rounded-lg bg-[#e9e1ff] p-2 shadow-[0_8px_24px_rgba(90,78,224,0.15)]">
          <div className="relative overflow-hidden rounded-md border border-[#d5cafa] bg-[linear-gradient(55deg,rgba(92,72,215,0.08)_25%,transparent_25%,transparent_50%,rgba(92,72,215,0.08)_50%,rgba(92,72,215,0.08)_75%,transparent_75%)] bg-size-[36px_36px] px-2 py-3">
            <span className="animate-shimmer pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-white/40 to-transparent" />
            <h2 className="text-2xl font-bold leading-tight text-[#2a0c4a]">Turn your equipment into opportunity</h2>
            <p className="mt-3 text-sm leading-5 text-[#321c47]">
              Have medical equipment or supplies to sell? List them and connect with the right people
            </p>
            <Button className="mt-5 h-11 w-full bg-linear-to-r from-[#5a4ee0] to-[#7a6ff0] text-white shadow-[0_4px_14px_rgba(90,78,224,0.35)] transition-transform duration-200 hover:scale-[1.02] active:scale-95">
              Sell an Item
            </Button>
          </div>
        </section>
      </aside>

      <main className="space-y-8">
        <PostComposer />
        <FeaturedPost />
      </main>

      <aside className="space-y-10 xl:sticky xl:top-22 xl:max-h-[calc(100vh-104px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1 scrollbar-hide">
        <ConnectionsSection title="Top agencies around you" items={agencies} actionLabel="Subscribe" activeLabel="Subscribed" />
        <ConnectionsSection title="Professionals you may be interested in" items={professionals} actionLabel="Connect" activeLabel="Pending" />
      </aside>
    </div>
  )
}
