import { useEffect, useState } from "react"
import { toast } from "sonner"
import { ChevronLeft, Search, Plus, Check, MoreVertical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SidePanel } from "@/components/app/SidePanel"
import { StatTile } from "@/components/app/StatTile"
import { StatusBadge } from "@/components/app/StatusBadge"
import { getAuthErrorMessage, useAuthUser } from "@/utils/auth"
import {
  createJob,
  deleteJob,
  listMyJobs,
  updateJob,
} from "@/utils/careconnect/services/jobsService"
import {
  listMyApplications,
  updateApplicationStatus,
} from "@/utils/careconnect/services/applicationsService"
import {
  APPLICATION_STATUS_LABELS,
  AVAILABILITY_LABELS,
  formatDate,
  formatSalary,
  type Application,
  type CreateJobPayload,
  type EmploymentType,
  type Job,
  type JobStatus,
  type ScreeningQuestion,
  type ScreeningQuestionType,
} from "@/utils/careconnect/types"

const CONTRACT_TYPES = ["Part time", "Contract", "Full time", "Per diem"]
const CONTRACT_TYPE_MAP: Record<string, EmploymentType> = {
  "Part time": "part_time",
  Contract: "contract",
  "Full time": "full_time",
  "Per diem": "per_diem",
}
const EMPLOYMENT_TO_CONTRACT_LABEL: Record<EmploymentType, string> = {
  part_time: "Part time",
  contract: "Contract",
  full_time: "Full time",
  per_diem: "Per diem",
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

const STATUS_PILL: Record<JobStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-[#eafaf1] text-[#10ad58]" },
  closed: { label: "Closed", className: "bg-[#eef1f3] text-[#565656]" },
  draft: { label: "Draft", className: "bg-[#fff4e5] text-[#d97a2b]" },
}

function StatusPill({ status }: { status: JobStatus }) {
  const pill = STATUS_PILL[status] ?? STATUS_PILL.open
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill.className}`}>
      {pill.label}
    </span>
  )
}

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

/** Editable draft of a screening question inside the upload-job form. */
type QuestionDraft = {
  id: string
  question: string
  type: ScreeningQuestionType
  options: string[]
  required: boolean
}

const newQuestionDraft = (): QuestionDraft => ({
  id: crypto.randomUUID(),
  question: "",
  type: "short_answer",
  options: ["", ""],
  required: false,
})

/** Convert a persisted job question back into an editable draft. */
const questionToDraft = (question: ScreeningQuestion): QuestionDraft => ({
  id: question.id || crypto.randomUUID(),
  question: question.question,
  type: question.type,
  options: question.options && question.options.length > 0 ? question.options : ["", ""],
  required: Boolean(question.required),
})

const QUESTION_TYPE_OPTIONS: { value: ScreeningQuestionType; label: string }[] = [
  { value: "short_answer", label: "Short answer" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "yes_no", label: "Yes / No" },
]

function ScreeningQuestionsBuilder({
  questions,
  onChange,
}: {
  questions: QuestionDraft[]
  onChange: (next: QuestionDraft[]) => void
}) {
  const update = (id: string, patch: Partial<QuestionDraft>) =>
    onChange(questions.map((question) => (question.id === id ? { ...question, ...patch } : question)))
  const remove = (id: string) => onChange(questions.filter((question) => question.id !== id))

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div key={question.id} className="space-y-3 rounded-xl border border-[#e2e2e2] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#657080]">Question {index + 1}</span>
            <button
              type="button"
              onClick={() => remove(question.id)}
              aria-label="Remove question"
              className="text-[#657080] transition hover:text-[#ff3e66]"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex gap-3">
            <Input
              value={question.question}
              onChange={(event) => update(question.id, { question: event.target.value })}
              placeholder="Enter your question here"
            />
            <Select
              value={question.type}
              onValueChange={(value) => update(question.id, { type: value as ScreeningQuestionType })}
            >
              <SelectTrigger className="w-40 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {question.type === "multiple_choice" && (
            <div className="space-y-2">
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <span className="size-3.5 shrink-0 rounded-full border-2 border-[#087fff]" />
                  <Input
                    value={option}
                    onChange={(event) =>
                      update(question.id, {
                        options: question.options.map((current, i) => (i === optionIndex ? event.target.value : current)),
                      })
                    }
                    placeholder={`Option ${optionIndex + 1}`}
                  />
                  {question.options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => update(question.id, { options: question.options.filter((_, i) => i !== optionIndex) })}
                      aria-label="Remove option"
                      className="text-[#657080] transition hover:text-[#ff3e66]"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => update(question.id, { options: [...question.options, ""] })}
                className="flex items-center gap-2 text-sm font-medium text-[#087fff] hover:underline"
              >
                <Plus className="size-4" />
                Add another option
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#eef1f3] pt-3">
            <span className="text-sm">Required?</span>
            <Switch checked={question.required} onCheckedChange={(checked) => update(question.id, { required: checked })} />
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={() => onChange([...questions, newQuestionDraft()])}>
        <Plus className="size-4" />
        Add screening question
      </Button>
    </div>
  )
}

function UploadJobPanel({
  open,
  onClose,
  defaultCompany,
  job,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  defaultCompany: string
  job: Job | null
  onSaved: (job: Job) => void
}) {
  const isEdit = Boolean(job)
  const [title, setTitle] = useState("")
  const [company, setCompany] = useState(defaultCompany)
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [contractType, setContractType] = useState("Part time")
  const [tags, setTags] = useState("")
  const [hirerName, setHirerName] = useState("")
  const [hirerTitle, setHirerTitle] = useState("")
  const [benefits, setBenefits] = useState<Set<string>>(new Set())
  const [wantsScreening, setWantsScreening] = useState(false)
  const [questions, setQuestions] = useState<QuestionDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [currency, setCurrency] = useState("USD")
  const [salary, setSalary] = useState("")

  // Prefill from `job` when editing, reset to blanks when creating — each time the panel opens.
  useEffect(() => {
    if (!open) return
    if (job) {
      setTitle(job.title)
      setCompany(job.company)
      setLocation(job.location)
      setDescription(job.description)
      setContractType(EMPLOYMENT_TO_CONTRACT_LABEL[job.employmentType] ?? "Full time")
      setTags((job.tags ?? []).join(", "))
      setHirerName(job.hirerName ?? "")
      setHirerTitle(job.hirerTitle ?? "")
      setBenefits(new Set(job.benefits ?? []))
      setSalary(job.salary != null ? String(job.salary) : "")
      setCurrency(job.salaryCurrency ?? "USD")
      const drafts = (job.screeningQuestions ?? []).map(questionToDraft)
      setQuestions(drafts)
      setWantsScreening(drafts.length > 0)
    } else {
      setTitle("")
      setCompany(defaultCompany)
      setLocation("")
      setDescription("")
      setContractType("Part time")
      setTags("")
      setHirerName("")
      setHirerTitle("")
      setBenefits(new Set())
      setSalary("")
      setCurrency("USD")
      setQuestions([])
      setWantsScreening(false)
    }
  }, [open, job, defaultCompany])

  const toggleBenefit = (value: string) => {
    setBenefits((current) => {
      const next = new Set(current)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const submit = async (status: JobStatus) => {
    if (!title.trim() || !company.trim() || !location.trim() || !description.trim()) {
      toast.error("Title, company, location, and description are required")
      return
    }
    const salaryNum = salary.trim() ? Number(salary) : undefined
    if (salaryNum !== undefined && Number.isNaN(salaryNum)) {
      toast.error("Salary must be a number")
      return
    }

    const screeningQuestions: ScreeningQuestion[] = wantsScreening
      ? questions
          .filter((question) => question.question.trim())
          .map((question) => ({
            id: question.id,
            question: question.question.trim(),
            type: question.type,
            options:
              question.type === "multiple_choice"
                ? question.options.map((option) => option.trim()).filter(Boolean)
                : [],
            required: question.required,
          }))
      : []
    const invalidChoice = screeningQuestions.find(
      (question) => question.type === "multiple_choice" && (question.options?.length ?? 0) < 2,
    )
    if (invalidChoice) {
      toast.error("Multiple-choice questions need at least two options")
      return
    }

    const payload: CreateJobPayload = {
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      description: description.trim(),
      employmentType: CONTRACT_TYPE_MAP[contractType] ?? "full_time",
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      hirerName: hirerName.trim() || undefined,
      hirerTitle: hirerTitle.trim() || undefined,
      benefits: Array.from(benefits),
      salary: salaryNum,
      salaryCurrency: currency,
      status,
      screeningQuestions,
    }
    setSaving(true)
    try {
      const saved = job ? await updateJob(job.id, payload) : await createJob(payload)
      onSaved(saved)
      toast.success(isEdit ? "Job updated" : status === "draft" ? "Saved as draft" : "Job posted!")
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
        title={isEdit ? "Edit Job" : "Upload Job"}
        widthClassName="max-w-[520px]"
        footer={
          isEdit ? (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#087fff]"
                disabled={saving}
                onClick={() => submit(job?.status ?? "open")}
              >
                Save changes
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => submit("draft")}>
                Save as draft
              </Button>
              <Button type="button" className="bg-[#087fff]" disabled={saving} onClick={() => submit("open")}>
                Upload job
              </Button>
            </div>
          )
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
                  checked={contractType === type}
                  onChange={() => setContractType(type)}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Hiring contact name</label>
              <Input value={hirerName} onChange={(event) => setHirerName(event.target.value)} placeholder="e.g. Jerome Bell" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Hiring contact title</label>
              <Input value={hirerTitle} onChange={(event) => setHirerTitle(event.target.value)} placeholder="e.g. Hiring Manager" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Tags</label>
            <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Comma-separated, e.g. 401(K), Flexible schedule" />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold">Select any benefit included, if any select all if applicable!</label>
            <div className="flex flex-wrap gap-2">
              {BENEFITS.map((benefit) => (
                <BenefitTag
                  key={benefit}
                  label={benefit}
                  selected={benefits.has(benefit)}
                  onClick={() => toggleBenefit(benefit)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Salary, provide salary if you want it visible.</label>
            <div className="flex gap-3">
              <Select value={currency} onValueChange={(val) => setCurrency(val)}>
                <SelectTrigger className="w-28 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="space-y-4 border-t border-[#eef1f3] pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Want to add screening questions?</span>
              <Switch
                checked={wantsScreening}
                onCheckedChange={(checked) => {
                  setWantsScreening(checked)
                  // Seed a first blank question when turning the section on.
                  if (checked && questions.length === 0) setQuestions([newQuestionDraft()])
                }}
              />
            </div>
            {wantsScreening && (
              <>
                <p className="text-xs text-[#657080]">
                  Applicants answer these when applying. Their responses show on the applicant details view.
                </p>
                <ScreeningQuestionsBuilder questions={questions} onChange={setQuestions} />
              </>
            )}
          </div>
        </div>
      </SidePanel>
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
    // Company-defined questions from the job posting.
    ...(application.screeningAnswers ?? []).map((entry) => ({
      question: entry.question,
      answer: entry.answer?.trim() ? entry.answer : "—",
    })),
  ]

  return (
    <SidePanel open={true} onClose={onClose} title="Applicant details" widthClassName="max-w-[520px]">
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

export default function AgencyJobsPage() {
  const { user } = useAuthUser()
  const defaultCompany =
    (user?.profile?.name as string | undefined) || user?.fullName || ""

  const [postings, setPostings] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null)

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

  // Insert (create) or replace (edit) a posting in local state.
  const upsertPosting = (job: Job) =>
    setPostings((current) => {
      const index = current.findIndex((posting) => posting.id === job.id)
      if (index === -1) return [job, ...current]
      const next = [...current]
      next[index] = job
      return next
    })

  const handleEditPosting = (job: Job) => {
    setEditingJob(job)
    setPanelOpen(true)
  }

  const handleChangeJobStatus = async (job: Job, status: JobStatus) => {
    try {
      const updated = await updateJob(job.id, { status })
      upsertPosting(updated)
      toast.success(
        status === "closed" ? "Posting closed" : status === "draft" ? "Moved to draft" : "Posting is now open",
      )
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    try {
      await deleteJob(id)
      setPostings((current) => current.filter((posting) => posting.id !== id))
      toast.success("Posting deleted")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setDeleteTarget(null)
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
      <div className="p-5 space-y-6 animate-fade-in-up sm:p-8">
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
          <StatusPill status={selectedPosting.status} />
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
    <div className="p-5 space-y-6 animate-fade-in-up sm:p-8">
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
        <Button
          type="button"
          className="bg-[#087fff]"
          onClick={() => {
            setEditingJob(null)
            setPanelOpen(true)
          }}
        >
          Post job here
        </Button>
      </div>

      {visiblePostings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center text-sm text-[#657080]">
          You haven&apos;t posted any jobs yet. Click &quot;Post job here&quot; to create your first listing.
        </p>
      ) : (
        <div className="grid gap-4 py-8 sm:grid-cols-2 xl:grid-cols-4">
          {visiblePostings.map((posting) => (
            <article
              key={posting.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPostingId(posting.id)}
              onKeyDown={(event) => event.key === "Enter" && setSelectedPostingId(posting.id)}
              className="cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="relative rounded-3xl p-10 hover:shadow-[0_8px_32px_rgba(16,20,26,0.06)] min-h-55 overflow-hidden">
                <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 331 225" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                  <path d="M314 0.5C323.113 0.500016 330.5 7.88731 330.5 17V208C330.5 217.113 323.113 224.5 314 224.5H17C7.8873 224.5 0.5 217.113 0.5 208V50.627C0.500016 41.5143 7.88731 34.127 17 34.127H224.948C231.357 34.1269 237.106 30.1824 239.411 24.2021L244.475 11.0654C246.929 4.69946 253.048 0.500175 259.87 0.5H314Z" stroke="#D9D9D9" strokeWidth="1" />
                </svg>

                <div className="absolute right-4 top-4 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Posting actions"
                        onClick={(event) => event.stopPropagation()}
                        className="flex size-8 items-center justify-center rounded-full text-[#565656] transition hover:bg-black/5"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleEditPosting(posting)}>Edit</DropdownMenuItem>
                      {posting.status === "open" && (
                        <DropdownMenuItem onSelect={() => handleChangeJobStatus(posting, "closed")}>
                          Close posting
                        </DropdownMenuItem>
                      )}
                      {posting.status === "closed" && (
                        <DropdownMenuItem onSelect={() => handleChangeJobStatus(posting, "open")}>
                          Reopen posting
                        </DropdownMenuItem>
                      )}
                      {posting.status === "draft" && (
                        <DropdownMenuItem onSelect={() => handleChangeJobStatus(posting, "open")}>
                          Publish posting
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(posting)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="relative z-10 pr-8">
                  <div className="flex items-center gap-2">
                    <StatusPill status={posting.status} />
                    {formatSalary(posting) && (
                      <span className="text-xs font-semibold text-[#087fff]">{formatSalary(posting)}</span>
                    )}
                  </div>
                  <h3 className="mt-2 font-bold">{posting.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-[#565656]">{posting.description}</p>
                </div>

                <div className="absolute left-0 right-0 bottom-0 grid grid-cols-3 gap-2 border-t border-[#eef1f3] p-4 text-center bg-white/0">
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
              </div>
            </article>
          ))}
        </div>
      )}

      <UploadJobPanel
        open={panelOpen}
        job={editingJob}
        onClose={() => {
          setPanelOpen(false)
          setEditingJob(null)
        }}
        defaultCompany={defaultCompany}
        onSaved={upsertPosting}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(nextOpen) => { if (!nextOpen) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this posting?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title}&quot; will be permanently removed. Existing applications are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-[#ff3e66] hover:bg-[#ff3e66]/90" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
