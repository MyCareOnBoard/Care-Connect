import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { AdminGiftAnalytics } from "../AdminGiftAnalytics"
import { listTopGifts, type CowryTopGifts } from "@/utils/careconnect/services/cowryService"

/**
 * The operator's gift activity panel.
 *
 * What is worth guarding: the count is every gift in the window, but the totals and the
 * breakdowns come from the biggest few only — so they must say so, and never read as the
 * whole of gifting.
 */

vi.mock("@/utils/careconnect/services/cowryService", () => ({
  listTopGifts: vi.fn(),
}))

const mocked = vi.mocked(listTopGifts)

const gift = (id: string, giftId: string, giftLabel: string, giftSet: string, cost: number) => ({
  id,
  giftId,
  giftLabel,
  giftSet: giftSet as CowryTopGifts["gifts"][number]["giftSet"],
  cost,
  senderId: "s",
  senderName: "Ada",
  recipientId: "r",
  recipientName: "Kofi",
})

function board(overrides: Partial<CowryTopGifts> = {}): CowryTopGifts {
  return {
    window: "7d",
    scanned: 240,
    scanCapped: false,
    gifts: [
      gift("g1", "golden_eagle", "Golden Eagle", "legendary", 80000),
      gift("g2", "rose_bouquet", "Rose Bouquet", "warm", 500),
      gift("g3", "rose_bouquet", "Rose Bouquet", "warm", 500),
    ],
    ...overrides,
  }
}

beforeEach(() => {
  mocked.mockReset()
  mocked.mockResolvedValue(board())
})

describe("treasure activity", () => {
  it("counts every treasure sent, and labels the rest as the biggest only", async () => {
    render(<AdminGiftAnalytics />)
    expect(await screen.findByText("240")).toBeInTheDocument()
    expect(screen.getAllByText("Among the 3 biggest treasures in this window").length).toBeGreaterThan(0)
    // The most given leads with the gift sent most often.
    expect(screen.getByText("×2")).toBeInTheDocument()
  })

  it("marks a count that hit the backend's limit", async () => {
    mocked.mockResolvedValue(board({ scanned: 1000, scanCapped: true }))
    render(<AdminGiftAnalytics />)
    expect(await screen.findByText("1,000+")).toBeInTheDocument()
  })

  it("asks for the window chosen", async () => {
    const user = userEvent.setup({ delay: null })
    render(<AdminGiftAnalytics />)
    await screen.findByText("240")
    await user.click(screen.getByRole("tab", { name: "30 days" }))
    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith({ limit: 50, window: "30d" }))
  })

  it("says plainly when nothing was sent", async () => {
    mocked.mockResolvedValue(board({ scanned: 0, gifts: [] }))
    render(<AdminGiftAnalytics />)
    expect(await screen.findByText("No treasures were sent in this window.")).toBeInTheDocument()
  })
})
