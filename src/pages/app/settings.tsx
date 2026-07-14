import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useCareFlow } from "@/components/app/useCareFlow"
import { ProfileModals } from "@/components/profile/ProfileModals"

const settings = ["Account information", "Notification preferences", "Privacy and security"]

export default function SettingsPage() {
  const { flow } = useCareFlow()
  const isAgency = flow === "agency"
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

  const updateNotification = (key: "jobMatches" | "certificationExpiring" | "newMessages" | "mentorInvitations" | "appointmentReminders" | "pushNotifications" | "emailDigestWeekly" | "smsAlerts") => {
    setNotificationOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const updatePrivacy = (key: "publicProfile" | "showEmailAddress" | "showPhoneNumber" | "showLocation" | "allowMessages" | "showOnlineStatus") => {
    setPrivacyOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="px-7.5 pb-10 pt-4">
      <section className="rounded-[28px] border border-[#d6d6d6] bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="mt-2 text-sm text-[#565656]">
              {isAgency ? "Manage your agency workspace preferences." : "Manage your CareConnect preferences."}
            </p>
          </div>
          <Button className="h-11 bg-[#087fff] px-6">Save changes</Button>
        </div>

        <div className="space-y-3 mt-7">
          {settings.map((item) => {
            const action =
              item === "Notification preferences"
                ? () => setNotificationsOpen(true)
                : item === "Privacy and security"
                  ? () => setPrivacyOpen(true)
                  : () => setSettingsOpen(true)

            return (
              <button
                key={item}
                type="button"
                onClick={action}
                className="flex w-full items-center justify-between rounded-xl border border-[#d6d6d6] bg-white px-4 py-4 text-left text-sm font-semibold"
              >
                {item}
                <span className="text-[#087fff]">Open</span>
              </button>
            )
          })}
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
      />
    </div>
  )
}
