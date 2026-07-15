import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { Bell, ChevronDown, ChevronRight, LogOut, Settings, UserRound } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Routes } from "@/routes/constants"
import { useAuth } from "@/utils/auth"
import { ProfileModals } from "@/components/profile/ProfileModals"
import type { CareFlow } from "./useCareFlow"

type AccountControlsProps = {
  flow?: CareFlow
  notificationSize?: "md" | "lg"
}

export function AccountControls({ flow = "user", notificationSize = "md" }: AccountControlsProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [experienceOpen, setExperienceOpen] = useState(false)
  const [skillOpen, setSkillOpen] = useState(false)
  const [certificationOpen, setCertificationOpen] = useState(false)
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
  const [experience, setExperience] = useState([{ role: "ICU Registered Nurse", company: "MedFirst Agency", duration: "Jan 2020 – Present", description: "Critical care nursing in a 24-bed ICU." }])
  const [skills, setSkills] = useState(["Critical Care", "IV Therapy"])
  const [certifications, setCertifications] = useState([{ title: "CCRN — Critical Care Registered Nurse", provider: "AACN", date: "Expires Dec 2025", status: "Active" }])
  const [newSkill, setNewSkill] = useState("")
  const [newExperience, setNewExperience] = useState({ role: "", company: "", duration: "", description: "" })
  const [newCertification, setNewCertification] = useState({ title: "", provider: "", date: "", file: "" })
  const profilePath = flow === "agency" ? Routes.app.agency.profile : Routes.app.user.profile
  const notificationButtonSize = notificationSize === "lg" ? "size-11" : "size-10"

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate(Routes.auth.login, { replace: true })
    }
  }

  const updateNotification = (key: "jobMatches" | "certificationExpiring" | "newMessages" | "mentorInvitations" | "appointmentReminders" | "pushNotifications" | "emailDigestWeekly" | "smsAlerts") => {
    setNotificationOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const updatePrivacy = (key: "publicProfile" | "showEmailAddress" | "showPhoneNumber" | "showLocation" | "allowMessages" | "showOnlineStatus") => {
    setPrivacyOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex w-fit items-center rounded-full border-[3px] border-[#e8edef] bg-[#f7fafb]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Notifications"
            className={`relative flex ${notificationButtonSize} items-center justify-center rounded-full bg-white text-[#151922] outline-none transition hover:bg-[#f2f6f8] cursor-pointer`}
          >
            <Bell className="size-4.5 fill-[#151922]" />
            <span className="absolute right-3 top-2 size-2 rounded-full bg-[#ed2f20]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl border-[#dce2e6] bg-white p-3">
          <DropdownMenuLabel className="px-1 text-sm font-semibold">Notifications</DropdownMenuLabel>
          <div className="px-1 py-5 text-center text-sm text-[#737780]">No notifications</div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Link
        to={profilePath}
        aria-label="Profile image"
        className="ml-1 flex size-9 items-center justify-center rounded-full bg-[#d6e6f2] transition hover:ring-2 hover:ring-[#087fff]/30"
      >
        <UserRound className="size-5 rounded-full text-[#6b9cca]" />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-6 items-center gap-3 rounded-full pl-2 pr-3 outline-none transition hover:bg-[#edf3f5] cursor-pointer"
          >
            <span className="hidden text-sm font-medium sm:inline">Joseph Eshun</span>
            <ChevronDown className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-2xl border-[#dce2e6] bg-white p-0 overflow-hidden shadow-lg">
          <div className="bg-[#f7fafb] px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d6e6f2] text-[#087fff]">
                <UserRound className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Joseph Eshun</p>
                <p className="truncate text-xs text-[#656f80]">Registered nurse</p>
              </div>
            </div>
          </div>
          <div className="px-1 py-1 space-y-1">
            <DropdownMenuItem asChild className="rounded-lg hover:bg-[#edf3f5] cursor-pointer">
              <Link to={profilePath} className="flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-xl">
                <span className="flex items-center gap-2">
                  <UserRound className="size-4 text-[#087fff]" />
                  View profile
                </span>
                <ChevronRight className="size-4 text-[#8b97a8]" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg hover:bg-[#edf3f5]">
              <button type="button" onClick={() => setSettingsOpen(true)} className="flex items-center justify-between w-full gap-2 px-3 py-2 text-sm text-left rounded-xl">
                <span className="flex items-center gap-2">
                  <Settings className="size-4 text-[#087fff]" />
                  Account settings
                </span>
                <ChevronRight className="size-4 text-[#8b97a8]" />
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg hover:bg-[#edf3f5]">
              <button type="button" onClick={() => setPrivacyOpen(true)} className="flex items-center justify-between w-full gap-2 px-3 py-2 text-sm text-left rounded-xl">
                <span className="flex items-center gap-2">
                  <Settings className="size-4 text-[#087fff]" />
                  Privacy & security
                </span>
                <ChevronRight className="size-4 text-[#8b97a8]" />
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg hover:bg-[#edf3f5]">
              <button type="button" onClick={() => setNotificationsOpen(true)} className="flex items-center justify-between w-full gap-2 px-3 py-2 text-sm text-left rounded-xl">
                <span className="flex items-center gap-2">
                  <Bell className="size-4 text-[#087fff]" />
                  Notification preference
                </span>
                <ChevronRight className="size-4 text-[#8b97a8]" />
              </button>
            </DropdownMenuItem>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout} variant="destructive" className="rounded-lg mx-2 hover:bg-[#ff313157] mb-2">
            <div className="flex items-center gap-2 px-3 py-2 text-sm">
              <LogOut className="size-4" />
              Sign out
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
      />
    </div>
  )
}
