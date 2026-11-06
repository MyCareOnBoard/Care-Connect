import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GiftTray } from "../GiftTray"
import { getGiftCatalog } from "@/utils/careconnect/services/cowryService"

vi.mock("@/utils/careconnect/services/cowryService", () => ({
  getGiftCatalog: vi.fn(),
  sendGift: vi.fn(),
}))

const catalog = {
  sets: [
    { id: "heritage", label: "Heritage" },
    { id: "premium", label: "Premium" },
  ],
  gifts: [
    { id: "calabash", label: "The Calabash", set: "heritage", cost: 500 },
    { id: "stool", label: "The Golden Stool", set: "heritage", cost: 900 },
    { id: "journey", label: "The Golden Journey", set: "premium", cost: 5000 },
  ],
  purchasedAvailable: 1000,
}

async function openTray() {
  render(
    <MemoryRouter>
      <GiftTray open onOpenChange={vi.fn()} recipientId="u2" recipientName="Ada" />
    </MemoryRouter>,
  )
  return screen.findByRole("button", { name: /The Calabash/ })
}

describe("previewing a treasure before sending it", () => {
  beforeEach(() => {
    vi.mocked(getGiftCatalog).mockResolvedValue(catalog)
  })

  it("shows nothing until a treasure is chosen", async () => {
    await openTray()
    expect(screen.queryByRole("group", { name: /Preview of/ })).toBeNull()
  })

  it("previews the chosen treasure with its name and price", async () => {
    fireEvent.click(await openTray())
    const preview = screen.getByRole("group", { name: "Preview of The Calabash" })
    expect(within(preview).getByText("The Calabash")).toBeInTheDocument()
    expect(within(preview).getByText(/500/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send The Calabash" })).toBeInTheDocument()
  })

  it("follows the choice to another treasure", async () => {
    fireEvent.click(await openTray())
    fireEvent.click(screen.getByRole("button", { name: /The Golden Stool/ }))
    expect(screen.getByRole("group", { name: "Preview of The Golden Stool" })).toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Preview of The Calabash" })).toBeNull()
  })

  it("wiggles the icon on hover, on every kind of tile and in the preview", async () => {
    fireEvent.click(await openTray())
    const preview = screen.getByRole("group", { name: "Preview of The Calabash" })
    expect(preview).toHaveClass("cowry-hover")
    expect(preview.querySelector(".cowry-wobble")).not.toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Premium" }))
    const gold = screen.getByRole("button", { name: /The Golden Journey/ })
    expect(gold).toHaveClass("cowry-hover")
    expect(gold.querySelector(".cowry-wobble")).not.toBeNull()
  })

  it("floats the preview and the chosen tile, and leaves the other tiles still", async () => {
    const calabash = await openTray()
    const stool = screen.getByRole("button", { name: /The Golden Stool/ })
    expect(calabash.querySelector(".animate-float-soft")).toBeNull()

    fireEvent.click(calabash)
    expect(screen.getByRole("group", { name: "Preview of The Calabash" }).querySelector(".animate-float-soft")).not.toBeNull()
    expect(calabash.querySelector(".animate-float-soft")).not.toBeNull()
    expect(stool.querySelector(".animate-float-soft")).toBeNull()

    fireEvent.click(stool)
    expect(calabash.querySelector(".animate-float-soft")).toBeNull()
    expect(stool.querySelector(".animate-float-soft")).not.toBeNull()
  })

  it("previews a treasure the sender cannot afford yet, so they can see what they are saving for", async () => {
    await openTray()
    fireEvent.click(screen.getByRole("button", { name: "Premium" }))
    fireEvent.click(screen.getByRole("button", { name: /The Golden Journey/ }))
    expect(screen.getByRole("group", { name: "Preview of The Golden Journey" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Buy Cowries" })).toBeInTheDocument()
  })
})
