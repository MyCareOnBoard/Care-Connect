import { useState } from "react"
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
import { useDelayedLoading } from "@/hooks/useDelayedLoading"

const CONTRACT_TYPES = ["Part time", "Contract", "Full time"]
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

type JobPosting = {
  id: string
  title: string
  description: string
  views: string
  applications: string
  saved: string
}

const initialPostings: JobPosting[] = [
  {
    id: "job-1",
    title: "In Home Caregiver",
    description: "Join our compassionate team as an In Home Caregiver and make a meaningful difference in...",
    views: "30",
    applications: "3.5K",
    saved: "12K",
  },
  {
    id: "job-2",
    title: "Synergy HomeCare has Caregiver O...",
    description: "Join our compassionate team as an In Home Caregiver and make a meaningful difference in...",
    views: "13",
    applications: "5K",
    saved: "1K",
  },
  {
    id: "job-3",
    title: "Direct Support Professional",
    description: "Join our compassionate team as an In Home Caregiver and make a meaningful difference in...",
    views: "10K",
    applications: "2K",
    saved: "1.2K",
  },
]

type Applicant = {
  id: string
  name: string
  profession: string
  location: string
  appliedOn: string
  matchScore: number
  status: string
  address: string
  cvFile: string
  coverLetterFile: string
  answers: { question: string; answer: string }[]
}

