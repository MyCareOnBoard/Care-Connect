import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TreasureShowcase } from "../TreasureShowcase"
import type { CowryGift } from "@/utils/careconnect/services/cowryService"

const listGifts = vi.hoisted(() => vi.fn())
vi.mock("@/utils/careconnect/services/cowryService", () => ({ listGifts }))

function gift(kind: number, sender = "s1"): CowryGift {
  return {
    id: `${kind}-${Math.random()}`,
    giftId: `kind_${kind}`,
    giftLabel: `Treasure ${kind}`,
    giftSet: "standard" as never,
    cost: 10,
    creatorAmount: 8,
    senderId: sender,
    recipientId: "me",
    targetType: "post",
  }
}

describe("TreasureShowcase", () => {
  beforeEach(() => listGifts.mockReset())

  it("stays hidden until something has been received", async () => {
    listGifts.mockResolvedValue([])
    const { container } = render(<TreasureShowcase />)
    await vi.waitFor(() => expect(listGifts).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it("puts the most received first, with a count", async () => {
    listGifts.mockResolvedValue([gift(1), gift(2, "s2"), gift(2, "s3")])
    render(<TreasureShowcase />)
    const tiles = await screen.findAllByRole("listitem")
    expect(tiles[0]).toHaveTextContent("Treasure 2")
    expect(within(tiles[0]).getByText("×2")).toBeInTheDocument()
    expect(screen.getByText(/from 3/)).toBeInTheDocument()
  })

  it("turns a full shelf over with next and previous", async () => {
    listGifts.mockResolvedValue(Array.from({ length: 10 }, (_, i) => gift(i)))
    render(<TreasureShowcase />)

    expect(await screen.findAllByRole("listitem")).toHaveLength(8)
    const previous = screen.getByRole("button", { name: "Previous treasures" })
    const next = screen.getByRole("button", { name: "Next treasures" })
    expect(previous).toBeDisabled()

    await userEvent.click(next)
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
    expect(next).toBeDisabled()

    await userEvent.click(previous)
    expect(screen.getAllByRole("listitem")).toHaveLength(8)
  })

  it("shows no paging when one page holds everything", async () => {
    listGifts.mockResolvedValue([gift(1), gift(2)])
    render(<TreasureShowcase />)
    await screen.findAllByRole("listitem")
    expect(screen.queryByRole("button", { name: "Next treasures" })).not.toBeInTheDocument()
  })
})
