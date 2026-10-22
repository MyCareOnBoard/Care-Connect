import { afterEach, describe, expect, it } from "vitest"
import {
  CONSENT_VERSION,
  acceptAllCookies,
  acceptNecessaryOnly,
  getAccountAgreement,
  getCookieConsent,
  hasConsent,
  preferenceStorage,
  recordAccountAgreement,
  setCookieConsent,
} from "../consent"

describe("consent", () => {
  afterEach(() => window.localStorage.clear())

  it("treats necessary storage as always allowed, and everything optional as off until chosen", () => {
    expect(hasConsent("necessary")).toBe(true)
    expect(getCookieConsent()).toBeNull()
    expect(hasConsent("preferences")).toBe(false)
    expect(hasConsent("thirdParty")).toBe(false)
  })

  it("asks again when the policy version changes", () => {
    window.localStorage.setItem(
      "careconnect.consent.cookies",
      JSON.stringify({ version: "older", decidedAt: "2020-01-01", preferences: true, thirdParty: true }),
    )
    expect(getCookieConsent()).toBeNull()
    acceptAllCookies()
    expect(getCookieConsent()?.version).toBe(CONSENT_VERSION)
  })

  it("only remembers preferences once they are allowed", () => {
    acceptNecessaryOnly()
    expect(hasConsent("preferences")).toBe(false)
    expect(hasConsent("thirdParty")).toBe(false)
    preferenceStorage.setItem("careconnect-theme", "dark")
    expect(window.localStorage.getItem("careconnect-theme")).toBeNull()

    acceptAllCookies()
    preferenceStorage.setItem("careconnect-theme", "dark")
    expect(window.localStorage.getItem("careconnect-theme")).toBe("dark")
  })

  it("clears saved preferences when they are turned off, and leaves necessary storage alone", () => {
    acceptAllCookies()
    window.localStorage.setItem("careconnect-theme", "dark")
    window.localStorage.setItem("careconnect-post-draft:u1", "half a post")
    window.localStorage.setItem("auth_user", "{}")

    setCookieConsent({ preferences: false, thirdParty: true })
    expect(window.localStorage.getItem("careconnect-theme")).toBeNull()
    expect(window.localStorage.getItem("careconnect-post-draft:u1")).toBeNull()
    expect(window.localStorage.getItem("auth_user")).toBe("{}")
    expect(hasConsent("thirdParty")).toBe(true)
  })

  it("records an account's agreement with its version, and keeps marketing off unless chosen", () => {
    recordAccountAgreement("u1", { termsAcceptedAt: "2026-10-22T10:00:00.000Z" })
    expect(getAccountAgreement("u1")).toMatchObject({
      version: CONSENT_VERSION,
      termsAcceptedAt: "2026-10-22T10:00:00.000Z",
      marketingEmail: false,
      marketingSms: false,
    })

    recordAccountAgreement("u1", { marketingEmail: true })
    expect(getAccountAgreement("u1")).toMatchObject({
      termsAcceptedAt: "2026-10-22T10:00:00.000Z",
      marketingEmail: true,
    })
  })
})
