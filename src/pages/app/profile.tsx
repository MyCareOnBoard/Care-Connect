import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { useNavigate } from "react-router"
import { Banknote, Briefcase, Camera, Mail, MapPin, Pencil, Phone, UserPlus, UserRound, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProfileModals } from "@/components/profile/ProfileModals"
import { PortfolioPost, type PortfolioPostData } from "@/components/profile/PortfolioPost"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { toast } from "sonner"
import { useAuthUser } from "@/utils/auth"
import { getProfile } from "@/utils/careconnect/services/profilesService"
import { listMyJobs } from "@/utils/careconnect/services/jobsService"
import { EMPLOYMENT_TYPE_LABELS, formatRelative, formatSalary, type Job } from "@/utils/careconnect/types"

const initialExperience = [
  {
    role: "ICU Registered Nurse",
    company: "MedFirst Agency",
    duration: "Jan 2020 – Present",
    description: "Critical care nursing in a 24-bed ICU. Manage complex patients, lead code responses, mentor new nurses.",
  },
  {
    role: "Staff Nurse",
    company: "Grady Memorial Hospital",
    duration: "Jun 2018 – Dec 2019",
    description: "Floor nursing on a 32-bed med-surg unit. Specialized in post-op cardiac care.",
  },
]

const initialSkills = [
  "Critical Care",
  "IV Therapy",
  "BLS/ACLS",
  "Ventilator Management",
  "Sepsis Protocol",
  "Patient Assessment",
  "EHR/EMR",
  "Team Leadership",
  "Patient Education",
  "Wound Care",
]

const initialCertifications = [
  { title: "CCRN — Critical Care Registered Nurse", provider: "AACN", date: "Expires Dec 2025", status: "Active" },
  { title: "BLS Provider", provider: "American Heart Association", date: "Expires Aug 2024", status: "Expiring soon" },
  { title: "RN License — Georgia", provider: "Georgia Nursing Board", date: "Expires Mar 2026", status: "Active" },
]

const defaultSummary = {
  name: "",
  headline: "",
  location: "",
  email: "",
  phone: "",
  metrics: [
    { label: "Connections", value: "0" },
    { label: "Profile views", value: "0" },
    { label: "Application views", value: "0" },
  ],
}

const defaultAgencySummary = {
  name: "",
  headline: "",
  location: "",
  email: "",
  phone: "",
  metrics: [
    { label: "Subscriptions", value: "0" },
    { label: "Profile views", value: "0" },
    { label: "Jobs posted", value: "0" },
  ],
}

type AgencyPostedJob = {
  id: string
  title: string
  status: string
  type: string
  location: string
  pay?: string
  applicants: number
  postedAgo: string
}

const AGENCY_STATUS_LABEL: Record<string, string> = { open: "Active", closed: "Closed", draft: "Draft" }

/** Map a backend job into the presentational posted-job shape. */
function toPostedJob(job: Job): AgencyPostedJob {
  return {
    id: job.id,
    title: job.title,
    status: AGENCY_STATUS_LABEL[job.status] ?? job.status,
    type: EMPLOYMENT_TYPE_LABELS[job.employmentType] ?? job.employmentType,
    location: job.location,
    pay: formatSalary(job) ?? undefined,
    applicants: job.applicationsCount ?? 0,
    postedAgo: `Posted ${formatRelative(job.createdAt)}`,
  }
}

type TeamMember = {
  id: string
  name: string
  role: string
  status: "active" | "invited"
  avatarBg: string
}

const initialTeamMembers: TeamMember[] = [
  { id: "tm-1", name: "Jerome Bell", role: "Registered Nurse | Mental Health Advocate", status: "active", avatarBg: "bg-[#f5a623]" },
  { id: "tm-2", name: "Darrell Steward", role: "Registered Nurse | Mental Health Advocate", status: "active", avatarBg: "bg-[#6b9cca]" },
]

