import { Routes } from "@/routes/constants"
import type { UserType } from "@/utils/auth/types/user.types"

const COMPANY_TYPES: UserType[] = ["careconnect_company", "agency"]
const DENIED_TYPES: UserType[] = ["super_admin"]

export type DashboardRouteResult =
  | { allowed: true; route: string }
  | { allowed: false; reason: string }

/**
 * Maps a backend profile's userType to the right CareConnect dashboard.
 * Covers both native CareConnect accounts and existing Care-On-Board accounts
 * (agency -> company view; applicant/employee/agency_staff/family_member -> individual view).
 */
export function getDashboardRouteForUserType(userType: UserType | undefined): DashboardRouteResult {
  if (!userType || DENIED_TYPES.includes(userType)) {
    return { allowed: false, reason: "This account isn't available on CareConnect." }
  }

  if (COMPANY_TYPES.includes(userType)) {
    return { allowed: true, route: Routes.app.agency.dashboard }
  }

  return { allowed: true, route: Routes.app.user.dashboard }
}
