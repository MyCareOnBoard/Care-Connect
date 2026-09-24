import { Routes } from "@/routes/constants"
import type { UserType } from "@/utils/auth/types/user.types"

const COMPANY_TYPES: UserType[] = ["careconnect_company", "agency"]

/**
 * Accounts that operate the platform rather than use it.
 *
 * These were previously denied outright. They are admitted now because the Cowry economy is
 * administered from inside CareConnect, and it has to be reachable by the only role the
 * backend will accept for it. They land in `/admin/*` and nowhere else — see
 * {@link isAdminUserType}, which both route guards use to keep the areas apart.
 */
const ADMIN_TYPES: UserType[] = ["super_admin"]

export type DashboardRouteResult =
  | { allowed: true; route: string }
  | { allowed: false; reason: string }

/** Does this account belong in the admin area (and only there)? */
export function isAdminUserType(userType: UserType | undefined): boolean {
  return Boolean(userType && ADMIN_TYPES.includes(userType))
}

/**
 * Maps a backend profile's userType to the right CareConnect dashboard.
 * Covers both native CareConnect accounts and existing Care-On-Board accounts
 * (agency -> company view; applicant/employee/agency_staff/family_member -> individual view;
 * super_admin -> the operator console).
 */
export function getDashboardRouteForUserType(userType: UserType | undefined): DashboardRouteResult {
  if (!userType) {
    return { allowed: false, reason: "This account isn't available on CareConnect." }
  }

  if (isAdminUserType(userType)) {
    return { allowed: true, route: Routes.app.admin.cowry }
  }

  if (COMPANY_TYPES.includes(userType)) {
    return { allowed: true, route: Routes.app.agency.dashboard }
  }

  return { allowed: true, route: Routes.app.user.dashboard }
}

/**
 * Entry step of the CareConnect setup wizard for an account that hasn't finished it.
 * Mirrors the company/individual split of {@link getDashboardRouteForUserType}, so a
 * returning (or cross-over Care-On-Board) account resumes the right branch — company-type
 * accounts collect organization details, everyone else collects professional details.
 * join-type and the email OTP are skipped: these accounts are already authenticated and
 * their type is known.
 */
export function getOnboardingRouteForUserType(userType: UserType): string {
  return COMPANY_TYPES.includes(userType) ? Routes.auth.organizationName : Routes.auth.profession
}