const initialPortfolio: PortfolioPostData[] = [
  {
    id: "post-1",
    paragraphs: [
      "One of the hardest product decisions isn't what to build.",
      "It's deciding who you're willing to disappoint.",
      "We spend so much time trying to make products work for everyone that we slowly make them exceptional for no one.",
      "Every product has a target user.",
      "The challenge is having the discipline to design for them, even when it means saying no to everyone else.",
    ],
    statement: "Not every user is your user.",
    likes: 140,
    comments: [
      { id: "c1", author: "Esther Howard", text: "Needed this today. So well said." },
    ],
  },
]

const userTabs = ["About", "Experience", "Skills", "Certifications", "Portfolio"] as const
const agencyTabs = ["About", "Posted jobs", "Team", "Certifications", "Portfolio"] as const
type ProfileTab = (typeof userTabs)[number] | (typeof agencyTabs)[number]

export default function ProfilePage() {
  const { user } = useAuthUser()
  const { flow } = useCareFlow()
  const navigate = useNavigate()
  const isAgency = flow === "agency"
  const [profileSummary, setProfileSummary] = useState(defaultSummary)
  const [agencySummary, setAgencySummary] = useState(defaultAgencySummary)
  const [postedJobs, setPostedJobs] = useState<AgencyPostedJob[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const summary = isAgency ? agencySummary : profileSummary
  const tabs = isAgency ? agencyTabs : userTabs
  const [activeTab, setActiveTab] = useState<ProfileTab>("About")

  // Populate the header identity + view/connection counters from real data.
  useEffect(() => {
    if (!user?.uid) return
    let active = true
    ;(async () => {
      try {
        const me = await getProfile(user.uid)
        if (!active) return
        setProfileSummary({
          name: me.name || user.fullName || "",
          headline: me.subtitle || "",
          location: me.location || "",
          email: user.email || "",
          phone: user.phoneNumber || "",
          metrics: [
            { label: "Connections", value: String(me.connectionsCount ?? 0) },
            { label: "Profile views", value: String(me.profileViewsCount ?? 0) },
            { label: "Application views", value: String(me.applicationViewsCount ?? 0) },
          ],
        })

        if (isAgency) {
          const jobs = await listMyJobs().catch(() => [])
          if (!active) return
          setPostedJobs(jobs.map(toPostedJob))
          setSpecialties(Array.isArray(me.organizationInterests) ? me.organizationInterests : [])
          setAgencySummary({
            name: me.name || user.fullName || "",
            headline: me.subtitle || "",
            location: me.location || "",
            email: user.email || "",
            phone: user.phoneNumber || "",
            metrics: [
              { label: "Subscriptions", value: String(me.connectionsCount ?? 0) },
              { label: "Profile views", value: String(me.profileViewsCount ?? 0) },
              { label: "Jobs posted", value: String(jobs.length) },
            ],
          })
        }
      } catch {
        // fall back to auth identity only
        if (active) {
          const identity = {
            name: user.fullName || "",
            email: user.email || "",
            phone: user.phoneNumber || "",
          }
          setProfileSummary((prev) => ({ ...prev, ...identity }))
          setAgencySummary((prev) => ({ ...prev, ...identity }))
        }
      }
    })()
    return () => {
      active = false
    }
  }, [user?.uid, user?.fullName, user?.email, user?.phoneNumber, isAgency])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [experienceOpen, setExperienceOpen] = useState(false)
  const [skillOpen, setSkillOpen] = useState(false)
  const [certificationOpen, setCertificationOpen] = useState(false)
  const [teamInviteOpen, setTeamInviteOpen] = useState(false)
  const [experience, setExperience] = useState(initialExperience)
  const [skills, setSkills] = useState(initialSkills)
  const [certifications, setCertifications] = useState(initialCertifications)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers)
  const [portfolio, setPortfolio] = useState(initialPortfolio)
  const [newSkill, setNewSkill] = useState("")
  const [newExperience, setNewExperience] = useState({ role: "", company: "", duration: "", description: "" })
  const [newCertification, setNewCertification] = useState({ title: "", provider: "", date: "", file: "" })
  const [newTeamInvite, setNewTeamInvite] = useState({ phone: "", email: "", fullName: "" })

  const withdrawInvite = (id: string) => {
    setTeamMembers((current) => current.filter((member) => member.id !== id))
  }
  const [notificationOptions, setNotificationOptions] = useState({
    jobMatches: true,
    certificationExpiring: true,
    newMessages: true,
    mentorInvitations: true,
    appointmentReminders: true,
    pushNotifications: true,
    emailDigestWeekly: true,
    smsAlerts: true,
  })
  const [privacyOptions, setPrivacyOptions] = useState({
    publicProfile: true,
    showEmailAddress: true,
    showPhoneNumber: true,
    showLocation: true,
    allowMessages: true,
    showOnlineStatus: true,
  })
  const [accountInfo, setAccountInfo] = useState({
    fullName: "Joseph Eshun",
    email: "marcus@careconnect.io",
    phone: "+1 (404) 555-0182",
    location: "Atlanta, GA",
    headline: "ICU Registered Nurse | CCRN | Healthcare Tech Enthusiast",
    description: "ICU RN with 6+ years in critical care. CCRN certified. Passionate about patient-centered care and healthcare technology.",
  })

  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)
  const [coverSrc, setCoverSrc] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const updateNotification = (key: keyof typeof notificationOptions) => {
    setNotificationOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const updatePrivacy = (key: keyof typeof privacyOptions) => {
    setPrivacyOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setAvatarSrc(URL.createObjectURL(file))
  }

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setCoverSrc(URL.createObjectURL(file))
  }

  return (
    <div className="px-7.5 pb-10 pt-4">
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

      <section className="relative mx-auto max-w-250">
        <div className="overflow-hidden rounded-[28px] border border-[#d6d6d6] bg-white shadow-sm">
          <div
            className="relative h-56 bg-linear-to-r from-[#02266e] via-[#003289] to-[#0459E9] bg-cover bg-center"
            style={coverSrc ? { backgroundImage: `url(${coverSrc})` } : undefined}
          >
            <div className="absolute z-10 right-6 top-6">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition bg-[#ffffff31] border rounded-full shadow-sm border-white/80 hover:bg-[#0459E9] cursor-pointer"
              >
                <Camera className="size-5" />
                Change cover
              </button>
            </div>
          </div>

          <div className="relative px-6 pt-6 pb-6 sm:px-8">
            <div className="absolute -top-16 left-6">
              <div className="relative h-28 w-28 rounded-[30px] border-4 border-white bg-white p-2 shadow-xl">
                <div className="h-full w-full overflow-hidden rounded-full flex items-center justify-center bg-[#003289]">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="size-30 text-[#ffffff]" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-2 border-white bg-[#087fff] text-white shadow-md transition hover:bg-[#0665cc] cursor-pointer"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
            </div>

            <div className="mt-10">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-[#151922]">{summary.name}</h1>
                <p className="mt-2 text-sm leading-6 text-black">{summary.headline}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#656f80]">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="text-black size-4" />
                    {summary.location}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Mail className="text-black size-4" />
                    {summary.email}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Phone className="text-black size-4" />
                    {summary.phone}
                  </span>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-3xl border-t-2 border-[#e5ecf5] pt-2">
                <div className="grid grid-cols-2 text-center sm:grid-cols-4">
                  {summary.metrics.map((metric, index) => (
                    <div key={metric.label} className={`${index > 0 ? "border-l border-[#e6eaf0]" : ""} px-4 py-5`}>
                      <p className="mt-3 text-3xl font-semibold text-[#151922]">{metric.value}</p>
                      <p className="text-sm text-black">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-[28px] border border-[#d6d6d6] bg-white shadow-sm max-w-250 mx-auto">
        <div className="border-b border-[#e7ecf1] bg-[#f8fbff] px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition cursor-pointer ${
                  activeTab === tab
                    ? "bg-white text-[#087fff] border-b-4 hover:border-[#087fff]"
                    : "text-[#6b7280] hover:bg-white/80"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-8 sm:px-8">
          {activeTab === "About" && isAgency && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#151922]">Company Overview</h2>
                <p className="max-w-3xl mt-3 text-sm leading-7">
                  {summary.headline || "This organization hasn't added an overview yet."}
                </p>
              </div>
              {specialties.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold">Specialties</h3>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {specialties.map((item) => (
                      <span key={item} className="inline-flex items-center justify-center rounded-full bg-[#eef5ff] px-4 py-2 text-sm text-[#087fff] font-semibold border border-[#087fff]">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold">Contact information</h3>
                <div className="mt-4 space-x-4">
                  {summary.location && (
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="text-black size-4" />
                      {summary.location}
                    </span>
                  )}
                  {summary.email && (
                    <span className="inline-flex items-center gap-2">
                      <Mail className="text-black size-4" />
                      {summary.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "About" && !isAgency && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#151922]">About</h2>
                <p className="max-w-3xl mt-3 text-sm leading-7 ">
                  ICU RN with 6+ years in critical care. CCRN certified. Passionate about patient-centered care and healthcare technology.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold">Contact</h3>
                <div className="mt-4 space-x-4 ">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="text-black size-4" />
                    {profileSummary.location}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Mail className="text-black size-4" />
                    {profileSummary.email}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Phone className="text-black size-4" />
                    {profileSummary.phone}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Posted jobs" && (
            <div className="space-y-4">
              {postedJobs.length === 0 && (
                <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-6 text-center text-sm text-[#657080]">
                  You haven&apos;t posted any jobs yet.
                </p>
              )}
              {postedJobs.map((job) => (
                <div key={job.id} className="rounded-3xl border border-[#e5ecf5] p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-semibold text-[#151922]">{job.title}</h3>
                    <span className="rounded-full bg-[#e9f9f0] px-3 py-1 text-xs font-semibold text-[#0f8a4d]">{job.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#656f80]">
                    <span className="inline-flex items-center gap-2">
                      <Briefcase className="size-4" />
                      {job.type}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="size-4" />
                      {job.location}
                    </span>
                    {job.pay && (
                      <span className="inline-flex items-center gap-2 font-semibold text-[#0f8a4d]">
                        <Banknote className="size-4" />
                        {job.pay}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-[#eef1f3]">
                    <span className="inline-flex items-center gap-2 text-sm text-[#656f80]">
                      <Users className="size-4" />
                      {job.applicants} applicants · {job.postedAgo}
                    </span>
                    <Button variant="outline" className="text-[#087fff]" onClick={() => navigate(Routes.app.agency.jobs)}>
                      View applicants
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Team" && (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#e5ecf5] p-5">
                  <div className="flex items-center gap-4">
                    <div className={`flex size-12 items-center justify-center rounded-full ${member.avatarBg}`}>
                      <UserRound className="text-white size-7" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#151922]">{member.name}</p>
                      <p className="mt-1 text-sm text-[#656f80]">{member.status === "invited" ? "Unknown" : member.role}</p>
                    </div>
                  </div>
                  {member.status === "invited" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-[#087fff] text-[#087fff] hover:bg-[#eef5ff]"
                      onClick={() => withdrawInvite(member.id)}
                    >
                      Withdraw invite
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="rounded-full border-[#087fff] text-[#087fff] hover:bg-[#eef5ff]">
                      Message
                    </Button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTeamInviteOpen(true)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#087fff] cursor-pointer"
              >
                <UserPlus className="size-4" />
                Invite team members
              </button>
            </div>
          )}

          {activeTab === "Experience" && (
            <div className="space-y-6">
              {experience.map((item) => (
                <div key={item.role} className="rounded-3xl border border-[#e5ecf5] p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[#151922]">{item.role}</p>
                      <p className="text-sm text-[#0f4fe3]">{item.company}</p>
                    </div>
                    <span className="text-sm text-[#6b7280]">{item.duration}</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[#505964]">{item.description}</p>
                </div>
              ))}
              <Button className="text-[#087fff] border-0 hover:border-2" variant="outline" onClick={() => setExperienceOpen(true)}>
                + Add experience
              </Button>
            </div>
          )}

          {activeTab === "Skills" && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="inline-flex items-center justify-center rounded-full bg-[#eef5ff] px-4 py-2 text-sm text-[#087fff] font-semibold border border-[#087fff]">
                    {skill}
                  </span>
                ))}
              </div>
              <Button className="text-[#087fff] border-0 hover:border-2" variant="outline" onClick={() => setSkillOpen(true)}>
                + Add skills
              </Button>
            </div>
          )}

          {activeTab === "Certifications" && (
            <div className="space-y-4">
              {certifications.map((cert) => (
                <div key={cert.title} className="flex flex-col gap-3 rounded-3xl border border-[#e5ecf5] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#151922]">{cert.title}</p>
                    <p className="mt-1 text-sm text-[#0f4fe3]">{cert.provider} · {cert.date}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm ${cert.status === "Active" ? "bg-[#e9f9f0] text-[#0f8a4d]" : "bg-[#fff2f0] text-[#d8442a]"}`}>
                    {cert.status}
                  </span>
                </div>
              ))}
              <Button className="text-[#087fff] border-0 hover:border-2" variant="outline" onClick={() => setCertificationOpen(true)}>
                + Add certification
              </Button>
            </div>
          )}

          {activeTab === "Portfolio" && (
            <div className="space-y-6">
              {portfolio.length === 0 ? (
                <div className="rounded-3xl border border-[#e5ecf5] bg-[#f7fafc] p-6">
                  <p className="text-sm text-[#687182]">Portfolio updates will appear here.</p>
                  <p className="mt-4 text-sm leading-7 text-[#505964]">
                    Create posts, highlight work, and share recent achievements so your network can see your best care stories.
                  </p>
                </div>
              ) : (
                portfolio.map((post) => (
                  <PortfolioPost
                    key={post.id}
                    authorName={summary.name}
                    authorRole={isAgency ? "Healthcare Agency" : "Certified Nurse"}
                    avatarClassName="bg-[#6b9cca]"
                    initials="JE"
                    post={post}
                    editable
                    onEdit={() => toast("Editing isn't available in this demo")}
                    onRemove={() => setPortfolio((current) => current.filter((item) => item.id !== post.id))}
                  />
                ))
              )}
              <Button variant="outline">Add portfolio item</Button>
            </div>
          )}
        </div>
      </section>

      <ProfileModals
        notificationsOpen={notificationsOpen}
        onNotificationsOpenChange={setNotificationsOpen}
        privacyOpen={privacyOpen}
        onPrivacyOpenChange={setPrivacyOpen}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        experienceOpen={experienceOpen}
        onExperienceOpenChange={setExperienceOpen}
        skillOpen={skillOpen}
        onSkillOpenChange={setSkillOpen}
        certificationOpen={certificationOpen}
        onCertificationOpenChange={setCertificationOpen}
        notificationOptions={notificationOptions}
        onNotificationOptionChange={updateNotification}
        privacyOptions={privacyOptions}
        onPrivacyOptionChange={updatePrivacy}
        accountInfo={accountInfo}
        onAccountInfoChange={setAccountInfo}
        experience={experience}
        onExperienceChange={setExperience}
        newExperience={newExperience}
        onNewExperienceChange={setNewExperience}
        skills={skills}
        onSkillsChange={setSkills}
        newSkill={newSkill}
        onNewSkillChange={setNewSkill}
        certifications={certifications}
        onCertificationsChange={setCertifications}
        newCertification={newCertification}
        onNewCertificationChange={setNewCertification}
        teamInviteOpen={teamInviteOpen}
        onTeamInviteOpenChange={setTeamInviteOpen}
        teamMembers={teamMembers}
        onTeamMembersChange={setTeamMembers}
        newTeamInvite={newTeamInvite}
        onNewTeamInviteChange={setNewTeamInvite}
      />
    </div>
  )
}
