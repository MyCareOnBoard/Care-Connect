import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PasswordField } from "../PasswordField"

describe("PasswordField", () => {
  it("toggles password visibility when the eye button is pressed", async () => {
    const user = userEvent.setup()
    render(<PasswordField value="secret123" onChange={() => {}} aria-label="Password" />)

    const input = screen.getByLabelText("Password")
    expect(input).toHaveAttribute("type", "password")

    await user.click(screen.getByRole("button", { name: /show password/i }))

    expect(input).toHaveAttribute("type", "text")
  })
})
