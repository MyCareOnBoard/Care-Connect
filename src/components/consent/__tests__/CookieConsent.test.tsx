import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { act } from "react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it } from "vitest"
import { CookieConsent } from "../CookieConsent"
import { getCookieConsent, openCookieSettings } from "@/lib/consent"

function setup() {
  render(
    <MemoryRouter>
      <CookieConsent />
    </MemoryRouter>,
  )
}

describe("Cookie banner", () => {
  afterEach(() => window.localStorage.clear())

  it("asks on first visit, with saying no as easy as saying yes", () => {
    setup()
    expect(screen.getByRole("region", { name: "Cookie choices" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Accept all" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Necessary only" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Cookie policy" })).toHaveAttribute("href", "/cookies")
  })

  it("records Necessary only, and goes away", async () => {
    setup()
    await userEvent.click(screen.getByRole("button", { name: "Necessary only" }))
    expect(getCookieConsent()).toMatchObject({ preferences: false, thirdParty: false })
    expect(screen.queryByRole("region", { name: "Cookie choices" })).not.toBeInTheDocument()
  })

  it("lets each optional category be chosen, with necessary locked on", async () => {
    setup()
    await userEvent.click(screen.getByRole("button", { name: "Manage choices" }))
    expect(screen.getByRole("switch", { name: "Necessary" })).toBeDisabled()
    expect(screen.getByRole("switch", { name: "Preferences" })).not.toBeChecked()

    await userEvent.click(screen.getByRole("switch", { name: "Preferences" }))
    await userEvent.click(screen.getByRole("button", { name: "Save choices" }))
    expect(getCookieConsent()).toMatchObject({ preferences: true, thirdParty: false })
  })

  it("can be reopened later to change the choice", async () => {
    window.localStorage.clear()
    setup()
    await userEvent.click(screen.getByRole("button", { name: "Accept all" }))
    expect(screen.queryByRole("region", { name: "Cookie choices" })).not.toBeInTheDocument()

    act(() => openCookieSettings())
    expect(await screen.findByRole("switch", { name: "Third-party services" })).toBeChecked()
  })
})
