import { useState } from "react"
import { Link } from "react-router"
import { Bell, CalendarClock, ChevronDown, ChevronRight, LogOut, Settings, UserRound } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Routes } from "@/routes/constants"
import { useAuth, useAuthUser } from "@/utils/auth"
import { getInitials } from "@/lib/utils"
import { ProfileModals } from "@/components/profile/ProfileModals"
import { useAccountSettings } from "@/hooks/useAccountSettings"
import { useNotifications } from "@/hooks/useNotifications"
import { notificationTarget } from "@/utils/careconnect/notificationTarget"
import { AvailabilityModal } from "@/components/professional/AvailabilityModal"
import { useProfessionalMembership } from "@/utils/professional/useProfessionalMembership"
import type { CareFlow } from "./useCareFlow"

type AccountControlsProps = {
  flow?: CareFlow
  notificationSize?: "md" | "lg"
}

export function AccountControls({ flow = "user", notificationSize = "md" }: AccountControlsProps) {
  const { logout } = useAuth()
  const { user } = useAuthUser()
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()

  const displayName = user?.fullName || "—"
  const initials = getInitials(user?.fullName)
  const isCompany = user?.userType === "careconnect_company" || user?.userType === "agency"
  const displaySubtitle =
    (user?.profile?.profession as string | undefined) ||
    (isCompany ? (user?.profile?.organizationName as string | undefined) : undefined) ||
    (isCompany ? "Company" : "Professional")

  const { isProfessional } = useProfessionalMembership()

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [availabilityOpen, setAvailabilityOpen] = useState(false)

  const {
    accountInfo,
    setAccountInfo,
    saveAccountInfo,
    handleDeactivate,
    handleDelete,
    notificationOptions,
    updateNotification,
    saveNotifications,
    privacyOptions,
    updatePrivacy,
    savePrivacy,
  } = useAccountSettings()

  const profilePath = flow === "agency" ? Routes.app.agency.profile : Routes.app.user.profile
  const notificationButtonSize = notificationSize === "lg" ? "size-11" : "size-10"

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      // Hard redirect (not client-side navigate): a full reload tears down the
      // authenticated React tree and any Radix body/focus locks left by this
      // dropdown, and re-hydrates from the just-cleared storage. Client-side
      // navigation here leaves the previous view mounted ("stuck") on some routes.
      // Mirrors the 401 handler in src/lib/axios.ts.
      window.location.replace(Routes.auth.login)
    }
  }

  return (
    <div className="flex w-fit items-center rounded-full border-[3px] border-[#e8edef] bg-[#f7fafb]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={
              unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"
            }
            className={`relative flex ${notificationButtonSize} items-center justify-center rounded-full bg-white text-[#151922] outline-none transition hover:bg-[#f2f6f8] cursor-pointer`}
          >
            <Bell className="size-4 fill-[#151922]" />
            {/* Was unconditional: the bell always claimed something was waiting while the
                dropdown always said "No notifications". Now it reflects the real count. */}
            {unreadCount > 0 && (
              <span
                aria-hidden
                className="absolute right-3 top-2 size-2 rounded-full bg-[#ed2f20]"
              />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 rounded-xl border-[#dce2e6] bg-white p-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <DropdownMenuLabel className="p-0 text-sm font-semibold">
              Notifications
            </DropdownMenuLabel>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={(event) => {
                  // Keep the menu open — marking all read then having it vanish gives no
                  // chance to read what was just cleared.
                  event.preventDefault()
                  void markAllRead()
                }}
                className="text-xs font-semibold text-[#00898c] hover:opacity-80"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <div className="px-1 py-5 text-center text-sm text-[#737780]">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="px-1 py-5 text-center text-sm text-[#737780]">No notifications</div>
          ) : (
            <ul className="mt-1 max-h-96 overflow-y-auto">
              {notifications.map((item) => {
                const unread = item.status === "unread"
                const target = notificationTarget(item, flow)
                const body = (
                  <>
                    <span className="flex items-start gap-2">
                      {/* Per-row unread marker. The bell's own dot is now derived from
                          the same count, rather than being permanently lit. */}
                      <span
                        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                          unread ? "bg-[#00b4b8]" : "bg-transparent"
                        }`}
                      />
                      <span className="min-w-0">
                        <span
                          className={`block truncate text-sm ${
                            unread ? "font-semibold text-[#151922]" : "text-[#4a5260]"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-[#737780]">
                          {item.message}
                        </span>
                      </span>
                    </span>
                  </>
                )

                return (
                  <li key={item.id} className="border-b border-[#f1f4f6] last:border-0">
                    {target ? (
                      <Link
                        to={target}
                        onClick={() => unread && void markRead(item.id)}
                        className="block rounded-lg px-1 py-2.5 transition hover:bg-[#f7fafb]"
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault()
                          if (unread) void markRead(item.id)
                        }}
                        className="block w-full rounded-lg px-1 py-2.5 text-left transition hover:bg-[#f7fafb]"
                      >
                        {body}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Link
        to={profilePath}
        aria-label="Profile image"
        className="ml-1 flex size-7 items-center justify-center rounded-full bg-[#d3f2f2] transition hover:ring-2 hover:ring-[#00b4b8]/30"
      >
        <UserRound className="size-4 rounded-full text-[#00898c]" />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-6 items-center gap-3 rounded-full pl-2 pr-3 outline-none transition hover:bg-[#edf3f5] cursor-pointer"
          >
            <span className="hidden text-xs font-medium sm:inline">{displayName}</span>
            <ChevronDown className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-2xl border-[#dce2e6] bg-white p-0 overflow-hidden shadow-lg">
          <div className="bg-[#f7fafb] px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d3f2f2] text-sm font-bold text-[#00b4b8]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-[#656f80]">{displaySubtitle}</p>
              </div>
            </div>
          </div>
          <div className="px-1 py-1 space-y-1">
            <DropdownMenuItem asChild className="rounded-lg hover:bg-[#edf3f5] cursor-pointer">
              <Link to={profilePath} className="flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-xl">
                <span className="flex items-center gap-2">
                  <UserRound className="size-4 text-[#00b4b8]" />
                  View profile
                </span>
                <ChevronRight className="size-4 text-[#8b97a8]" />
              </Link>
            </DropdownMenuItem>
            {isProfessional ? (
              <DropdownMenuItem asChild className="rounded-lg hover:bg-[#edf3f5]">
                <button type="button" onClick={() => setAvailabilityOpen(true)} className="flex items-center justify-between w-full gap-2 px-3 py-2 text-sm text-left rounded-xl">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="size-4 text-[#00b4b8]" />
                    Availability
                  </span>
                  <ChevronRight className="size-4 text-[#8b97a8]" />
                </button>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild className="rounded-lg hover:bg-[#edf3f5]">
              <button type="button" onClick={() => setSettingsOpen(true)} className="flex items-center justify-between w-full gap-2 px-3 py-2 text-sm text-left rounded-xl">
                <span className="flex items-center gap-2">
                  <Settings className="size-4 text-[#00b4b8]" />
                  Account settings
                </span>
                <ChevronRight className="size-4 text-[#8b97a8]" />
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg hover:bg-[#edf3f5]">
              <button type="button" onClick={() => setPrivacyOpen(true)} className="flex items-center justify-between w-full gap-2 px-3 py-2 text-sm text-left rounded-xl">
                <span className="flex items-center gap-2">
                  <Settings className="size-4 text-[#00b4b8]" />
                  Privacy & security
                </span>
                <ChevronRight className="size-4 text-[#8b97a8]" />
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg hover:bg-[#edf3f5]">
              <button type="button" onClick={() => setNotificationsOpen(true)} className="flex items-center justify-between w-full gap-2 px-3 py-2 text-sm text-left rounded-xl">
                <span className="flex items-center gap-2">
                  <Bell className="size-4 text-[#00b4b8]" />
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

      {/* Experience / skills / certifications are edited from the profile page's
          tabs, so those dialogs stay closed and inert here. */}
      <ProfileModals
        notificationsOpen={notificationsOpen}
        onNotificationsOpenChange={setNotificationsOpen}
        privacyOpen={privacyOpen}
        onPrivacyOpenChange={setPrivacyOpen}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        notificationOptions={notificationOptions}
        onNotificationOptionChange={updateNotification}
        onSaveNotifications={saveNotifications}
        privacyOptions={privacyOptions}
        onPrivacyOptionChange={updatePrivacy}
        onSavePrivacy={savePrivacy}
        accountInfo={accountInfo}
        onAccountInfoChange={setAccountInfo}
        onSaveAccountInfo={saveAccountInfo}
        onDeactivate={handleDeactivate}
        onDelete={handleDelete}
        experienceOpen={false}
        onExperienceOpenChange={() => {}}
        skillOpen={false}
        onSkillOpenChange={() => {}}
        certificationOpen={false}
        onCertificationOpenChange={() => {}}
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
      {isProfessional ? (
        <AvailabilityModal open={availabilityOpen} onOpenChange={setAvailabilityOpen} />
      ) : null}
    </div>
  )
}
