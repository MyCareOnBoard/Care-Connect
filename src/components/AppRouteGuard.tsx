import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth, useAuthUser } from "@/utils/auth"
import { getDashboardRouteForUserType } from "@/utils/auth/helpers/roleDashboard"
import { PageLoader } from "./ui/loader"
import { auth } from "@/lib/firebase"
import { Routes } from "@/routes/constants"

const AGENCY_PREFIX = "/agency"

/**
 * Authorization gate for every in-app (`/user/*`, `/agency/*`) route.
 *
 * The app routes previously had no guard at all: any authenticated account could
 * reach any route by URL, and the company/individual split was decided only by
 * the login landing page + the URL prefix (see useCareFlow). This enforces it:
 *
 *  1. No Firebase session               → send to login.
 *  2. A denied account (e.g. super_admin) → send to login (mirrors postLogin).
 *  3. An account in the wrong area        → redirect to its own dashboard, so a
 *     company account can't open `/user/*` and an individual can't open `/agency/*`.
 *
 * The company-vs-individual decision reuses getDashboardRouteForUserType so this
 * guard and the login routing can never disagree.
 */
export function AppRouteGuard() {
  const { loading } = useAuth()
  const { user } = useAuthUser()
  const location = useLocation()

  // Wait for Firebase to restore the session before deciding anything (avoids a
  // spurious bounce to login on a hard refresh).
  if (loading) return <PageLoader text="Checking authentication..." />
  if (!auth.currentUser) return <Navigate to={Routes.auth.login} replace />
  if (!user) return <PageLoader text="Loading your profile..." />

  const result = getDashboardRouteForUserType(user.userType)
  if (!result.allowed) return <Navigate to={Routes.auth.login} replace />

  // Keep each account inside its own area. `result.route` is the account's correct
  // dashboard, so its prefix tells us which side the account belongs to.
  const belongsToAgency = result.route.startsWith(AGENCY_PREFIX)
  const onAgencyPath = location.pathname.startsWith(AGENCY_PREFIX)
  if (belongsToAgency !== onAgencyPath) return <Navigate to={result.route} replace />

  return <Outlet />
}
