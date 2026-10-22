import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"
import SignUpPage from "../signup"
import { getAccountAgreement } from "@/lib/consent"

const signup = vi.hoisted(() => vi.fn())
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ signup }) }))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: { uid: "new-user" } } }))
vi.mock("@/utils/auth/services/authService", () => ({
  createBackendUserProfile: vi.fn(),
  deleteCurrentFirebaseUser: vi.fn(),
}))
vi.mock("@/utils/auth/context/SignupWizardContext", () => ({
  useSignupWizard: () => ({
    fullName: "Ada",
    email: "ada@example.com",
    phone: "",
    isProfessional: false,
    setFullName: vi.fn(),
    setEmail: vi.fn(),
    setPhone: vi.fn(),
  }),
}))
vi.mock("@/components/auth/AuthOnboardingLayout", () => ({
  AuthOnboardingLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock("@/components/auth/PhoneNumberField", () => ({ PhoneNumberField: () => null }))

function setup() {
  render(
    <MemoryRouter>
      <SignUpPage />
    </MemoryRouter>,
  )
  return screen.getByRole("button", { name: "Continue" }).closest("form")!
}

describe("Sign-up agreements", () => {
  afterEach(() => window.localStorage.clear())

  it("will not create an account until the Terms and Privacy Policy are accepted", () => {
    const form = setup()
    fireEvent.submit(form)
    expect(signup).not.toHaveBeenCalled()
  })

  it("links to the policies, and leaves marketing unticked", () => {
    setup()
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms")
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy")
    expect(screen.getByRole("checkbox", { name: /news, tips and offers by email/ })).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: /offers by text message/ })).not.toBeChecked()
  })

  it("records what was agreed with the new account", async () => {
    signup.mockResolvedValue(undefined)
    const form = setup()
    fireEvent.click(screen.getByRole("checkbox", { name: /I agree to the Terms of Service/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: /news, tips and offers by email/ }))
    fireEvent.submit(form)

    await vi.waitFor(() => expect(signup).toHaveBeenCalled())
    expect(getAccountAgreement("new-user")).toMatchObject({ marketingEmail: true, marketingSms: false })
    expect(getAccountAgreement("new-user")?.termsAcceptedAt).toBeTruthy()
  })
})
