import { useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { PhoneNumberField } from "@/components/auth/PhoneNumberField"
import { FileDropzone } from "@/components/auth/FileDropzone"
import { PasswordField } from "@/components/auth/PasswordField"
import CustomDatePicker from "@/components/ui/datePicker"
import { Routes } from "@/routes/constants"

type NotificationKey = "jobMatches" | "certificationExpiring" | "newMessages" | "mentorInvitations" | "appointmentReminders" | "pushNotifications" | "emailDigestWeekly" | "smsAlerts"
type PrivacyKey = "publicProfile" | "showEmailAddress" | "showPhoneNumber" | "showLocation" | "allowMessages" | "showOnlineStatus"

type ProfileModalsProps = {
  notificationsOpen: boolean
  onNotificationsOpenChange: (open: boolean) => void
  privacyOpen: boolean
  onPrivacyOpenChange: (open: boolean) => void
  settingsOpen: boolean
  onSettingsOpenChange: (open: boolean) => void
  experienceOpen: boolean
  onExperienceOpenChange: (open: boolean) => void
  skillOpen: boolean
  onSkillOpenChange: (open: boolean) => void
  certificationOpen: boolean
  onCertificationOpenChange: (open: boolean) => void
  notificationOptions: Record<NotificationKey, boolean>
  onNotificationOptionChange: (key: NotificationKey) => void
  privacyOptions: Record<PrivacyKey, boolean>
  onPrivacyOptionChange: (key: PrivacyKey) => void
  accountInfo: {
    fullName: string
    email: string
    phone: string
    location: string
    headline: string
    description: string
  }
  onAccountInfoChange: (value: { fullName: string; email: string; phone: string; location: string; headline: string; description: string }) => void
  experience: Array<{ role: string; company: string; duration: string; description: string }>
  onExperienceChange: (value: Array<{ role: string; company: string; duration: string; description: string }>) => void
  newExperience: { role: string; company: string; duration: string; description: string }
  onNewExperienceChange: (value: { role: string; company: string; duration: string; description: string }) => void
  skills: string[]
  onSkillsChange: (value: string[]) => void
  newSkill: string
  onNewSkillChange: (value: string) => void
  certifications: Array<{ title: string; provider: string; date: string; status: string }>
  onCertificationsChange: (value: Array<{ title: string; provider: string; date: string; status: string }>) => void
  newCertification: { title: string; provider: string; date: string; file: string }
  onNewCertificationChange: (value: { title: string; provider: string; date: string; file: string }) => void
  teamInviteOpen?: boolean
  onTeamInviteOpenChange?: (open: boolean) => void
  teamMembers?: Array<{ id: string; name: string; role: string; status: "active" | "invited"; avatarBg: string }>
  onTeamMembersChange?: (value: Array<{ id: string; name: string; role: string; status: "active" | "invited"; avatarBg: string }>) => void
  newTeamInvite?: { phone: string; email: string; fullName: string }
  onNewTeamInviteChange?: (value: { phone: string; email: string; fullName: string }) => void
}

function parseDurationDate(value: string) {
  if (!value || value === "Present") return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const accountTabs = ["Account info", "Password", "Danger zone"] as const

type AccountTab = (typeof accountTabs)[number]

export function ProfileModals({
  notificationsOpen,
  onNotificationsOpenChange,
  privacyOpen,
  onPrivacyOpenChange,
  settingsOpen,
  onSettingsOpenChange,
  experienceOpen,
  onExperienceOpenChange,
  skillOpen,
  onSkillOpenChange,
  certificationOpen,
  onCertificationOpenChange,
  notificationOptions,
  onNotificationOptionChange,
  privacyOptions,
  onPrivacyOptionChange,
  accountInfo,
  onAccountInfoChange,
  experience,
  onExperienceChange,
  newExperience,
  onNewExperienceChange,
  skills,
  onSkillsChange,
  newSkill,
  onNewSkillChange,
  certifications,
  onCertificationsChange,
  newCertification,
  onNewCertificationChange,
  teamInviteOpen = false,
  onTeamInviteOpenChange = () => {},
  teamMembers = [],
  onTeamMembersChange = () => {},
  newTeamInvite = { phone: "", email: "", fullName: "" },
  onNewTeamInviteChange = () => {},
}: ProfileModalsProps) {
  const [accountTab, setAccountTab] = useState<AccountTab>("Account info")
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" })
  const [certificateFile, setCertificateFile] = useState<File | null>(null)

  const handlePasswordChange = (field: "current" | "next" | "confirm", value: string) => {
    setPasswords((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <Dialog open={notificationsOpen} onOpenChange={onNotificationsOpenChange}>
        <DialogContent showCloseButton className="p-0 max-w-150">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">Notification Preferences</DialogTitle>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-6">
            {[
              {
                title: "Career & jobs",
                options: [
                  { label: "Job matches", key: "jobMatches" as NotificationKey },
                  { label: "Certification expiring", key: "certificationExpiring" as NotificationKey },
                ],
              },
              {
                title: "Communication",
                options: [
                  { label: "New messages", key: "newMessages" as NotificationKey },
                  { label: "Mentor invitations", key: "mentorInvitations" as NotificationKey },
                ],
              },
              {
                title: "Health & appointments",
                options: [{ label: "Appointment reminders", key: "appointmentReminders" as NotificationKey }],
              },
              {
                title: "Delivery methods",
                options: [
                  { label: "Push notifications", key: "pushNotifications" as NotificationKey },
                  { label: "Email digest (weekly)", key: "emailDigestWeekly" as NotificationKey },
                  { label: "SMS alerts", key: "smsAlerts" as NotificationKey },
                ],
              },
            ].map((group) => (
              <div key={group.title} className="space-y-3">
                <p className="text-sm font-semibold text-[#151922]">{group.title}</p>
                <div className="space-y-2 rounded-[20px] border border-[#e8edf2] bg-white p-3">
                  {group.options.map((option) => (
                    <div key={option.key} className="flex items-center justify-between rounded-xl border border-[#f1f5f9] bg-[#fbfdff] px-4 py-3">
                      <span className="text-sm text-[#4f596c]">{option.label}</span>
                      <Switch checked={Boolean(notificationOptions[option.key])} onCheckedChange={() => onNotificationOptionChange(option.key)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </DialogBody>
          <DialogFooter>
            <Button className="bg-[#087fff] text-white hover:opacity-90" variant="secondary" onClick={() => onNotificationsOpenChange(false)}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={privacyOpen} onOpenChange={onPrivacyOpenChange}>
        <DialogContent showCloseButton className="p-0 max-w-130">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">Privacy policy</DialogTitle>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-6">
            {[
              { label: "Public profile", description: "Anyone can view your profile", key: "publicProfile" as PrivacyKey },
              { label: "Show email address", description: "Display email on your profile", key: "showEmailAddress" as PrivacyKey },
              { label: "Show phone number", description: "Display phone on your profile", key: "showPhoneNumber" as PrivacyKey },
              { label: "Show location", description: "Display your city and state", key: "showLocation" as PrivacyKey },
              { label: "Allow messages", description: "Let non-connections message you", key: "allowMessages" as PrivacyKey },
              { label: "Show online status", description: "Let others see when you're active", key: "showOnlineStatus" as PrivacyKey },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-3xl border border-[#eaf0ff] bg-[#f8fbff] px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-[#151922]">{item.label}</p>
                  <p className="mt-1 text-sm text-[#656f80]">{item.description}</p>
                </div>
                <Switch checked={Boolean(privacyOptions[item.key])} onCheckedChange={() => onPrivacyOptionChange(item.key)} />
              </div>
            ))}
          </DialogBody>
          <DialogFooter>
            <Button className="bg-[#087fff] text-white hover:opacity-90" variant="secondary" onClick={() => onPrivacyOpenChange(false)}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={onSettingsOpenChange}>
        <DialogContent showCloseButton className="p-0 max-w-130">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">Account settings</DialogTitle>
            <div className="flex flex-wrap gap-2 mt-4">
              {accountTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAccountTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${accountTab === tab ? "bg-[#eef4ff] text-[#0f4fe3]" : "text-[#6b7280] hover:bg-[#f5f8ff]"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-6">
            {accountTab === "Account info" && (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Full name</label>
                  <Input value={accountInfo.fullName} onChange={(event) => onAccountInfoChange({ ...accountInfo, fullName: event.target.value })} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Email address</label>
                  <Input value={accountInfo.email} onChange={(event) => onAccountInfoChange({ ...accountInfo, email: event.target.value })} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Phone number</label>
                  <PhoneNumberField value={accountInfo.phone} onChange={(value) => onAccountInfoChange({ ...accountInfo, phone: value })} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Location</label>
                  <Input value={accountInfo.location} onChange={(event) => onAccountInfoChange({ ...accountInfo, location: event.target.value })} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Professional headline</label>
                  <Input value={accountInfo.headline} onChange={(event) => onAccountInfoChange({ ...accountInfo, headline: event.target.value })} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Job description</label>
                  <Textarea value={accountInfo.description} onChange={(event) => onAccountInfoChange({ ...accountInfo, description: event.target.value })} className="min-h-30" />
                </div>
              </div>
            )}

            {accountTab === "Password" && (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Current password</label>
                  <PasswordField value={passwords.current} onChange={(event) => handlePasswordChange("current", event.target.value)} placeholder="Enter current password" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">New password</label>
                  <PasswordField value={passwords.next} onChange={(event) => handlePasswordChange("next", event.target.value)} placeholder="Enter new password" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#151922]">Confirm password</label>
                  <PasswordField value={passwords.confirm} onChange={(event) => handlePasswordChange("confirm", event.target.value)} placeholder="Confirm new password" />
                </div>
              </div>
            )}

            {accountTab === "Danger zone" && (
              <div className="space-y-4">
                <div className="rounded-3xl border border-[#fde3e1] bg-[#fff1f0] p-5">
                  <p className="text-sm font-semibold text-[#d8442a]">Deactivate Account</p>
                  <p className="mt-2 text-sm text-[#665555]">Temporarily hide your profile. You can reactivate at any time.</p>
                  <Button variant="outline" className="mt-4 w-full border-[#d8442a] text-[#d8442a] hover:bg-[#fde3e1]">
                    Deactivate account
                  </Button>
                </div>
                <div className="rounded-3xl border border-[#ffe1de] bg-[#fff4f2] p-5">
                  <p className="text-sm font-semibold text-[#c92815]">Delete Account</p>
                  <p className="mt-2 text-sm text-[#665555]">Permanently delete your account and all data. This cannot be undone.</p>
                  <Button className="mt-4 w-full bg-[#d8442a] text-white hover:opacity-90">
                    Delete account permanently
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            {accountTab !== "Danger zone" ? (
              <Button className="bg-[#087fff] text-white hover:opacity-90" onClick={() => onSettingsOpenChange(false)}>Save changes</Button>
            ) : (
              <Button className="bg-[#868686] text-white hover:opacity-90" variant="secondary" onClick={() => onSettingsOpenChange(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={experienceOpen} onOpenChange={onExperienceOpenChange}>
        <DialogContent showCloseButton className="p-0 max-w-140">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">Add experience</DialogTitle>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Job title</label>
              <Input
                value={newExperience.role}
                onChange={(event) => onNewExperienceChange({ ...newExperience, role: event.target.value })}
                placeholder="Enter job title here, eg: HHA Registered care giver"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Job description</label>
              <Textarea
                value={newExperience.description}
                onChange={(event) => onNewExperienceChange({ ...newExperience, description: event.target.value })}
                placeholder="Describe the role of the applicant here"
                className="min-h-30 border border-[#d6e6f2] text-[#151922]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#151922]">Start date</label>
                <CustomDatePicker
                  date={parseDurationDate(newExperience.duration.split(" – ")[0])}
                  setDate={(value) => onNewExperienceChange({ ...newExperience, duration: `${value ? format(value, "yyyy-MM-dd") : ""} – ${newExperience.duration.split(" – ")[1] || "Present"}` })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#151922]">End date</label>
                <CustomDatePicker
                  date={parseDurationDate(newExperience.duration.split(" – ")[1])}
                  setDate={(value) => onNewExperienceChange({ ...newExperience, duration: `${newExperience.duration.split(" – ")[0] || ""} – ${value ? format(value, "yyyy-MM-dd") : "Present"}` })}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              className="bg-[#087fff] text-white hover:opacity-90"
              onClick={() => {
                if (newExperience.role) {
                  onExperienceChange([...experience, { ...newExperience, company: "New employer", duration: newExperience.duration || "Apr 2026 – Present" }])
                  onNewExperienceChange({ role: "", company: "", duration: "", description: "" })
                  onExperienceOpenChange(false)
                }
              }}
            >
              Update experience
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={skillOpen} onOpenChange={onSkillOpenChange}>
        <DialogContent showCloseButton className="p-0 max-w-130">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">Add skill</DialogTitle>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Enter skill</label>
              <Input value={newSkill} onChange={(event) => onNewSkillChange(event.target.value)} placeholder="Enter skill here, eg: HHA Registered care giver" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              className="bg-[#087fff] text-white hover:opacity-90"
              onClick={() => {
                if (newSkill.trim()) {
                  onSkillsChange([...skills, newSkill.trim()])
                  onNewSkillChange("")
                  onSkillOpenChange(false)
                }
              }}
            >
              Update skills
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={certificationOpen} onOpenChange={onCertificationOpenChange}>
        <DialogContent showCloseButton className="p-0 max-w-155">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">Add certification</DialogTitle>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Enter certificate title</label>
              <Input value={newCertification.title} onChange={(event) => onNewCertificationChange({ ...newCertification, title: event.target.value })} placeholder="Enter your certificate title here" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#151922]">Start date</label>
                <CustomDatePicker
                  date={parseDurationDate(newCertification.date)}
                  setDate={(value) => onNewCertificationChange({ ...newCertification, date: value ? format(value, "yyyy-MM-dd") : "" })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#151922]">End date</label>
                <Input value="Present" disabled />
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-[#151922]">Upload your certificate here</p>
              <FileDropzone file={certificateFile} onFileChange={setCertificateFile} accept=".pdf,.png,.jpg,.jpeg" hint="PDF, PNG, or JPEG (Max. 50 MB)" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              className="bg-[#087fff] text-white hover:opacity-90"
              onClick={() => {
                if (newCertification.title.trim()) {
                  onCertificationsChange([
                    ...certifications,
                    {
                      title: newCertification.title,
                      provider: newCertification.provider || "Unknown provider",
                      date: newCertification.date || "Expires Dec 2026",
                      status: "Active",
                    },
                  ])
                  onNewCertificationChange({ title: "", provider: "", date: "", file: "" })
                  setCertificateFile(null)
                  onCertificationOpenChange(false)
                }
              }}
            >
              Update certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={teamInviteOpen} onOpenChange={onTeamInviteOpenChange}>
        <DialogContent showCloseButton className="p-0 max-w-130">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">Team invitation</DialogTitle>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Phone number</label>
              <PhoneNumberField value={newTeamInvite.phone} onChange={(value) => onNewTeamInviteChange({ ...newTeamInvite, phone: value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Email</label>
              <Input
                value={newTeamInvite.email}
                onChange={(event) => onNewTeamInviteChange({ ...newTeamInvite, email: event.target.value })}
                placeholder="Enter your email  here"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Full name</label>
              <Input
                value={newTeamInvite.fullName}
                onChange={(event) => onNewTeamInviteChange({ ...newTeamInvite, fullName: event.target.value })}
                placeholder="Enter your full name here"
              />
            </div>
            <Button
              className="w-full bg-[#087fff] text-white hover:opacity-90"
              onClick={() => {
                if (newTeamInvite.fullName.trim()) {
                  onTeamMembersChange([
                    ...teamMembers,
                    {
                      id: `tm-${Date.now()}`,
                      name: newTeamInvite.fullName.trim(),
                      role: "Unknown",
                      status: "invited",
                      avatarBg: "bg-[#8a94a6]",
                    },
                  ])

                  const inviteUrl = new URL(Routes.auth.professionalInvite, window.location.origin)
                  inviteUrl.searchParams.set("name", newTeamInvite.fullName.trim())
                  if (newTeamInvite.email.trim()) inviteUrl.searchParams.set("email", newTeamInvite.email.trim())
                  navigator.clipboard?.writeText(inviteUrl.toString()).catch(() => undefined)
                  toast.success("Invite link copied — send it to the new team member to set up their dashboard.")

                  onNewTeamInviteChange({ phone: "", email: "", fullName: "" })
                  onTeamInviteOpenChange(false)
                }
              }}
            >
              Send invitation
            </Button>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}
