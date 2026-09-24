import { describe, it, expect } from "vitest"
import {
  getDashboardRouteForUserType,
  getOnboardingRouteForUserType,
  isAdminUserType,
} from "@/utils/auth/helpers/roleDashboard"
import { Routes } from "@/routes/constants"
import type { UserType } from "@/utils/auth/types/user.types"

/**
 * Role routing had no tests, which is how a deliberate decision — deny super_admin — could
 * be reversed without anything noticing. These pin the current intent, so the next change
 * to who may go where has to be made on purpose.
 *
 * This module is the single source both route guards read, so the separation asserted here
 * is the separation they enforce.
 */

const INDIVIDUAL_TYPES: UserType[] = [
  "careconnect_individual",
  "applicant",
  "employee",
  "agency_staff",
  "family_member",
]

describe("isAdminUserType", () => {
  it("is true only for super_admin", () => {
    expect(isAdminUserType("super_admin")).toBe(true)
    expect(isAdminUserType("agency")).toBe(false)
    expect(isAdminUserType("careconnect_company")).toBe(false)
    for (const type of INDIVIDUAL_TYPES) {
      expect(isAdminUserType(type)).toBe(false)
    }
  })

  it("is false for a missing type rather than throwing", () => {
    expect(isAdminUserType(undefined)).toBe(false)
  })
})

describe("getDashboardRouteForUserType", () => {
  it("sends an operator to the admin console and nowhere else", () => {
    const result = getDashboardRouteForUserType("super_admin")
    expect(result).toEqual({ allowed: true, route: Routes.app.admin.cowry })
  })

  it("sends company accounts to the agency dashboard", () => {
    for (const type of ["careconnect_company", "agency"] as UserType[]) {
      expect(getDashboardRouteForUserType(type)).toEqual({
        allowed: true,
        route: Routes.app.agency.dashboard,
      })
    }
  })

  it("sends everyone else to the individual dashboard", () => {
    for (const type of INDIVIDUAL_TYPES) {
      expect(getDashboardRouteForUserType(type)).toEqual({
        allowed: true,
        route: Routes.app.user.dashboard,
      })
    }
  })

  it("still refuses an account with no type at all", () => {
    const result = getDashboardRouteForUserType(undefined)
    expect(result.allowed).toBe(false)
  })

  /**
   * The three areas must not overlap. A prefix collision is what would let the guard's
   * agency-vs-individual check read an operator as a member and admit them to the feed.
   */
  it("keeps the three areas on distinct prefixes", () => {
    const prefix = (route: string) => `/${route.split("/")[1]}`

    const admin = getDashboardRouteForUserType("super_admin")
    const company = getDashboardRouteForUserType("agency")
    const individual = getDashboardRouteForUserType("employee")
    if (!admin.allowed || !company.allowed || !individual.allowed) {
      throw new Error("expected all three to be allowed")
    }

    const prefixes = [admin.route, company.route, individual.route].map(prefix)
    expect(new Set(prefixes).size).toBe(3)
    expect(prefix(admin.route)).toBe("/admin")
  })
})

describe("getOnboardingRouteForUserType", () => {
  it("splits company and individual as the dashboard does", () => {
    expect(getOnboardingRouteForUserType("agency")).toBe(Routes.auth.organizationName)
    expect(getOnboardingRouteForUserType("employee")).toBe(Routes.auth.profession)
  })
})
