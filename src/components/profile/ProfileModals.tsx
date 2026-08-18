import { useEffect, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { getAuthErrorMessage } from "@/utils/auth"
import { clearRecaptchaVerifier } from "@/utils/auth/services/mfaService"
import {
  reauthenticate,
  sendReauthOtp,
  completeReauthOtp,
  changePassword,
} from "@/utils/auth/services/passwordService"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { PhoneNumberField } from "@/components/auth/PhoneNumberField"
import { FileDropzone } from "@/components/auth/FileDropzone"
import { PasswordField } from "@/components/auth/PasswordField"
import CustomDatePicker from "@/components/ui/datePicker"
import { TeamInviteDialog } from "@/components/profile/TeamInviteDialog"
import { certificationStatus } from "@/components/profile/certifications"
import { Trash2 } from "lucide-react"
import type { BulkInviteMemberInput, BulkInviteResult } from "@/utils/careconnect/services/teamService"
import type { ProfileCertification } from "@/utils/careconnect/types"

/**
 * Every key here is enforced server-side (see schemas/notification.schema.js): the topic
 * switches gate whole NotificationCategory groups in `createNotification`, the delivery
 * switches gate the channels. "SMS alerts" and "Email digest (weekly)" used to appear here
 * and were dropped — there is no SMS path and no digest job for them to control.
 */
type NotificationKey =
  | "emailNotifications"
  | "inAppNotifications"
  | "pushNotifications"
  | "jobMatches"
  | "certificationExpiring"
  | "newMessages"
  | "mentorInvitations"
  | "appointmentReminders"
/**
 * Only settings the API enforces. `showEmailAddress` / `showPhoneNumber` were dropped —
 * the public profile response returns neither field, so there was nothing to hide — as was
 * `showOnlineStatus`, since nothing tracks presence.
 */
type PrivacyKey = "publicProfile" | "showLocation" | "allowMessages"

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
  onSaveAccountInfo?: () => Promise<void> | void
  onSaveNotifications?: () => Promise<void> | void
  onSavePrivacy?: () => Promise<void> | void
  onDeactivate?: () => Promise<void> | void
  onDelete?: () => Promise<void> | void
  experience: Array<{ role: string; company: string; duration: string; description: string }>
  onExperienceChange: (value: Array<{ role: string; company: string; duration: string; description: string }>) => void
  newExperience: { role: string; company: string; duration: string; description: string }
  onNewExperienceChange: (value: { role: string; company: string; duration: string; description: string }) => void
  skills: string[]
  onSkillsChange: (value: string[]) => void
  newSkill: string
  onNewSkillChange: (value: string) => void
  specialtyOpen?: boolean
  onSpecialtyOpenChange?: (open: boolean) => void
  specialties?: string[]
  onSpecialtiesChange?: (value: string[]) => void
  newSpecialty?: string
  onNewSpecialtyChange?: (value: string) => void
  certifications: ProfileCertification[]
  onCertificationsChange: (value: ProfileCertification[]) => void
  newCertification: { title: string; provider: string; date: string; endDate: string; file: string }
  onNewCertificationChange: (value: { title: string; provider: string; date: string; endDate: string; file: string }) => void
  /** Index into `certifications` being edited, or null when adding a new one. */
  editingCertificationIndex?: number | null
  onEditingCertificationIndexChange?: (index: number | null) => void
  teamInviteOpen?: boolean
  onTeamInviteOpenChange?: (open: boolean) => void
  newTeamInvite?: { phone: string; email: string; fullName: string }
  onNewTeamInviteChange?: (value: { phone: string; email: string; fullName: string }) => void
  onInviteTeamMember?: (input: { fullName: string; email: string; phone: string }) => Promise<void> | void
  /** Spreadsheet import. Resolves with the per-row outcome, or undefined if the request failed. */
  onBulkInviteTeamMembers?: (members: BulkInviteMemberInput[]) => Promise<BulkInviteResult | undefined>
}

