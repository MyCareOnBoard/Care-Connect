import { describe, it, expect } from "vitest"
import { notificationTarget } from "@/utils/careconnect/notificationTarget"

/**
 * One notification document is read by whichever side it was addressed to, so the target
 * depends on the viewer's flow, not on the document. The security case matters more than
 * the routing one: these become `<Link>` targets.
 */

const booking = { entityType: "careconnect_booking", actionUrl: null }

describe("notificationTarget", () => {
  it("sends a booking to the right screen for each flow", () => {
    expect(notificationTarget(booking, "user")).toBe("/user/schedule")
    expect(notificationTarget(booking, "agency")).toBe("/agency/tele-health")
  })

  it("routes each entity type it knows", () => {
    expect(notificationTarget({ entityType: "careconnect_follow_up" }, "user")).toBe(
      "/user/follow-ups",
    )
    expect(notificationTarget({ entityType: "careconnect_record" }, "user")).toBe(
      "/user/records",
    )
    expect(notificationTarget({ entityType: "careconnect_application" }, "user")).toBe(
      "/user/applications",
    )
    expect(notificationTarget({ entityType: "careconnect_application" }, "agency")).toBe(
      "/agency/applications",
    )
  })

  it("gives an unknown entity type no link, rather than a wrong one", () => {
    expect(notificationTarget({ entityType: "payroll_statement" }, "user")).toBeNull()
    expect(notificationTarget({ entityType: null }, "user")).toBeNull()
    expect(notificationTarget({}, "user")).toBeNull()
  })

  it("honours a server-supplied app-relative path", () => {
    expect(
      notificationTarget({ entityType: "careconnect_booking", actionUrl: "/user/records" }, "user"),
    ).toBe("/user/records")
  })

  it("refuses an off-site actionUrl, falling back to the entity's own screen", () => {
    // A notification document must never be able to navigate the app off-origin.
    for (const actionUrl of [
      "https://evil.example.com",
      "//evil.example.com",
      "javascript:alert(1)",
      "mailto:someone@example.com",
    ]) {
      expect(notificationTarget({ entityType: "careconnect_booking", actionUrl }, "user")).toBe(
        "/user/schedule",
      )
    }
  })

  it("ignores a blank actionUrl", () => {
    expect(notificationTarget({ entityType: "careconnect_record", actionUrl: "   " }, "user")).toBe(
      "/user/records",
    )
  })
})
