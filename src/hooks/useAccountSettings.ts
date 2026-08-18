/**
 * Account-settings state shared by the profile page and the settings page.
 *
 * Both surfaces render the same `ProfileModals` account dialog, so the loading,
 * persistence, and deactivate/delete wiring lives here rather than being
 * duplicated (the settings page previously shipped hardcoded demo values and
 * no save handlers at all).
 */

import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Routes } from "@/routes/constants"
import { useAppDispatch } from "@/store/redux/hooks"
import { useAuthUser } from "@/utils/auth"
import {
  deactivateAccount,
  deleteAccount,
  getNotificationPreferences,
  getPrivacySettings,
  updateNotificationPreferences,
  updatePrivacySettings,
  updateCareConnectProfile,
  updateUserProfile,
} from "@/utils/auth/services/authService"
import { logoutUser, setUser } from "@/utils/auth/store/authSlice"
import { getProfile } from "@/utils/careconnect/services/profilesService"
import type { CareConnectProfile } from "@/utils/careconnect/types"

export interface AccountInfo {
  fullName: string
  email: string
  phone: string
  location: string
  headline: string
  description: string
}

const emptyAccountInfo: AccountInfo = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  headline: "",
  description: "",
}

// Mirrors NOTIFICATION_PREFERENCE_DEFAULTS on the backend. Every key is enforced there:
// the delivery switches gate channels, the topic switches gate NotificationCategory groups.
const defaultNotificationOptions = {
  emailNotifications: true,
  inAppNotifications: true,
  pushNotifications: true,
  jobMatches: true,
  certificationExpiring: true,
  newMessages: true,
  mentorInvitations: true,
  appointmentReminders: true,
}

// Mirrors PRIVACY_DEFAULTS. Only settings the API enforces.
const defaultPrivacyOptions = {
  publicProfile: true,
  showLocation: true,
  allowMessages: true,
}

type NotificationKey = keyof typeof defaultNotificationOptions
type PrivacyKey = keyof typeof defaultPrivacyOptions

/**
 * @param options.profile A profile the caller has already fetched. Pass it (even as
 *   `null` while loading) to reuse that request instead of the hook issuing its own.
 *   Omit it entirely and the hook fetches the caller's profile itself.
 * @param options.onSaved Called with the persisted values so a host page can update
 *   any summary it renders alongside the dialog without refetching.
 */
export function useAccountSettings(
  options: { profile?: CareConnectProfile | null; onSaved?: (info: AccountInfo) => void } = {},
) {
  const { profile, onSaved } = options
  const usesCallerProfile = "profile" in options
  const { user } = useAuthUser()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const [accountInfo, setAccountInfo] = useState<AccountInfo>(emptyAccountInfo)
  const [notificationOptions, setNotificationOptions] = useState(defaultNotificationOptions)
  const [privacyOptions, setPrivacyOptions] = useState(defaultPrivacyOptions)

  useEffect(() => {
    if (!user?.uid) return
    const identity = {
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phoneNumber || "",
    }
    const fromProfile = (me: CareConnectProfile): AccountInfo => ({
      ...identity,
      fullName: me.name || identity.fullName,
      location: me.location || "",
      headline: me.headline || me.subtitle || "",
      description: me.description || "",
    })

    if (usesCallerProfile) {
      setAccountInfo(profile ? fromProfile(profile) : (prev) => ({ ...prev, ...identity }))
      return
    }

    let active = true
    ;(async () => {
      try {
        const me = await getProfile(user.uid)
        if (active) setAccountInfo(fromProfile(me))
      } catch {
        // Profile fetch is non-critical — fall back to the auth identity.
        if (active) setAccountInfo((prev) => ({ ...prev, ...identity }))
      }
    })()
    return () => {
      active = false
    }
  }, [user?.uid, user?.fullName, user?.email, user?.phoneNumber, usesCallerProfile, profile])

  // Load the persisted preferences. Both fall back to defaults so a fetch failure shows
  // "everything on" rather than an all-off UI the user never chose.
  useEffect(() => {
    if (!user?.uid) return
    let active = true
    ;(async () => {
      const [prefs, privacy] = await Promise.all([
        getNotificationPreferences().catch(() => null),
        getPrivacySettings().catch(() => null),
      ])
      if (!active) return
      if (prefs) setNotificationOptions((prev) => ({ ...prev, ...prefs }))
      if (privacy) setPrivacyOptions((prev) => ({ ...prev, ...privacy }))
    })()
    return () => {
      active = false
    }
  }, [user?.uid])

  const saveNotifications = async () => {
    const saved = await updateNotificationPreferences(notificationOptions)
    setNotificationOptions((prev) => ({ ...prev, ...saved }))
    toast.success("Notification preferences saved")
  }

  const savePrivacy = async () => {
    const saved = await updatePrivacySettings(privacyOptions)
    setPrivacyOptions((prev) => ({ ...prev, ...saved }))
    toast.success("Privacy settings saved")
  }

  const updateNotification = (key: NotificationKey) => {
    setNotificationOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const updatePrivacy = (key: PrivacyKey) => {
    setPrivacyOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  /**
   * Email is intentionally not written here — changing a Firebase Auth email
   * needs re-authentication and a verification round-trip of its own.
   */
  const saveAccountInfo = async () => {
    const updated = await updateUserProfile({
      fullName: accountInfo.fullName,
      phoneNumber: accountInfo.phone,
    })
    await updateCareConnectProfile({
      headline: accountInfo.headline,
      description: accountInfo.description,
      location: accountInfo.location,
    })

    // Push the saved values back into the persisted auth user. Without this the
    // form re-seeds from the pre-save Redux state on every reopen and reload —
    // and for phone that state came from Firebase Auth, which this never writes,
    // so the field appeared to ignore the update entirely.
    if (user) {
      dispatch(
        setUser({
          ...user,
          fullName: updated?.fullName ?? accountInfo.fullName,
          phoneNumber: updated?.phoneNumber ?? accountInfo.phone,
        }),
      )
    }

    onSaved?.(accountInfo)
    toast.success("Account info saved")
  }

  const handleDeactivate = async () => {
    await deactivateAccount()
    toast.success("Account deactivated")
    await dispatch(logoutUser())
    navigate(Routes.auth.login, { replace: true })
  }

  const handleDelete = async () => {
    await deleteAccount()
    await dispatch(logoutUser())
    navigate(Routes.auth.login, { replace: true })
  }

  return {
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
  }
}
