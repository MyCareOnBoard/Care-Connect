import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Search, Heart, Bookmark, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { SidePanel } from "@/components/app/SidePanel"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  listJobs,
  listSavedJobs,
  saveJob,
  unsaveJob,
} from "@/utils/careconnect/services/jobsService"
import {
  applyToJob,
  listMyApplications,
} from "@/utils/careconnect/services/applicationsService"
import { AVAILABILITY_FROM_LABEL, type Job, type Screening } from "@/utils/careconnect/types"

function QuickScreeningPanel({
  open,
  onClose,
  onApply,
}: {
  open: boolean
  onClose: () => void
  onApply: (screening: Screening) => void
}) {
  const [relocate, setRelocate] = useState<"No" | "Yes">("No")
  const [certifications, setCertifications] = useState<"No" | "Yes">("No")
  const [availability, setAvailability] = useState("Immediately")
  const [why, setWhy] = useState("")

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Quick screening question"
      footer={
        <Button
          type="button"
          className="w-full bg-[#087fff]"
          onClick={() => {
            onApply({
              willingToRelocate: relocate === "Yes",
              certificationsUpToDate: certifications === "Yes",
              availability: AVAILABILITY_FROM_LABEL[availability] ?? "immediately",
              whyInterested: why,
            })
            onClose()
          }}
        >
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
                <input type="radio" checked={relocate === option} onChange={() => setRelocate(option)} className="accent-[#087fff]" />
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
                <input type="radio" checked={certifications === option} onChange={() => setCertifications(option)} className="accent-[#087fff]" />
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
                <input type="radio" checked={availability === option} onChange={() => setAvailability(option)} className="accent-[#087fff]" />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-[#eef1f3] pt-5">
          <label className="text-sm font-medium">Why are you interested in this opportunity?</label>
          <Textarea value={why} onChange={(event) => setWhy(event.target.value)} className="min-h-30" />
        </div>
      </div>
    </SidePanel>
  )
}

function JobsSkeleton() {
  return (
    <div className="p-5 space-y-6 sm:p-8">
      <Skeleton className="h-10 w-60" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [isApplyOpen, setIsApplyOpen] = useState(false)

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
        setJobs(fetchedJobs)
        setSelectedJobId((current) => current ?? fetchedJobs[0]?.id ?? null)
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
  }, [])

  if (loading) return <JobsSkeleton />

  const visibleJobs = search
    ? jobs.filter(
        (job) =>
          job.title.toLowerCase().includes(search.toLowerCase()) ||
          job.company.toLowerCase().includes(search.toLowerCase()),
      )
    : jobs

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

  const handleApply = async (screening: Screening) => {
    if (!selectedJob) return
    try {
      await applyToJob({ jobId: selectedJob.id, screening })
      toast.success("Application submitted!")
      setAppliedJobIds((current) => new Set(current).add(selectedJob.id))
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    }
  }

  return (
    <div className="animate-fade-in-up grid gap-5 p-5 sm:p-8 xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
          <Input
            placeholder="Job title, keywords, or company"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {visibleJobs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e2e2e2] p-6 text-center text-sm text-[#657080]">
            No jobs found.
          </p>
        ) : (
          <div className="space-y-3">
            {visibleJobs.map((job) => (
              <article
                key={job.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedJobId(job.id)}
                onKeyDown={(event) => event.key === "Enter" && setSelectedJobId(job.id)}
                className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                  job.id === selectedJob?.id ? "border-[#087fff] bg-[#eaf4ff]" : "border-[#e2e2e2] bg-white hover:border-[#087fff]/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold leading-snug">{job.title}</h3>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleSaved(job.id)
                    }}
                    aria-label={savedJobIds.has(job.id) ? "Unsave job" : "Save job"}
                    className="shrink-0"
                  >
                    <Heart className={`size-5 transition-colors ${savedJobIds.has(job.id) ? "fill-[#ff3e66] text-[#ff3e66]" : "text-[#20242c]"}`} />
                  </button>
                </div>
                <p className="mt-2 text-sm text-[#565656]">{job.company}</p>
                <p className="mt-1 text-sm text-[#565656]">{job.location}</p>
                {job.tags && job.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {job.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[#dddddd] px-3 py-1 text-xs font-semibold text-[#20242c]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </aside>

      {selectedJob && (
        <main className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{selectedJob.title}</h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-[#565656]">
                {selectedJob.company}
                <LinkIcon className="size-3.5" />
              </p>
              <p className="mt-1 text-sm text-[#565656]">{selectedJob.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#ffc95c] text-sm font-bold text-white">
              {(selectedJob.hirerName ?? selectedJob.company ?? "?")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-bold">{selectedJob.hirerName ?? "Hiring Manager"}</p>
              <p className="text-sm text-[#657080]">{selectedJob.hirerTitle ?? "Job Hirer"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              className="bg-[#087fff]"
              disabled={appliedJobIds.has(selectedJob.id)}
              onClick={() => setIsApplyOpen(true)}
            >
              {appliedJobIds.has(selectedJob.id) ? "Applied" : "Apply here"}
            </Button>
            <button
              type="button"
              onClick={() => toggleSaved(selectedJob.id)}
              aria-label="Save job"
              className="flex size-11 items-center justify-center rounded-full border border-[#e2e2e2] transition hover:bg-[#f2f6f8]"
            >
              <Heart className={`size-4 transition-colors ${savedJobIds.has(selectedJob.id) ? "fill-[#ff3e66] text-[#ff3e66]" : ""}`} />
            </button>
            <button
              type="button"
              aria-label="Bookmark job"
              className="flex size-11 items-center justify-center rounded-full border border-[#e2e2e2] transition hover:bg-[#f2f6f8]"
            >
              <Bookmark className="size-4" />
            </button>
          </div>

          <div className="border-t border-[#eef1f3] pt-5">
            <h2 className="text-lg font-bold">Job details</h2>
            <p className="mt-1 text-sm text-[#657080]">Here&apos;s how the job details align with your profile.</p>
            <div className="mt-4 whitespace-pre-line rounded-xl bg-[#f7f9fa] p-5 text-sm leading-6 text-[#20242c]">
              {selectedJob.description}
            </div>
          </div>
        </main>
      )}

      <QuickScreeningPanel
        open={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        onApply={handleApply}
      />
    </div>
  )
}
