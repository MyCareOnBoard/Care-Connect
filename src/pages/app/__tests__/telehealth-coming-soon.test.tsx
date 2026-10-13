import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes as RouterRoutes } from "react-router"
import { describe, expect, it, vi } from "vitest"
import TelehealthComingSoonPage from "../telehealth-coming-soon"
import { Routes } from "@/routes/constants"

// The shared setup pins useLocation to "/", which would make every account look like a
// member's. Here it follows the path each test opens, as it does in the app.
const location = vi.hoisted(() => ({ pathname: "/" }))
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: () => ({ pathname: location.pathname, search: "", hash: "", state: null, key: "test" }),
  }
})

/**
 * Telehealth is paused: every Telehealth page shows this one instead. What matters is that
 * it says so plainly and that "Back to home" goes to the right home for the account type.
 */

function showAt(path: string) {
  location.pathname = path
  render(
    <MemoryRouter initialEntries={[path]}>
      <RouterRoutes>
        <Route path="*" element={<TelehealthComingSoonPage />} />
      </RouterRoutes>
    </MemoryRouter>,
  )
}

describe("Telehealth coming soon", () => {
  it("says Telehealth is coming soon, and what it will bring", () => {
    showAt(Routes.app.user.telehealth)
    expect(screen.getByRole("heading", { name: "Telehealth is coming soon" })).toBeInTheDocument()
    expect(screen.getByText("Online consultations")).toBeInTheDocument()
    expect(screen.getByText("Health records")).toBeInTheDocument()
  })

  it.each([Routes.app.user.telehealth, Routes.app.user.schedule, Routes.app.user.healthProfile])(
    "sends a member home to their dashboard from %s",
    (path) => {
      showAt(path)
      expect(screen.getByRole("link", { name: /Back to home/ })).toHaveAttribute("href", Routes.app.user.dashboard)
    },
  )

  it("sends an agency home to the agency dashboard", () => {
    showAt(Routes.app.agency.telehealthBookings)
    expect(screen.getByRole("link", { name: /Back to home/ })).toHaveAttribute("href", Routes.app.agency.dashboard)
  })
})
