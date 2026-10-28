import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import MfaChallengePage from "../mfa-challenge"

const mfa = vi.hoisted(() => ({
  clearRecaptchaVerifier: vi.fn(),
  completeMfaSignIn: vi.fn(),
  createRecaptchaVerifier: vi.fn(),
  startMfaSignInChallenge: vi.fn(),
}))
vi.mock("@/utils/auth/services/mfaService", () => mfa)
vi.mock("@/utils/auth/services/mfaSessionStore", () => ({
  getMfaResolverSession: () => ({ resolver: {}, maskedPhone: "+234 ••• 1234" }),
  clearMfaResolverSession: vi.fn(),
}))
vi.mock("@/utils/auth/helpers/postLogin", () => ({ completePostLogin: vi.fn() }))
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ logout: vi.fn() }) }))
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }))
vi.mock("@/components/auth/RecaptchaAnchor", () => ({ RecaptchaAnchor: () => null }))
vi.mock("@/components/auth/AuthOnboardingLayout", () => ({
  AuthOnboardingLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

async function setup() {
  render(
    <MemoryRouter>
      <MfaChallengePage />
    </MemoryRouter>,
  )
  await screen.findByLabelText("Verification digit 1")
  return Array.from({ length: 6 }, (_, i) => screen.getByLabelText(`Verification digit ${i + 1}`) as HTMLInputElement)
}
const values = (boxes: HTMLInputElement[]) => boxes.map((box) => box.value).join("")

describe("Sign-in code (MFA challenge)", () => {
  beforeEach(() => {
    mfa.createRecaptchaVerifier.mockResolvedValue({})
    mfa.startMfaSignInChallenge.mockResolvedValue("verification-1")
    mfa.completeMfaSignIn.mockResolvedValue(undefined)
  })

  it("takes a pasted code and signs in with it", async () => {
    const boxes = await setup()
    fireEvent.paste(boxes[0], { clipboardData: { getData: () => "654 321" } })
    expect(values(boxes)).toBe("654321")
    await vi.waitFor(() => expect(mfa.completeMfaSignIn).toHaveBeenCalledWith({}, "verification-1", "654321"))
  })

  it("Backspace clears from the cursor's box to the end", async () => {
    const boxes = await setup()
    fireEvent.change(boxes[0], { target: { value: "12345" } })
    await userEvent.click(boxes[1])
    await userEvent.keyboard("{Backspace}")
    expect(boxes.map((box) => box.value)).toEqual(["1", "", "", "", "", ""])
    expect(boxes[1]).toHaveFocus()
  })

  it("Delete clears the whole code", async () => {
    const boxes = await setup()
    fireEvent.change(boxes[0], { target: { value: "12345" } })
    await userEvent.click(boxes[4])
    await userEvent.keyboard("{Delete}")
    expect(values(boxes)).toBe("")
    expect(boxes[0]).toHaveFocus()
  })
})
