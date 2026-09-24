import { Navigate, Outlet } from "react-router"
import { useAuth, useAuthUser } from "@/utils/auth"
import { getDashboardRouteForUserType, isAdminUserType } from "@/utils/auth/helpers/roleDashboard"
import { PageLoader } from "./ui/loader"
import { auth } from "@/lib/firebase"
import { Routes } from "@/routes/constants"

/**
 * Authorization gate for `/admin/*`.
 *
 * The mirror image of AppRouteGuard: that one keeps operators out of the member areas, this
 * one keeps members out of the operator area. Both read the same
 * {@link isAdminUserType}, so they cannot disagree about who is which.
 *
 * This is a convenience, not the security boundary. Every endpoint the console calls is
 * behind `verifySuperAdmin` on the backend, which also requires MFA — so a member who
 * reached this route anyway would see a screen that could not load anything. The guard
 * exists so they get an honest redirect instead of a wall of failed requests.
 */
export function AdminRouteGuard() {
  const { loading } = useAuth()
  const { user } = useAuthUser()

  // Wait for Firebase to restore the session before deciding (avoids a spurious bounce to
  // login on a hard refresh).
  if (loading) return <PageLoader text="Checking authentication..." />
  if (!auth.currentUser) return <Navigate to={Routes.auth.login} replace />
  if (!user) return <PageLoader text="Loading your profile..." />

  if (!isAdminUserType(user.userType)) {
    // Send them to their own dashboard rather than to login — they are signed in
    // legitimately, just not here.
    const result = getDashboardRouteForUserType(user.userType)
    return <Navigate to={result.allowed ? result.route : Routes.auth.login} replace />
  }

  return <Outlet />
}