function parseDurationDate(value: string) {
  if (!value || value === "Present") return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Certifications and job end dates run into the future, unlike a date of birth. */
const FUTURE_MONTH_LIMIT = new Date(new Date().getFullYear() + 30, 11)

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
  onSaveAccountInfo = async () => {},
  onSaveNotifications = async () => {},
  onSavePrivacy = async () => {},
  onDeactivate = async () => {},
  onDelete = async () => {},
  experience,
  onExperienceChange,
  newExperience,
  onNewExperienceChange,
  skills,
  onSkillsChange,
  newSkill,
  onNewSkillChange,
  specialtyOpen = false,
  onSpecialtyOpenChange = () => {},
  specialties = [],
  onSpecialtiesChange = () => {},
  newSpecialty = "",
  onNewSpecialtyChange = () => {},
  certifications,
  onCertificationsChange,
  newCertification,
  onNewCertificationChange,
  editingCertificationIndex = null,
  onEditingCertificationIndexChange = () => {},
  teamInviteOpen = false,
  onTeamInviteOpenChange = () => {},
  newTeamInvite = { phone: "", email: "", fullName: "" },
  onNewTeamInviteChange = () => {},
  onInviteTeamMember = async () => {},
  onBulkInviteTeamMembers,
}: ProfileModalsProps) {
  const [accountTab, setAccountTab] = useState<AccountTab>("Account info")
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" })
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [savingAccount, setSavingAccount] = useState(false)

  // Skills are edited against a local draft so renames and removals aren't
  // persisted keystroke-by-keystroke — onSkillsChange writes to the backend.
  const [skillDraft, setSkillDraft] = useState<string[]>(skills)

  useEffect(() => {
    if (skillOpen) setSkillDraft(skills)
    // Re-seeding while open would discard in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillOpen])

  const addDraftSkill = () => {
    const skill = newSkill.trim()
    if (!skill) return
    setSkillDraft((current) => [...current, skill])
    onNewSkillChange("")
  }

  const saveSkills = () => {
    const pending = newSkill.trim()
    const next = [...skillDraft, ...(pending ? [pending] : [])]
      .map((skill) => skill.trim())
      .filter(Boolean)
    onSkillsChange(Array.from(new Set(next)))
    onNewSkillChange("")
    onSkillOpenChange(false)
  }

  // Specialties follow the same local-draft pattern as skills.
  const [specialtyDraft, setSpecialtyDraft] = useState<string[]>(specialties)

  useEffect(() => {
    if (specialtyOpen) setSpecialtyDraft(specialties)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialtyOpen])

  const addDraftSpecialty = () => {
    const specialty = newSpecialty.trim()
    if (!specialty) return
    setSpecialtyDraft((current) => [...current, specialty])
    onNewSpecialtyChange("")
  }

  const saveSpecialties = () => {
    const pending = newSpecialty.trim()
    const next = [...specialtyDraft, ...(pending ? [pending] : [])]
      .map((specialty) => specialty.trim())
      .filter(Boolean)
    onSpecialtiesChange(Array.from(new Set(next)))
    onNewSpecialtyChange("")
    onSpecialtyOpenChange(false)
  }

  // In-app password change (MFA re-auth). Step "form" collects passwords; if the
  // account has MFA, we send an SMS and move to step "otp" to confirm.
  const [pwStep, setPwStep] = useState<"form" | "otp">("form")
  const [pwBusy, setPwBusy] = useState(false)
  const [smsCode, setSmsCode] = useState("")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reauth, setReauth] = useState<{ resolver: any; verificationId: string } | null>(null)

  const RECAPTCHA_ID = "profile-reauth-recaptcha"

  const handlePasswordChange = (field: "current" | "next" | "confirm", value: string) => {
    setPasswords((prev) => ({ ...prev, [field]: value }))
  }

  const resetPasswordFlow = () => {
    setPasswords({ current: "", next: "", confirm: "" })
    setPwStep("form")
    setSmsCode("")
    setReauth(null)
    clearRecaptchaVerifier()
  }

  const submitPassword = async () => {
    if (passwords.next.length < 6) {
      toast.error("New password must be at least 6 characters")
      return
    }
    if (passwords.next !== passwords.confirm) {
      toast.error("Passwords do not match")
      return
    }
    setPwBusy(true)
    try {
      const result = await reauthenticate(passwords.current)
      if (result.status === "done") {
        await changePassword(passwords.next)
        toast.success("Password updated")
        resetPasswordFlow()
        onSettingsOpenChange(false)
        return
      }
      // MFA required — send the SMS and switch to the code step.
      const verificationId = await sendReauthOtp(result.resolver, RECAPTCHA_ID)
      setReauth({ resolver: result.resolver, verificationId })
      setPwStep("otp")
      toast.success("We sent a code to your phone")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setPwBusy(false)
    }
  }

  const submitPasswordOtp = async () => {
    if (!reauth) return
    setPwBusy(true)
    try {
      await completeReauthOtp(reauth.resolver, reauth.verificationId, smsCode.trim())
      await changePassword(passwords.next)
      toast.success("Password updated")
      resetPasswordFlow()
      onSettingsOpenChange(false)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setPwBusy(false)
    }
  }

  const [savingNotifications, setSavingNotifications] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)

  const saveNotifications = async () => {
    setSavingNotifications(true)
    try {
      await onSaveNotifications()
      onNotificationsOpenChange(false)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSavingNotifications(false)
    }
  }

  const savePrivacy = async () => {
    setSavingPrivacy(true)
    try {
      await onSavePrivacy()
      onPrivacyOpenChange(false)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSavingPrivacy(false)
    }
  }

  const saveAccount = async () => {
    setSavingAccount(true)
    try {
      await onSaveAccountInfo()
      onSettingsOpenChange(false)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSavingAccount(false)
    }
  }

  const confirmDeactivate = async () => {
    if (!window.confirm("Deactivate your account? Your profile will be hidden until you sign back in.")) return
    try {
      await onDeactivate()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    }
  }

  const confirmDelete = async () => {
    if (!window.confirm("Permanently delete your account and profile? This cannot be undone.")) return
    try {
      await onDelete()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    }
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
                  { label: "In-app notifications", key: "inAppNotifications" as NotificationKey },
                  { label: "Email notifications", key: "emailNotifications" as NotificationKey },
                  { label: "Push notifications (mobile app)", key: "pushNotifications" as NotificationKey },
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
            <Button
              className="bg-[#00b4b8] text-white hover:opacity-90"
              variant="secondary"
              disabled={savingNotifications}
              onClick={saveNotifications}
            >
              {savingNotifications ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={privacyOpen} onOpenChange={onPrivacyOpenChange}>
        <DialogContent showCloseButton className="p-0 max-w-130">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">Privacy &amp; security</DialogTitle>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-6">
            {[
              { label: "Public profile", description: "Let other members find and view your profile", key: "publicProfile" as PrivacyKey },
              { label: "Show location", description: "Display your city and state to other members", key: "showLocation" as PrivacyKey },
              { label: "Allow messages", description: "Let people start a new conversation with you", key: "allowMessages" as PrivacyKey },
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
            <Button
              className="bg-[#00b4b8] text-white hover:opacity-90"
              variant="secondary"
              disabled={savingPrivacy}
              onClick={savePrivacy}
            >
              {savingPrivacy ? "Saving…" : "Save changes"}
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
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${accountTab === tab ? "bg-[#e3f8f8] text-[#00898c]" : "text-[#6b7280] hover:bg-[#eafbfb]"}`}
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
                {pwStep === "form" ? (
                  <>
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
                  </>
                ) : (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#151922]">Verification code</label>
                    <p className="mb-3 text-sm text-[#656f80]">Enter the 6-digit code we texted to your phone to confirm the change.</p>
                    <Input value={smsCode} onChange={(event) => setSmsCode(event.target.value)} inputMode="numeric" placeholder="123456" />
                  </div>
                )}
                {/* Invisible reCAPTCHA target required by Firebase phone verification. */}
                <div id={RECAPTCHA_ID} />
              </div>
            )}

            {accountTab === "Danger zone" && (
              <div className="space-y-4">
                <div className="rounded-3xl border border-[#fde3e1] bg-[#fff1f0] p-5">
                  <p className="text-sm font-semibold text-[#d8442a]">Deactivate Account</p>
                  <p className="mt-2 text-sm text-[#665555]">Temporarily hide your profile. You can reactivate at any time.</p>
                  <Button variant="outline" className="mt-4 w-full border-[#d8442a] text-[#d8442a] hover:bg-[#fde3e1]" onClick={confirmDeactivate}>
                    Deactivate account
                  </Button>
                </div>
                <div className="rounded-3xl border border-[#ffe1de] bg-[#fff4f2] p-5">
                  <p className="text-sm font-semibold text-[#c92815]">Delete Account</p>
                  <p className="mt-2 text-sm text-[#665555]">Permanently delete your account and all data. This cannot be undone.</p>
                  <Button className="mt-4 w-full bg-[#d8442a] text-white hover:opacity-90" onClick={confirmDelete}>
                    Delete account permanently
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            {accountTab === "Account info" && (
              <Button className="bg-[#00b4b8] text-white hover:opacity-90" disabled={savingAccount} onClick={saveAccount}>
                {savingAccount ? "Saving…" : "Save changes"}
              </Button>
            )}
            {accountTab === "Password" && (
              <Button
                className="bg-[#00b4b8] text-white hover:opacity-90"
                disabled={pwBusy}
                onClick={pwStep === "form" ? submitPassword : submitPasswordOtp}
              >
                {pwBusy ? "Working…" : pwStep === "form" ? "Update password" : "Confirm code"}
              </Button>
            )}
            {accountTab === "Danger zone" && (
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
                className="min-h-30 border border-[#d3f2f2] text-[#151922]"
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
                  endMonth={FUTURE_MONTH_LIMIT}
                  date={parseDurationDate(newExperience.duration.split(" – ")[1])}
                  setDate={(value) => onNewExperienceChange({ ...newExperience, duration: `${newExperience.duration.split(" – ")[0] || ""} – ${value ? format(value, "yyyy-MM-dd") : "Present"}` })}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              className="bg-[#00b4b8] text-white hover:opacity-90"
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
            <DialogTitle className="text-xl font-semibold text-[#151922]">Edit skills</DialogTitle>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-5">
            {skillDraft.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#151922]">Your skills</label>
                {skillDraft.map((skill, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={skill}
                      onChange={(event) =>
                        setSkillDraft((current) => current.map((item, i) => (i === index ? event.target.value : item)))
                      }
                      placeholder="Skill name"
                    />
                    <button
                      type="button"
                      onClick={() => setSkillDraft((current) => current.filter((_, i) => i !== index))}
                      aria-label={`Remove ${skill || "skill"}`}
                      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] text-[#d8442a] transition hover:bg-[#fff1f0]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Add a skill</label>
              <div className="flex items-center gap-2">
                <Input
                  value={newSkill}
                  onChange={(event) => onNewSkillChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      addDraftSkill()
                    }
                  }}
                  placeholder="Enter skill here, eg: HHA Registered care giver"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]"
                  onClick={addDraftSkill}
                >
                  Add
                </Button>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button className="bg-[#00b4b8] text-white hover:opacity-90" onClick={saveSkills}>
              Save skills
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={specialtyOpen} onOpenChange={onSpecialtyOpenChange}>
        <DialogContent showCloseButton className="p-0 max-w-130">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">Edit specialties</DialogTitle>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-5">
            {specialtyDraft.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#151922]">Your specialties</label>
                {specialtyDraft.map((specialty, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={specialty}
                      onChange={(event) =>
                        setSpecialtyDraft((current) => current.map((item, i) => (i === index ? event.target.value : item)))
                      }
                      placeholder="Specialty name"
                    />
                    <button
                      type="button"
                      onClick={() => setSpecialtyDraft((current) => current.filter((_, i) => i !== index))}
                      aria-label={`Remove ${specialty || "specialty"}`}
                      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#e8edf2] text-[#d8442a] transition hover:bg-[#fff1f0]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Add a specialty</label>
              <div className="flex items-center gap-2">
                <Input
                  value={newSpecialty}
                  onChange={(event) => onNewSpecialtyChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      addDraftSpecialty()
                    }
                  }}
                  placeholder="Enter specialty here, eg: Palliative care"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]"
                  onClick={addDraftSpecialty}
                >
                  Add
                </Button>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button className="bg-[#00b4b8] text-white hover:opacity-90" onClick={saveSpecialties}>
              Save specialties
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={certificationOpen} onOpenChange={onCertificationOpenChange}>
        <DialogContent showCloseButton className="p-0 max-w-155">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">
              {editingCertificationIndex != null ? "Edit certification" : "Add certification"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="px-6 pt-4 pb-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Enter certificate title</label>
              <Input value={newCertification.title} onChange={(event) => onNewCertificationChange({ ...newCertification, title: event.target.value })} placeholder="Enter your certificate title here" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#151922]">Issuing organization</label>
              <Input value={newCertification.provider} onChange={(event) => onNewCertificationChange({ ...newCertification, provider: event.target.value })} placeholder="eg: American Heart Association" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#151922]">Start date</label>
                <CustomDatePicker
                  placeholder="Select issue date"
                  date={parseDurationDate(newCertification.date)}
                  setDate={(value) => onNewCertificationChange({ ...newCertification, date: value ? format(value, "yyyy-MM-dd") : "" })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#151922]">End date</label>
                {/* Expiry runs into the future, so the calendar needs a future endMonth
                    (CustomDatePicker otherwise stops at the current month). */}
                <CustomDatePicker
                  placeholder="Select expiry date"
                  endMonth={FUTURE_MONTH_LIMIT}
                  date={parseDurationDate(newCertification.endDate)}
                  setDate={(value) => onNewCertificationChange({ ...newCertification, endDate: value ? format(value, "yyyy-MM-dd") : "" })}
                />
                <p className="mt-2 text-xs text-[#8a8f98]">Leave blank if the certificate doesn&apos;t expire.</p>
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-[#151922]">Upload your certificate here</p>
              <FileDropzone file={certificateFile} onFileChange={setCertificateFile} accept=".pdf,.png,.jpg,.jpeg" hint="PDF, PNG, or JPEG (Max. 50 MB)" />
            </div>
          </DialogBody>
          <DialogFooter>
            {editingCertificationIndex != null && (
              <Button
                type="button"
                variant="outline"
                className="border-[#d8442a] text-[#d8442a] hover:bg-[#fff1f0]"
                onClick={() => {
                  onCertificationsChange(certifications.filter((_, index) => index !== editingCertificationIndex))
                  onNewCertificationChange({ title: "", provider: "", date: "", endDate: "", file: "" })
                  onEditingCertificationIndexChange(null)
                  setCertificateFile(null)
                  onCertificationOpenChange(false)
                }}
              >
                Delete
              </Button>
            )}
            <Button
              className="bg-[#00b4b8] text-white hover:opacity-90"
              onClick={() => {
                if (!newCertification.title.trim()) return
                const entry = {
                  title: newCertification.title.trim(),
                  provider: newCertification.provider.trim(),
                  date: newCertification.date,
                  endDate: newCertification.endDate,
                  status: certificationStatus(newCertification.endDate),
                }
                if (editingCertificationIndex != null) {
                  onCertificationsChange(
                    certifications.map((cert, index) => (index === editingCertificationIndex ? entry : cert)),
                  )
                } else {
                  onCertificationsChange([...certifications, entry])
                }
                onNewCertificationChange({ title: "", provider: "", date: "", endDate: "", file: "" })
                onEditingCertificationIndexChange(null)
                setCertificateFile(null)
                onCertificationOpenChange(false)
              }}
            >
              {editingCertificationIndex != null ? "Save changes" : "Update certificate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TeamInviteDialog
        open={teamInviteOpen}
        onOpenChange={onTeamInviteOpenChange}
        newTeamInvite={newTeamInvite}
        onNewTeamInviteChange={onNewTeamInviteChange}
        onInviteTeamMember={onInviteTeamMember}
        onBulkInviteTeamMembers={onBulkInviteTeamMembers}
      />
    </>
  )
}
