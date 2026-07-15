import { useEffect, useState } from "react"
import { toast } from "sonner"
import { ChevronLeft, Search, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SidePanel } from "@/components/app/SidePanel"
import { StatTile } from "@/components/app/StatTile"
import { StatusBadge } from "@/components/app/StatusBadge"
import { getAuthErrorMessage, useAuthUser } from "@/utils/auth"
import {
  createJob,
  listMyJobs,
} from "@/utils/careconnect/services/jobsService"
import {
  listMyApplications,
  updateApplicationStatus,
} from "@/utils/careconnect/services/applicationsService"
import {
  APPLICATION_STATUS_LABELS,
  AVAILABILITY_LABELS,
  formatDate,
  type Application,
  type CreateJobPayload,
  type EmploymentType,
  type Job,
} from "@/utils/careconnect/types"

const CONTRACT_TYPES = ["Part time", "Contract", "Full time"]
const CONTRACT_TYPE_MAP: Record<string, EmploymentType> = {
  "Part time": "part_time",
  Contract: "contract",
  "Full time": "full_time",
}
const BENEFITS = [
  "Retirement Plan (401k)",
  "Health Insurance",
  "Dental Insurance",
  "Vision Insurance",
  "Paid Time Off (PTO)",
  "Overtime Pay",
  "Sign-on Bonus",
  "Tuition & Certification Reimbursement",
  "Career Growth & Professional Development",
]

