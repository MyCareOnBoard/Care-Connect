import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useCareFlow } from "@/components/app/useCareFlow"
import { ProfileModals } from "@/components/profile/ProfileModals"
import { useAccountSettings } from "@/hooks/useAccountSettings"

const settings = ["Account information", "Notification preferences", "Privacy and security"]

export default function SettingsPage() {
  const { flow } = useCareFlow()
  const isAgency = flow === "agency"
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const {
    accountInfo,
    setAccountInfo,
    saveAccountInfo,
    handleDeactivate,
    handleDelete,
    notificationOptions,
    updateNotification,
    privacyOptions,
    updatePrivacy,
  } = useAccountSettings()

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
          <Button
            className="h-11 bg-[#00b4b8] px-6 transition-transform duration-150 hover:scale-105 active:scale-95"
            onClick={() => setSettingsOpen(true)}
          >
            Edit profile
          </Button>
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
                className="flex w-full items-center justify-between rounded-xl border border-[#d6d6d6] bg-white px-4 py-4 text-left text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00b4b8]/40 hover:shadow-[0_4px_14px_rgba(16,20,26,0.08)]"
              >
                {item}
                <span className="text-[#00b4b8]">Open</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Experience / skills / certifications are edited from the profile page's
          tabs; this page only opens the account, notification, and privacy dialogs. */}
      <ProfileModals
        notificationsOpen={notificationsOpen}
        onNotificationsOpenChange={setNotificationsOpen}
        privacyOpen={privacyOpen}
        onPrivacyOpenChange={setPrivacyOpen}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        experienceOpen={false}
        onExperienceOpenChange={() => {}}
        skillOpen={false}
        onSkillOpenChange={() => {}}
        certificationOpen={false}
        onCertificationOpenChange={() => {}}
        notificationOptions={notificationOptions}
        onNotificationOptionChange={updateNotification}
        privacyOptions={privacyOptions}
        onPrivacyOptionChange={updatePrivacy}
        accountInfo={accountInfo}
        onAccountInfoChange={setAccountInfo}
        onSaveAccountInfo={saveAccountInfo}
        onDeactivate={handleDeactivate}
        onDelete={handleDelete}
        experience={[]}
        onExperienceChange={() => {}}
        newExperience={{ role: "", company: "", duration: "", description: "" }}
        onNewExperienceChange={() => {}}
        skills={[]}
        onSkillsChange={() => {}}
        newSkill=""
        onNewSkillChange={() => {}}
        certifications={[]}
        onCertificationsChange={() => {}}
        newCertification={{ title: "", provider: "", date: "", endDate: "", file: "" }}
        onNewCertificationChange={() => {}}
      />
    </div>
  )
}
