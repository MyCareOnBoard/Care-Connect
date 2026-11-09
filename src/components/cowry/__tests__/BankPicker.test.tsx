import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { BankPicker, type PayoutBank } from "../BankPicker"
import { bankMatches } from "../bankSearch"

const BANKS: PayoutBank[] = [
  { code: "044", name: "Access Bank" },
  { code: "214", name: "First City Monument Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "50211", name: "Kuda Microfinance Bank" },
  { code: "033", name: "United Bank For Africa" },
  { code: "057", name: "Zenith Bank" },
]

describe("which banks answer to a search", () => {
  it("matches the start of any word, in any order", () => {
    expect(bankMatches("Guaranty Trust Bank", "guar")).toBe(true)
    expect(bankMatches("Guaranty Trust Bank", "trust guaranty")).toBe(true)
    expect(bankMatches("Guaranty Trust Bank", "GUARANTY")).toBe(true)
    // Not a fragment from the middle of a word.
    expect(bankMatches("Zenith Bank", "nith")).toBe(false)
  })

  it("knows the short forms people say", () => {
    expect(bankMatches("Guaranty Trust Bank", "GTB")).toBe(true)
    expect(bankMatches("United Bank For Africa", "uba")).toBe(true)
    expect(bankMatches("First City Monument Bank", "fcmb")).toBe(true)
    expect(bankMatches("Access Bank", "gtb")).toBe(false)
  })

  it("shows every bank before anything is typed", () => {
    expect(bankMatches("Access Bank", "")).toBe(true)
    expect(bankMatches("Access Bank", "   ")).toBe(true)
  })
})

function Harness({ onChange = vi.fn() }: { onChange?: (code: string) => void }) {
  const [value, setValue] = useState("")
  return (
    <BankPicker
      id="bank"
      banks={BANKS}
      value={value}
      onChange={(code) => {
        setValue(code)
        onChange(code)
      }}
    />
  )
}

describe("the bank picker", () => {
  it("narrows the list as you type and picks the bank you click", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.click(screen.getByRole("combobox"))
    await user.type(screen.getByRole("searchbox", { name: /search banks/i }), "first")

    const options = screen.getAllByRole("option").map((option) => option.textContent)
    expect(options).toEqual(["First City Monument Bank", "First Bank of Nigeria"])

    await user.click(screen.getByRole("option", { name: "First Bank of Nigeria" }))
    expect(onChange).toHaveBeenCalledWith("011")
    expect(screen.getByRole("combobox")).toHaveTextContent("First Bank of Nigeria")
  })

  it("can be driven from the keyboard alone", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.click(screen.getByRole("combobox"))
    await user.keyboard("bank{ArrowDown}{Enter}")

    // "bank" matches all of them; the second is First City Monument Bank.
    expect(onChange).toHaveBeenCalledWith("214")
  })

  it("says so when nothing matches", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole("combobox"))
    await user.type(screen.getByRole("searchbox"), "moniepoint")

    expect(screen.queryAllByRole("option")).toHaveLength(0)
    expect(screen.getByText(/no bank matches/i)).toBeInTheDocument()
  })

  it("starts a fresh search each time it opens", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole("combobox"))
    await user.type(screen.getByRole("searchbox"), "zen")
    await user.keyboard("{Escape}")
    await user.click(screen.getByRole("combobox"))

    expect(screen.getByRole("searchbox")).toHaveValue("")
    expect(screen.getAllByRole("option")).toHaveLength(BANKS.length)
  })
})