function BenefitTag({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        selected ? "border-[#087fff] bg-[#eaf4ff] text-[#087fff]" : "border-[#e2e2e2] text-[#141922] hover:border-[#087fff]"
      }`}
    >
      {label}
      {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
    </button>
  )
}

function ScreeningQuestionSetupPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["Option 1"])
  const [required, setRequired] = useState(false)

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Screening question setup"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOptions((current) => [...current, `Option ${current.length + 1}`])}
          >
            Add another question
          </Button>
          <Button
            type="button"
            className="bg-[#087fff]"
            onClick={() => {
              toast.success("Screening questions saved!")
              onClose()
            }}
          >
            Upload questions
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Question</label>
          <div className="flex gap-3">
            <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Enter your question here" />
            <Select defaultValue="multiple-choice">
              <SelectTrigger className="w-45 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple-choice">Multiple choice</SelectItem>
                <SelectItem value="short-answer">Short answer</SelectItem>
                <SelectItem value="yes-no">Yes / No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          {options.map((option, index) => (
            <label key={index} className="flex items-center gap-2 text-sm">
              <span className="flex size-4.5 items-center justify-center rounded-full border-2 border-[#087fff]" />
              {option}
            </label>
          ))}
          <button
            type="button"
            onClick={() => setOptions((current) => [...current, `Option ${current.length + 1}`])}
            className="flex items-center gap-2 text-sm font-medium text-[#565656] hover:text-[#087fff]"
          >
            <span className="flex size-4.5 items-center justify-center rounded-full border-2 border-[#d9d9d9]" />
            Add another option
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-[#eef1f3] pt-5">
          <span className="text-sm font-semibold">Is this question required?</span>
          <Switch checked={required} onCheckedChange={setRequired} />
        </div>
      </div>
    </SidePanel>
  )
}

function UploadJobPanel({
  open,
  onClose,
  defaultCompany,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  defaultCompany: string
  onCreated: (job: Job) => void
}) {
  const [title, setTitle] = useState("")
  const [company, setCompany] = useState(defaultCompany)
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [contractTypes, setContractTypes] = useState<Set<string>>(new Set(["Part time"]))
  const [benefits, setBenefits] = useState<Set<string>>(new Set())
  const [wantsScreening, setWantsScreening] = useState(false)
  const [isScreeningOpen, setIsScreeningOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCompany((current) => current || defaultCompany)
  }, [defaultCompany])

  const toggleSet = (set: Set<string>, setSet: (next: Set<string>) => void, value: string) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setSet(next)
  }

  const submit = async (status: "open" | "draft") => {
    if (!title.trim() || !company.trim() || !location.trim() || !description.trim()) {
      toast.error("Title, company, location, and description are required")
      return
    }
    const firstContract = Array.from(contractTypes)[0]
    const payload: CreateJobPayload = {
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      description: description.trim(),
      employmentType: CONTRACT_TYPE_MAP[firstContract] ?? "full_time",
      benefits: Array.from(benefits),
      status,
    }
    setSaving(true)
    try {
      const job = await createJob(payload)
      onCreated(job)
      toast.success(status === "draft" ? "Saved as draft" : "Job posted!")
      onClose()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title="Upload Job"
        widthClassName="max-w-[560px]"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => submit("draft")}>
              Save as draft
            </Button>
            <Button type="button" className="bg-[#087fff]" disabled={saving} onClick={() => submit("open")}>
              Upload job
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Job title</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter Job title here, eg: HHA Registered care giver" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Company</label>
              <Input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Location</label>
              <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, State" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Job description</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the role of the applicant here"
              className="min-h-32"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold">Select contract type</label>
            <div className="flex flex-wrap gap-5">
              {CONTRACT_TYPES.map((type) => (
                <Checkbox
                  key={type}
                  label={type}
                  checked={contractTypes.has(type)}
                  onChange={() => toggleSet(contractTypes, setContractTypes, type)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold">Select any benefit included, if any select all if applicable!</label>
            <div className="flex flex-wrap gap-2">
              {BENEFITS.map((benefit) => (
                <BenefitTag
                  key={benefit}
                  label={benefit}
                  selected={benefits.has(benefit)}
                  onClick={() => toggleSet(benefits, setBenefits, benefit)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Salary, provide salary if you want it visible.</label>
            <div className="flex gap-3">
              <Select defaultValue="USD">
                <SelectTrigger className="w-28 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="0.00" />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#eef1f3] pt-5">
            <span className="text-sm font-semibold">Want to add screening questions?</span>
            <Switch
              checked={wantsScreening}
              onCheckedChange={(checked) => {
                setWantsScreening(checked)
                if (checked) setIsScreeningOpen(true)
              }}
            />
          </div>
        </div>
      </SidePanel>

      <ScreeningQuestionSetupPanel open={isScreeningOpen} onClose={() => setIsScreeningOpen(false)} />
    </>
  )
}

function ApplicantDetailsPanel({
  application,
  onClose,
  onStatusChange,
}: {
  application: Application | null
  onClose: () => void
  onStatusChange: (id: string, status: "shortlisted" | "not_selected") => void
}) {
  if (!application) return null

  const answers = [
    {
      question: "Are you willing to relocate for the job",
      answer: application.screening.willingToRelocate ? "Yes" : "No",
    },
    {
      question: "Are your required certifications up to date?",
      answer: application.screening.certificationsUpToDate ? "Yes" : "No",
    },
    {
      question: "When are you available to start?",
      answer: AVAILABILITY_LABELS[application.screening.availability],
    },
  ]

  return (
    <SidePanel open onClose={onClose} title="Applicant details" widthClassName="max-w-[560px]">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-[#e8f1f7] text-sm font-bold text-[#087fff]">
            {(application.applicantName ?? "?").slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="font-bold">{application.applicantName ?? "Applicant"}</p>
            <p className="text-sm text-[#657080]">{application.jobTitle}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#e2e2e2] p-3">
          <p className="text-sm font-semibold">{application.location}</p>
          <p className="mt-1 text-sm text-[#657080]">Applied {formatDate(application.createdAt)}</p>
        </div>

        {application.screening.whyInterested ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold">Why they&apos;re interested</p>
            <p className="text-sm text-[#565656]">{application.screening.whyInterested}</p>
          </div>
        ) : null}

        <div className="space-y-4">
          <p className="text-sm font-semibold">Screening questions</p>
          {answers.map((entry) => (
            <div key={entry.question}>
              <p className="text-sm">{entry.question}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-[#087fff]">
                <span className="size-2 rounded-full bg-[#087fff]" />
                {entry.answer}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onStatusChange(application.id, "not_selected")
            onClose()
          }}
        >
          No I&apos;d pass
        </Button>
        <Button
          type="button"
          className="bg-[#087fff]"
          onClick={() => {
            onStatusChange(application.id, "shortlisted")
            onClose()
          }}
        >
          Yes I like this candidate
        </Button>
      </div>
    </SidePanel>
  )
}

function JobsSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
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

export default function AgencyJobsPage() {
  const { user } = useAuthUser()
  const defaultCompany =
    (user?.profile?.name as string | undefined) || user?.fullName || ""

  const [postings, setPostings] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  // Applications for the selected posting.
  const [applications, setApplications] = useState<Application[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const jobs = await listMyJobs()
        if (active) setPostings(jobs)
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

  const loadApplications = async (jobId: string) => {
    setApplicationsLoading(true)
    try {
      const { applications: list } = await listMyApplications(jobId)
      setApplications(list)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setApplicationsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedPostingId) loadApplications(selectedPostingId)
    else setApplications([])
  }, [selectedPostingId])

  const handleStatusChange = async (
    id: string,
    status: "shortlisted" | "not_selected",
  ) => {
    try {
      const updated = await updateApplicationStatus(id, status)
      setApplications((current) =>
        current.map((application) => (application.id === id ? updated : application)),
      )
      toast.success("Application updated")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    }
  }

  if (loading) return <JobsSkeleton />

  const selectedPosting = postings.find((posting) => posting.id === selectedPostingId) ?? null

  if (selectedPosting) {
    const countBy = (predicate: (a: Application) => boolean) =>
      String(applications.filter(predicate).length)
    const stats = [
      { label: "Applications", value: String(applications.length) },
      { label: "Under Review", value: countBy((a) => a.status === "under_review") },
      { label: "Rejected", value: countBy((a) => a.status === "not_selected") },
      { label: "Shortlisted", value: countBy((a) => a.status === "shortlisted") },
    ]

    return (
      <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedPostingId(null)}
            aria-label="Back to job postings"
            className="flex size-9 items-center justify-center rounded-full border border-[#e2e2e2] transition hover:bg-[#f2f6f8]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h1 className="text-xl font-bold">{selectedPosting.title}</h1>
        </div>

        <section>
          <h2 className="mb-4 text-base font-bold">Application overview</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            {stats.map((stat) => (
              <StatTile key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-base font-bold">All applicants</h2>
          {applicationsLoading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : applications.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#e2e2e2] p-6 text-center text-sm text-[#657080]">
              No applications yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#e2e2e2]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e2e2e2] text-[#657080]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Applicant</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Applied On</th>
                    <th className="px-4 py-3 font-semibold">Application status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id} className="border-b border-[#eef1f3] last:border-0">
                      <td className="px-4 py-3 font-medium">{application.applicantName ?? "Applicant"}</td>
                      <td className="px-4 py-3 text-[#565656]">{application.location}</td>
                      <td className="px-4 py-3 text-[#565656]">{formatDate(application.createdAt)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={APPLICATION_STATUS_LABELS[application.status]} />
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setSelectedApplication(application)} className="font-semibold text-[#087fff] hover:underline">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ApplicantDetailsPanel
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onStatusChange={handleStatusChange}
        />
      </div>
    )
  }

  const visiblePostings = search
    ? postings.filter((posting) => posting.title.toLowerCase().includes(search.toLowerCase()))
    : postings

  return (
    <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold">My jobs posting</h1>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
          <Input
            placeholder="Keyword, no_of applicants etc."
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button type="button" className="bg-[#087fff]" onClick={() => setIsUploadOpen(true)}>
          Post job here
        </Button>
      </div>

      {visiblePostings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center text-sm text-[#657080]">
          You haven&apos;t posted any jobs yet. Click &quot;Post job here&quot; to create your first listing.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visiblePostings.map((posting) => (
            <article
              key={posting.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPostingId(posting.id)}
              onKeyDown={(event) => event.key === "Enter" && setSelectedPostingId(posting.id)}
              className="cursor-pointer rounded-xl border border-white/60 bg-white/80 p-5 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,20,26,0.1)]"
            >
              <h3 className="font-bold">{posting.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-[#565656]">{posting.description}</p>
              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#eef1f3] pt-4 text-center">
                <div>
                  <p className="font-bold">{posting.viewsCount}</p>
                  <p className="text-xs text-[#8a8f98]">Views</p>
                </div>
                <div className="border-x border-[#eef1f3]">
                  <p className="font-bold">{posting.applicationsCount}</p>
                  <p className="text-xs text-[#8a8f98]">Applications</p>
                </div>
                <div>
                  <p className="font-bold">{posting.savedCount}</p>
                  <p className="text-xs text-[#8a8f98]">Saved</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <UploadJobPanel
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultCompany={defaultCompany}
        onCreated={(job) => setPostings((current) => [job, ...current])}
      />
    </div>
  )
}