const applicants: Applicant[] = [
  {
    id: "app-1",
    name: "Cody Fisher",
    profession: "Registered Nurse",
    location: "Brooklyn, NY",
    appliedOn: "May 18, 2026",
    matchScore: 92,
    status: "New application",
    address: "1901 Thornridge Cir. Shiloh, Hawaii 81063",
    cvFile: "Cody_Fisher_CV.pdf",
    coverLetterFile: "Cody_Fisher_CoverLetter.docx",
    answers: [
      { question: "Are you willing to relocate for the job", answer: "No" },
      { question: "Are your required certifications up to date?", answer: "No" },
      { question: "When are you available to start?", answer: "Immediately" },
    ],
  },
  {
    id: "app-2",
    name: "Marvin McKinney",
    profession: "Physical Therapist",
    location: "Queens, NY",
    appliedOn: "May 17, 2026",
    matchScore: 78,
    status: "Rejected",
    address: "4517 Washington Ave. Manchester, Kentucky 39495",
    cvFile: "Marvin_McKinney_CV.pdf",
    coverLetterFile: "Marvin_McKinney_CoverLetter.docx",
    answers: [
      { question: "Are you willing to relocate for the job", answer: "Yes" },
      { question: "Are your required certifications up to date?", answer: "Yes" },
      { question: "When are you available to start?", answer: "Within 2 weeks" },
    ],
  },
  {
    id: "app-3",
    name: "Eleanor Pena",
    profession: "Pharmacist",
    location: "Bronx, NY",
    appliedOn: "May 15, 2026",
    matchScore: 65,
    status: "Withdrawn",
    address: "2464 Royal Ln. Mesa, New Jersey 45463",
    cvFile: "Eleanor_Pena_CV.pdf",
    coverLetterFile: "Eleanor_Pena_CoverLetter.docx",
    answers: [
      { question: "Are you willing to relocate for the job", answer: "No" },
      { question: "Are your required certifications up to date?", answer: "Yes" },
      { question: "When are you available to start?", answer: "More than 1 month" },
    ],
  },
  {
    id: "app-4",
    name: "Wade Warren",
    profession: "Dental Hygienist",
    location: "Manhattan, NY",
    appliedOn: "May 13, 2026",
    matchScore: 84,
    status: "Accepted",
    address: "3517 W. Gray St. Utica, Pennsylvania 57867",
    cvFile: "Wade_Warren_CV.pdf",
    coverLetterFile: "Wade_Warren_CoverLetter.docx",
    answers: [
      { question: "Are you willing to relocate for the job", answer: "Yes" },
      { question: "Are your required certifications up to date?", answer: "Yes" },
      { question: "When are you available to start?", answer: "Immediately" },
    ],
  },
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

function UploadJobPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [contractTypes, setContractTypes] = useState<Set<string>>(new Set(["Part time"]))
  const [benefits, setBenefits] = useState<Set<string>>(new Set())
  const [wantsScreening, setWantsScreening] = useState(false)
  const [isScreeningOpen, setIsScreeningOpen] = useState(false)

  const toggleSet = (set: Set<string>, setSet: (next: Set<string>) => void, value: string) => {
    const next = new Set(set)
    if (next.has(value)) {
      next.delete(value)
    } else {
      next.add(value)
    }
    setSet(next)
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
            <Button type="button" variant="outline" onClick={onClose}>
              Save as draft
            </Button>
            <Button
              type="button"
              className="bg-[#087fff]"
              onClick={() => {
                toast.success("Job posted!")
                onClose()
              }}
            >
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
  applicant,
  onClose,
}: {
  applicant: Applicant | null
  onClose: () => void
}) {
  if (!applicant) return null

  return (
    <SidePanel open onClose={onClose} title="Applicant details" widthClassName="max-w-[560px]">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-[#e8f1f7] text-sm font-bold text-[#087fff]">
            {applicant.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="font-bold">{applicant.name}</p>
            <p className="text-sm text-[#657080]">{applicant.profession}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e2e2e2]">
          <iframe
            title="Applicant location"
            className="h-45 w-full"
            loading="lazy"
            src="https://www.openstreetmap.org/export/embed.html?bbox=-74.03%2C40.68%2C-73.93%2C40.74&layer=mapnik&marker=40.71%2C-73.98"
          />
          <div className="p-3">
            <p className="text-sm font-semibold">{applicant.location}</p>
            <p className="mt-1 text-sm text-[#657080]">{applicant.address}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Candidate CV</p>
          <div className="flex items-center gap-3 rounded-lg border border-[#e2e2e2] p-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#ffeaea] text-[#ff3e66]">PDF</span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{applicant.cvFile}</p>
              <p className="text-xs text-[#8a8f98]">10.5Kb</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => toast("No file available in this demo")}>
              View file
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Candidate Cover letter</p>
          <div className="flex items-center gap-3 rounded-lg border border-[#e2e2e2] p-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#eaf4ff] text-[#087fff]">DOC</span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{applicant.coverLetterFile}</p>
              <p className="text-xs text-[#8a8f98]">10.5Kb</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => toast("No file available in this demo")}>
              View file
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold">Screening questions</p>
          {applicant.answers.map((entry) => (
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
        <Button type="button" variant="outline" onClick={() => { toast("Candidate passed"); onClose() }}>
          No I&apos;d pass
        </Button>
        <Button type="button" className="bg-[#087fff]" onClick={() => { toast.success("Candidate liked!"); onClose() }}>
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
  const isLoading = useDelayedLoading()
  const [postings] = useState(initialPostings)
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)

  if (isLoading) return <JobsSkeleton />

  const selectedPosting = postings.find((posting) => posting.id === selectedPostingId) ?? null

  if (selectedPosting) {
    const stats = [
      { label: "Applications", value: selectedPosting.applications },
      { label: "Under Review", value: "8" },
      { label: "Rejected", value: "6" },
      { label: "Accepted", value: "5" },
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
          <div className="overflow-x-auto rounded-xl border border-[#e2e2e2]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e2e2e2] text-[#657080]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Applicant</th>
                  <th className="px-4 py-3 font-semibold">Profession</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Applied On</th>
                  <th className="px-4 py-3 font-semibold">Match score</th>
                  <th className="px-4 py-3 font-semibold">Application status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((applicant) => (
                  <tr key={applicant.id} className="border-b border-[#eef1f3] last:border-0">
                    <td className="px-4 py-3 font-medium">{applicant.name}</td>
                    <td className="px-4 py-3 text-[#565656]">{applicant.profession}</td>
                    <td className="px-4 py-3 text-[#565656]">{applicant.location}</td>
                    <td className="px-4 py-3 text-[#565656]">{applicant.appliedOn}</td>
                    <td className="px-4 py-3 text-[#565656]">{applicant.matchScore}%</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={applicant.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setSelectedApplicant(applicant)} className="font-semibold text-[#087fff] hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <ApplicantDetailsPanel applicant={selectedApplicant} onClose={() => setSelectedApplicant(null)} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold">My jobs posting</h1>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
          <Input placeholder="Keyword, no_of applicants etc." className="pl-9" />
        </div>
        <Button type="button" className="bg-[#087fff]" onClick={() => setIsUploadOpen(true)}>
          Post job here
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {postings.map((posting) => (
          <article
            key={posting.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedPostingId(posting.id)}
            onKeyDown={(event) => event.key === "Enter" && setSelectedPostingId(posting.id)}
            className="cursor-pointer rounded-xl border border-white/60 bg-white/80 p-5 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,20,26,0.1)]"
          >
            <h3 className="font-bold">{posting.title}</h3>
            <p className="mt-2 text-sm text-[#565656]">{posting.description}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#eef1f3] pt-4 text-center">
              <div>
                <p className="font-bold">{posting.views}</p>
                <p className="text-xs text-[#8a8f98]">Views</p>
              </div>
              <div className="border-x border-[#eef1f3]">
                <p className="font-bold">{posting.applications}</p>
                <p className="text-xs text-[#8a8f98]">Applications</p>
              </div>
              <div>
                <p className="font-bold">{posting.saved}</p>
                <p className="text-xs text-[#8a8f98]">Saved</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <UploadJobPanel open={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  )
}
