import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { Search, Heart, Bookmark, Briefcase, CheckCircle2, Eye, Link2, MapPin, SlidersHorizontal, Users, Wallet, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { SidePanel } from "@/components/app/SidePanel"
import { getAuthErrorMessage } from "@/utils/auth"
import { avatarColor } from "@/components/app/avatarColor"
import { haptic } from "@/lib/haptics"
import { playSound } from "@/lib/sound"
import { cn, getInitials } from "@/lib/utils"
import {
  getJob,
  listJobs,
  listSavedJobs,
  saveJob,
  unsaveJob,
} from "@/utils/careconnect/services/jobsService"
import {
  applyToJob,
  listMyApplications,
} from "@/utils/careconnect/services/applicationsService"
import {
  AVAILABILITY_FROM_LABEL,
  EMPLOYMENT_TYPE_LABELS,
  formatRelative,
  formatSalary,
  toDate,
  type EmploymentType,
  type Job,
  type Screening,
  type ScreeningAnswer,
  type ScreeningQuestion,
} from "@/utils/careconnect/types"

function QuickScreeningPanel({
  open,
  onClose,
  questions,
  onApply,
}: {
  open: boolean
  onClose: () => void
  questions: ScreeningQuestion[]
  onApply: (screening: Screening, screeningAnswers: ScreeningAnswer[]) => void
}) {
  const [relocate, setRelocate] = useState<"No" | "Yes">("No")
  const [certifications, setCertifications] = useState<"No" | "Yes">("No")
  const [availability, setAvailability] = useState("Immediately")
  const [why, setWhy] = useState("")
  const [answers, setAnswers] = useState<Record<string, string>>({})

  // Reset every field when the panel (re)opens for a job.
  useEffect(() => {
    if (!open) return
    setRelocate("No")
    setCertifications("No")
    setAvailability("Immediately")
    setWhy("")
    setAnswers({})
  }, [open])

  const setAnswer = (id: string, value: string) =>
    setAnswers((current) => ({ ...current, [id]: value }))

  const handleSubmit = () => {
    const missing = questions.find((question) => question.required && !(answers[question.id] ?? "").trim())
    if (missing) {
      toast.error(`Please answer: ${missing.question}`)
      return
    }
    const screeningAnswers: ScreeningAnswer[] = questions.map((question) => ({
      questionId: question.id,
      question: question.question,
      type: question.type,
      answer: answers[question.id] ?? "",
    }))
    onApply(
      {
        willingToRelocate: relocate === "Yes",
        certificationsUpToDate: certifications === "Yes",
        availability: AVAILABILITY_FROM_LABEL[availability] ?? "immediately",
        whyInterested: why,
      },
      screeningAnswers,
    )
    onClose()
  }

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Quick screening question"
      footer={
        <Button type="button" className="w-full bg-[#00b4b8]" onClick={handleSubmit}>
          Apply
        </Button>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-medium">Are you willing to relocate for the job</p>
          <div className="flex gap-6">
            {(["No", "Yes"] as const).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input type="radio" checked={relocate === option} onChange={() => setRelocate(option)} className="accent-[#00b4b8]" />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-[#eef1f3] pt-5">
          <p className="mb-3 text-sm font-medium">Are your required certifications up to date?</p>
          <div className="flex gap-6">
            {(["No", "Yes"] as const).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input type="radio" checked={certifications === option} onChange={() => setCertifications(option)} className="accent-[#00b4b8]" />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-[#eef1f3] pt-5">
          <p className="mb-3 text-sm font-medium">When are you available to start?</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {["Immediately", "Within 2 weeks", "Within 1 month", "More than 1 month"].map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input type="radio" checked={availability === option} onChange={() => setAvailability(option)} className="accent-[#00b4b8]" />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-[#eef1f3] pt-5">
          <label className="text-sm font-medium">Why are you interested in this opportunity?</label>
          <Textarea value={why} onChange={(event) => setWhy(event.target.value)} className="min-h-30" />
        </div>

        {/* Company-defined screening questions for this job. */}
        {questions.map((question) => (
          <div key={question.id} className="space-y-3 border-t border-[#eef1f3] pt-5">
            <p className="text-sm font-medium">
              {question.question}
              {question.required && <span className="ml-1 text-[#ff3e66]">*</span>}
            </p>

            {question.type === "short_answer" && (
              <Textarea
                value={answers[question.id] ?? ""}
                onChange={(event) => setAnswer(question.id, event.target.value)}
                className="min-h-20"
                placeholder="Your answer"
              />
            )}

            {question.type === "yes_no" && (
              <div className="flex gap-6">
                {["Yes", "No"].map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      checked={answers[question.id] === option}
                      onChange={() => setAnswer(question.id, option)}
                      className="accent-[#00b4b8]"
                    />
                    {option}
                  </label>
                ))}
              </div>
            )}

            {question.type === "multiple_choice" && (
              <div className="flex flex-col gap-2">
                {(question.options ?? []).map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      checked={answers[question.id] === option}
                      onChange={() => setAnswer(question.id, option)}
                      className="accent-[#00b4b8]"
                    />
                    {option}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </SidePanel>
  )
}

function JobsSkeleton() {
  return (
    <div className="p-5 space-y-6 sm:p-8">
      <Skeleton className="h-10 w-60" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  )
}

export default function UserJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [likedJobIds, setLikedJobIds] = useState<Set<string>>(new Set())
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [isApplyOpen, setIsApplyOpen] = useState(false)
  // Filters. All on the client: the list is already loaded in full.
  const [typeFilter, setTypeFilter] = useState<EmploymentType | "all">("all")
  const [paidOnly, setPaidOnly] = useState(false)
  const [newOnly, setNewOnly] = useState(false)
  const [savedOnly, setSavedOnly] = useState(false)

  // `?job=<id>` opens that job — how the homepage's "Jobs for you" cards link here. The
  // param follows the selection, so the address can be copied and shared as it stands.
  const [searchParams, setSearchParams] = useSearchParams()
  const linkedJobId = searchParams.get("job")
  const revealed = useRef(false)

  const selectJob = (id: string) => {
    setSelectedJobId(id)
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set("job", id)
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [fetchedJobs, saved, applications] = await Promise.all([
          listJobs(),
          listSavedJobs().catch(() => []),
          listMyApplications()
            .then((result) => result.applications)
            .catch(() => []),
        ])
        if (!active) return

        // A linked job that is not in the list (filtered out server-side, or since closed)
        // is fetched on its own, so the link still lands on it rather than on job one.
        let allJobs = fetchedJobs
        if (linkedJobId && !fetchedJobs.some((job) => job.id === linkedJobId)) {
          const linked = await getJob(linkedJobId).catch(() => null)
          if (!active) return
          if (linked) allJobs = [linked, ...fetchedJobs]
          else toast("That job is no longer available.")
        }

        setJobs(allJobs)
        setSelectedJobId(
          (current) =>
            current ??
            (linkedJobId && allJobs.some((job) => job.id === linkedJobId) ? linkedJobId : null) ??
            allJobs[0]?.id ??
            null,
        )
        setSavedJobIds(new Set(saved.map((job) => job.id)))
        setAppliedJobIds(new Set(applications.map((application) => application.jobId)))
      } catch (error) {
        toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
    // Loads once; later changes to ?job= come from selecting here, not from outside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Arriving from a link: bring the job into view once, in the list and — on narrow screens,
  // where the details sit below the list — the details too, with a brief glow.
  useEffect(() => {
    if (loading || !linkedJobId || revealed.current) return
    revealed.current = true
    requestAnimationFrame(() => {
      document.getElementById(`job-${linkedJobId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
      const detail = document.getElementById("job-detail")
      if (!detail) return
      if (window.matchMedia("(max-width: 79.99rem)").matches) {
        detail.scrollIntoView({ block: "start", behavior: "smooth" })
      }
      detail.classList.add("feed-flash")
    })
  }, [loading, linkedJobId])

  if (loading) return <JobsSkeleton />

  const NEW_DAYS = 7
  const isNew = (job: Job) => {
    const posted = toDate(job.createdAt ?? null)
    return posted ? Date.now() - posted.getTime() < NEW_DAYS * 86_400_000 : false
  }

  const term = search.trim().toLowerCase()
  const visibleJobs = jobs.filter(
    (job) =>
      (!term ||
        job.title.toLowerCase().includes(term) ||
        job.company.toLowerCase().includes(term) ||
        (job.location ?? "").toLowerCase().includes(term)) &&
      (typeFilter === "all" || job.employmentType === typeFilter) &&
      (!paidOnly || Boolean(formatSalary(job))) &&
      (!newOnly || isNew(job)) &&
      (!savedOnly || savedJobIds.has(job.id)),
  )
  const filtersOn = typeFilter !== "all" || paidOnly || newOnly || savedOnly
  // Only the job types that appear in the list are offered as filters.
  const typesPresent = [...new Set(jobs.map((job) => job.employmentType).filter(Boolean))] as EmploymentType[]

  const selectedJob =
    visibleJobs.find((job) => job.id === selectedJobId) ?? visibleJobs[0] ?? null

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

  // "Like" is a separate, local-only affordance (no backend concept) — kept
  // independent of Save so tapping one doesn't toggle the other.
  const toggleLiked = (id: string) => {
    setLikedJobIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleApply = async (screening: Screening, screeningAnswers: ScreeningAnswer[]) => {
    if (!selectedJob) return
    try {
      await applyToJob({ jobId: selectedJob.id, screening, screeningAnswers })
      haptic("success")
      playSound("success")
      toast.success("Application sent — good luck!")
      setAppliedJobIds((current) => new Set(current).add(selectedJob.id))
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    }
  }

  const chipClass = (on: boolean) =>
    cn(
      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition active:scale-95",
      on ? "bg-[#10141a] text-white shadow-sm" : "bg-white text-[#4a5260] ring-1 ring-[#e2e6ea] hover:ring-[#c8cdd4]",
    )

  const copyJobLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?job=${encodeURIComponent(id)}`)
      toast.success("Link copied")
    } catch {
      toast.error("Couldn't copy the link.")
    }
  }

  const applied = selectedJob ? appliedJobIds.has(selectedJob.id) : false

  return (
    <div className="animate-fade-in-up grid grid-cols-1 gap-5 p-5 sm:p-8 xl:grid-cols-[400px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
          <Input
            placeholder="Search jobs, companies or places"
            className="h-11 rounded-full pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {/* Quick filters, as chips: one tap each, and obvious when they are on. */}
        <div className="scrollbar-hide -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          <SlidersHorizontal className="size-4 shrink-0 text-[#8a94a3]" aria-hidden="true" />
          <button type="button" aria-pressed={newOnly} onClick={() => setNewOnly((on) => !on)} className={chipClass(newOnly)}>
            New this week
          </button>
          <button type="button" aria-pressed={paidOnly} onClick={() => setPaidOnly((on) => !on)} className={chipClass(paidOnly)}>
            <Wallet className="size-3.5" aria-hidden="true" />
            Shows pay
          </button>
          <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly((on) => !on)} className={chipClass(savedOnly)}>
            <Bookmark className="size-3.5" aria-hidden="true" />
            Saved
          </button>
          {typesPresent.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={typeFilter === type}
              onClick={() => setTypeFilter((current) => (current === type ? "all" : type))}
              className={chipClass(typeFilter === type)}
            >
              {EMPLOYMENT_TYPE_LABELS[type] ?? type}
            </button>
          ))}
          {filtersOn && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter("all")
                setPaidOnly(false)
                setNewOnly(false)
                setSavedOnly(false)
              }}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold text-[#00868a] hover:underline"
            >
              <X className="size-3.5" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        <p className="px-1 text-xs text-[#8a94a3]">
          {visibleJobs.length} job{visibleJobs.length === 1 ? "" : "s"}
          {filtersOn || term ? " match" : " open"}
        </p>

        {visibleJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d7dde3] bg-white/60 p-8 text-center">
            <Briefcase className="mx-auto size-8 text-[#9aa4b2]" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-[#151922]">No jobs match</p>
            <p className="mt-1 text-sm text-[#657080]">Try fewer filters or a different search.</p>
          </div>
        ) : (
          <div className="cowry-stagger space-y-3">
            {visibleJobs.map((job) => {
              const selected = job.id === selectedJob?.id
              const salary = formatSalary(job)
              return (
                <article
                  key={job.id}
                  id={`job-${job.id}`}
                  role="button"
                  tabIndex={0}
                  aria-current={selected || undefined}
                  onClick={() => selectJob(job.id)}
                  onKeyDown={(event) => event.key === "Enter" && selectJob(job.id)}
                  className={cn(
                    "group cursor-pointer rounded-2xl bg-white p-4 transition-all duration-200",
                    selected
                      ? "shadow-[0_12px_28px_-14px_rgba(0,180,184,0.6)] ring-2 ring-[#00b4b8]"
                      : "ring-1 ring-[#e2e6ea] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-16px_rgba(16,20,26,0.3)] hover:ring-[#c8cdd4]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm", avatarColor(job.company))}
                      aria-hidden="true"
                    >
                      {getInitials(job.company)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-bold leading-snug text-[#151922]">{job.title}</h3>
                        {isNew(job) && (
                          <span className="shrink-0 rounded-full bg-[#e2f7e8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1f9c4c]">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-[#565f6d]">
                        {job.company}
                        {job.location && ` · ${job.location}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {/* Same likedJobIds state as the detail panel's heart, so liking
                          from either the sidebar or the opened job stays in sync. */}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleLiked(job.id)
                        }}
                        aria-label={likedJobIds.has(job.id) ? "Unlike job" : "Like job"}
                        className="flex size-8 items-center justify-center rounded-full transition hover:bg-[#f2f6f8] active:scale-90"
                      >
                        <Heart className={cn("size-[18px] transition-colors", likedJobIds.has(job.id) ? "fill-[#ff1f3d] text-[#ff1f3d]" : "text-[#4a5260]")} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleSaved(job.id)
                        }}
                        aria-label={savedJobIds.has(job.id) ? "Unsave job" : "Save job"}
                        className="flex size-8 items-center justify-center rounded-full transition hover:bg-[#f2f6f8] active:scale-90"
                      >
                        {/* Bookmark, not a heart — the heart is the Like action, and using
                            it for Save here made the two read as swapped. */}
                        <Bookmark className={cn("size-[18px] transition-colors", savedJobIds.has(job.id) ? "fill-[#00b4b8] text-[#00b4b8]" : "text-[#4a5260]")} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                    {salary && <span className="text-sm font-bold text-[#00898c]">{salary}</span>}
                    {job.employmentType && (
                      <span className="rounded-full bg-[#eef4f6] px-2.5 py-0.5 font-medium text-[#3f4855]">
                        {EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType}
                      </span>
                    )}
                    {job.applicationsCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[#657080]">
                        <Users className="size-3.5" aria-hidden="true" />
                        {job.applicationsCount} applied
                      </span>
                    )}
                    {appliedJobIds.has(job.id) && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#1f9c4c]">
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        You applied
                      </span>
                    )}
                  </div>
                  {job.tags && job.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full bg-[#f3f6f8] px-2.5 py-0.5 text-xs text-[#565f6d]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </aside>

      {selectedJob && (
        <main id="job-detail" key={selectedJob.id} className="animate-fade-in-up scroll-mt-24 space-y-5 self-start rounded-3xl xl:sticky xl:top-22">
          {/* The job at a glance: who, what, where, how much — then what to do about it. */}
          <section className="overflow-hidden rounded-3xl bg-white ring-1 ring-[#e2e6ea]">
            <div className="h-20 bg-[linear-gradient(120deg,#0c2a33_0%,#0b5f68_55%,#00a3a7_100%)]" aria-hidden="true" />
            <div className="px-5 pb-5 sm:px-6">
              <span
                className={cn(
                  "-mt-8 flex size-16 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-[0_10px_24px_-10px_rgba(16,20,26,0.5)] ring-4 ring-white",
                  avatarColor(selectedJob.company),
                )}
                aria-hidden="true"
              >
                {getInitials(selectedJob.company)}
              </span>
              <h1 className="mt-3 text-2xl font-bold leading-tight text-[#151922]">{selectedJob.title}</h1>
              <p className="mt-1 text-sm font-medium text-[#383d45]">{selectedJob.company}</p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-[#4a5260]">
                {selectedJob.location && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f6f8] px-2.5 py-1">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {selectedJob.location}
                  </span>
                )}
                {selectedJob.employmentType && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f6f8] px-2.5 py-1">
                    <Briefcase className="size-3.5" aria-hidden="true" />
                    {EMPLOYMENT_TYPE_LABELS[selectedJob.employmentType] ?? selectedJob.employmentType}
                  </span>
                )}
                {formatSalary(selectedJob) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e3f8f8] px-2.5 py-1 font-bold text-[#00898c]">
                    <Wallet className="size-3.5" aria-hidden="true" />
                    {formatSalary(selectedJob)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f6f8] px-2.5 py-1">
                  <Users className="size-3.5" aria-hidden="true" />
                  {selectedJob.applicationsCount} applied
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f6f8] px-2.5 py-1">
                  <Eye className="size-3.5" aria-hidden="true" />
                  {selectedJob.viewsCount} views
                </span>
                {selectedJob.createdAt && (
                  <span className="rounded-full bg-[#f3f6f8] px-2.5 py-1">Posted {formatRelative(selectedJob.createdAt).toLowerCase()}</span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {applied ? (
                  <span className="animate-cowry-pop inline-flex h-11 items-center gap-2 rounded-full bg-[#e2f7e8] px-5 text-sm font-bold text-[#1f9c4c]">
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                    Applied — the hiring team has your application
                  </span>
                ) : (
                  <Button
                    type="button"
                    className="h-11 rounded-full bg-linear-to-r from-[#00b4b8] to-[#2dd4d8] px-7 text-base shadow-[0_8px_20px_-8px_rgba(0,180,184,0.7)] transition-transform hover:scale-[1.03] active:scale-95"
                    onClick={() => setIsApplyOpen(true)}
                  >
                    Apply now
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => toggleSaved(selectedJob.id)}
                  aria-label={savedJobIds.has(selectedJob.id) ? "Remove from saved" : "Save job"}
                  className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#383d45] ring-1 ring-[#e2e6ea] transition hover:bg-[#f2f6f8] active:scale-95"
                >
                  <Bookmark className={cn("size-4 transition-colors", savedJobIds.has(selectedJob.id) && "fill-[#00b4b8] text-[#00b4b8]")} />
                  {savedJobIds.has(selectedJob.id) ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleLiked(selectedJob.id)}
                  aria-label={likedJobIds.has(selectedJob.id) ? "Unlike job" : "Like job"}
                  className="flex size-11 items-center justify-center rounded-full ring-1 ring-[#e2e6ea] transition hover:bg-[#f2f6f8] active:scale-90"
                >
                  <Heart className={cn("size-4 transition-colors", likedJobIds.has(selectedJob.id) && "fill-[#ff1f3d] text-[#ff1f3d]")} />
                </button>
                <button
                  type="button"
                  onClick={() => void copyJobLink(selectedJob.id)}
                  aria-label="Copy a link to this job"
                  className="flex size-11 items-center justify-center rounded-full ring-1 ring-[#e2e6ea] transition hover:bg-[#f2f6f8] active:scale-90"
                >
                  <Link2 className="size-4" />
                </button>
              </div>
            </div>
          </section>

          <section className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-[#e2e6ea]">
            <span
              className={cn("flex size-11 items-center justify-center rounded-full text-sm font-bold text-white", avatarColor(selectedJob.hirerName ?? selectedJob.company))}
              aria-hidden="true"
            >
              {getInitials(selectedJob.hirerName ?? selectedJob.company ?? "?")}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[#8a94a3]">Hiring contact</p>
              <p className="truncate text-sm font-bold text-[#151922]">{selectedJob.hirerName ?? "Hiring manager"}</p>
              <p className="truncate text-xs text-[#657080]">{selectedJob.hirerTitle ?? selectedJob.company}</p>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-[#e2e6ea] sm:p-6">
            <h2 className="text-lg font-bold text-[#151922]">About the role</h2>
            <div className="mt-3 whitespace-pre-line text-sm leading-7 text-[#20242c]">{selectedJob.description}</div>
            {selectedJob.benefits && selectedJob.benefits.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-bold text-[#151922]">Benefits</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {selectedJob.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-sm text-[#383d45]">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#1f9c4c]" aria-hidden="true" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </main>
      )}

      <QuickScreeningPanel
        open={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        questions={selectedJob?.screeningQuestions ?? []}
        onApply={handleApply}
      />
    </div>
  )
}
