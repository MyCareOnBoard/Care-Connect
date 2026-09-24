import type { NavigateFunction } from "react-router"
import type { AppDispatch } from "@/store/redux/store"
import { setUser, logoutUser } from "@/utils/auth/store/authSlice"
import { getUserProfile, transformFirebaseUser, removeUserData } from "@/utils/auth/services/authService"
import {
  getDashboardRouteForUserType,
  getOnboardingRouteForUserType,
  isAdminUserType,
} from "@/utils/auth/helpers/roleDashboard"
import { auth } from "@/lib/firebase"
import { clearAuthCache } from "@/lib/axios"
import { Routes } from "@/routes/constants"

/**
 * Completes login (and MFA challenge, if any) by fetching the backend profile,
 * syncing Redux, and routing to the right dashboard for the account's role.
 * Denies (and signs out) any account whose role has no home on CareConnect.
 */
export async function completePostLogin(
  dispatch: AppDispatch,
  navigate: NavigateFunction
): Promise<void> {
  const firebaseUser = auth.currentUser
  const profile = await getUserProfile()
  const baseUser = firebaseUser
    ? transformFirebaseUser(firebaseUser)
    : {
        uid: profile.uid,
        email: profile.email,
        fullName: profile.fullName,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
  const user = { ...baseUser, ...profile }

  const result = getDashboardRouteForUserType(profile.userType)
  if (!result.allowed) {
    await dispatch(logoutUser())
    clearAuthCache()
    removeUserData()
    navigate(Routes.auth.login, { replace: true })
    throw new Error(result.reason)
  }

  dispatch(setUser(user))

  // If this account hasn't finished the CareConnect setup wizard — including existing
  // Care-On-Board users logging in with shared credentials who have never done it — send
  // them through onboarding before the dashboard.
  //
  // Operators are exempt: the wizard collects a profession, certifications and availability
  // for the professional directory, none of which an administrator has or should be listed
  // in. Sending them through it would block the console behind a form they cannot honestly
  // complete.
  if (!isAdminUserType(profile.userType) && !profile.careConnectOnboardingCompleted) {
    navigate(getOnboardingRouteForUserType(profile.userType), { replace: true })
    return
  }

  navigate(result.route, { replace: true })
}
