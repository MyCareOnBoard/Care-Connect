import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import VerifyContactPage from "../verify-contact"

const auth = vi.hoisted(() => ({
  getOtpStatus: vi.fn(),
  sendOtp: vi.fn(),
  resendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}))
vi.mock("@/utils/auth/services/authService", () => auth)
vi.mock("@/utils/auth/context/SignupWizardContext", () => ({ useSignupWizard: () => ({ joinType: "individual" }) }))
vi.mock("@/components/auth/AuthOnboardingLayout", () => ({
  AuthOnboardingLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function setup() {
  render(
    <MemoryRouter>
      <VerifyContactPage />
    </MemoryRouter>,
  )
  return Array.from({ length: 6 }, (_, i) => screen.getByLabelText(`Verification digit ${i + 1}`) as HTMLInputElement)
}
const values = (boxes: HTMLInputElement[]) => boxes.map((box) => box.value).join("")

describe("Verify contact — the code boxes", () => {
  beforeEach(() => {
    auth.getOtpStatus.mockResolvedValue(false)
    auth.sendOtp.mockResolvedValue(undefined)
    auth.verifyOtp.mockResolvedValue(undefined)
  })

  it("spreads a pasted code across the boxes and sends it", async () => {
    const boxes = setup()
    fireEvent.paste(boxes[0], { clipboardData: { getData: () => " 123-456 " } })
    expect(values(boxes)).toBe("123456")
    await vi.waitFor(() => expect(auth.verifyOtp).toHaveBeenCalledWith("123456"))
  })

  it("takes a whole code dropped into one box by autofill", () => {
    const boxes = setup()
    fireEvent.change(boxes[0], { target: { value: "987654" } })
    expect(values(boxes)).toBe("987654")
  })

  it("pastes part of a code from where the cursor is, without sending", () => {
    const boxes = setup()
    fireEvent.paste(boxes[2], { clipboardData: { getData: () => "12" } })
    expect(boxes.map((box) => box.value)).toEqual(["", "", "1", "2", "", ""])
    expect(auth.verifyOtp).not.toHaveBeenCalled()
  })

  it("Backspace clears from the cursor's box to the end, and the cursor stays", async () => {
    const boxes = setup()
    fireEvent.change(boxes[0], { target: { value: "12345" } })
    await userEvent.click(boxes[2])
    await userEvent.keyboard("{Backspace}")
    expect(boxes.map((box) => box.value)).toEqual(["1", "2", "", "", "", ""])
    expect(boxes[2]).toHaveFocus()
  })

  it("Backspace in an empty box steps back one and clears from there", async () => {
    const boxes = setup()
    await userEvent.type(boxes[0], "123")
    expect(boxes[3]).toHaveFocus()
    await userEvent.keyboard("{Backspace}")
    expect(values(boxes)).toBe("12")
    expect(boxes[2]).toHaveFocus()
  })

  it("Backspace in box 1 clears only box 1", async () => {
    const boxes = setup()
    fireEvent.change(boxes[0], { target: { value: "12345" } })
    await userEvent.click(boxes[0])
    await userEvent.keyboard("{Backspace}")
    expect(boxes.map((box) => box.value)).toEqual(["", "2", "3", "4", "5", ""])
  })

  it("Delete clears the whole code and goes back to box 1", async () => {
    const boxes = setup()
    fireEvent.change(boxes[0], { target: { value: "12345" } })
    await userEvent.click(boxes[3])
    await userEvent.keyboard("{Delete}")
    expect(values(boxes)).toBe("")
    expect(boxes[0]).toHaveFocus()
  })
})
