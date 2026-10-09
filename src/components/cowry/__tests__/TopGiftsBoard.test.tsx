import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { TopGiftsBoard } from "../TopGiftsBoard"
import { listTopGifts } from "@/utils/careconnect/services/cowryService"
import type { CowryTopGifts } from "@/utils/careconnect/services/cowryService"

/**
 * The public gift board.
 *
 * Two things are worth asserting beyond "it renders". The order the backend sends must be
 * the order shown — the ranking is done server-side in memory, and a component that
 * re-sorted or keyed by something else would silently undo it. And the board must say when
 * it only ranked a sample, because "the biggest this month" and "the biggest of the most
 * recent few hundred" are different claims and only one of them is true past a few hundred
 * gifts.
 */

vi.mock("@/utils/careconnect/services/cowryService", () => ({
  listTopGifts: vi.fn(),
}))

const mocked = vi.mocked(listTopGifts)

function board(overrides: Partial<CowryTopGifts> = {}): CowryTopGifts {
  return {
    window: "7d",
    scanned: 3,
    scanCapped: false,
    gifts: [
      {
        id: "g1",
        giftId: "royal_crown",
        giftLabel: "Royal Crown",
        giftSet: "legendary",
        cost: 5000,
        senderId: "u_sender",
        senderName: "Kofi Mensah",
        recipientId: "u_recipient",
        recipientName: "Ama Owusu",
      },
      {
        id: "g2",
        giftId: "bouquet",
        giftLabel: "Bouquet",
        giftSet: "warm",
        cost: 100,
        senderId: "u_two",
        senderName: "Yaa Asante",
        recipientId: "u_three",
        recipientName: "Kwame Boateng",
      },
      {
        id: "g3",
        giftId: "rose",
        giftLabel: "Rose",
        giftSet: "everyday",
        cost: 50,
        senderId: "u_four",
        senderName: "Adjoa Nkrumah",
        recipientId: "u_five",
        recipientName: "Esi Darko",
      },
    ],
    ...overrides,
  }
}

const renderBoard = (props = {}) =>
  render(
    <MemoryRouter>
      <TopGiftsBoard {...props} />
    </MemoryRouter>,
  )

beforeEach(() => {
  mocked.mockReset()
})

describe("TopGiftsBoard", () => {
  it("shows the treasures in the order the backend ranked them", async () => {
    // The ranking happens server-side; re-sorting here would quietly undo it.
    mocked.mockResolvedValue(board())
    renderBoard()

    await waitFor(() => expect(screen.getByText("Royal Crown")).toBeInTheDocument())

    const labels = screen.getAllByText(/Royal Crown|Bouquet|Rose/).map((el) => el.textContent)
    expect(labels).toEqual(["Royal Crown", "Bouquet", "Rose"])
  })

  it("asks for a week by default, rather than all time", async () => {
    // All-time means one early large gift sits at the top of the board forever.
    mocked.mockResolvedValue(board())
    renderBoard()

    await waitFor(() => expect(mocked).toHaveBeenCalled())
    expect(mocked).toHaveBeenCalledWith({ limit: 5, window: "7d" })
  })

  it("refetches with the window the reader picked", async () => {
    mocked.mockResolvedValue(board())
    renderBoard()
    await waitFor(() => expect(screen.getByText("Royal Crown")).toBeInTheDocument())

    await userEvent.click(screen.getByRole("button", { name: "All time" }))

    await waitFor(() => expect(mocked).toHaveBeenLastCalledWith({ limit: 5, window: "all" }))
  })

  it("marks the chosen window as pressed, so the board says what it is showing", async () => {
    mocked.mockResolvedValue(board())
    renderBoard()
    await waitFor(() => expect(screen.getByText("Royal Crown")).toBeInTheDocument())

    expect(screen.getByRole("button", { name: "This week" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute("aria-pressed", "false")
  })

  it("names both sides of the treasure", async () => {
    mocked.mockResolvedValue(board())
    renderBoard()

    await waitFor(() => expect(screen.getByText("Kofi Mensah")).toBeInTheDocument())
    expect(screen.getByText("Ama Owusu")).toBeInTheDocument()
  })

  it("stands in for a name it does not have", async () => {
    // recipientName is only stored on gifts sent from now on, and a deleted account
    // resolves to nothing at all. Neither should render as a blank gap.
    mocked.mockResolvedValue(
      board({
        gifts: [
          {
            id: "g1",
            giftId: "rose",
            giftLabel: "Rose",
            giftSet: "everyday",
            cost: 50,
            senderId: "u1",
            senderName: null,
            recipientId: "u2",
            recipientName: null,
          },
        ],
      }),
    )
    renderBoard()

    await waitFor(() => expect(screen.getByText("Someone")).toBeInTheDocument())
    expect(screen.getByText("a member")).toBeInTheDocument()
  })

  it("says when it ranked only a sample of the window", async () => {
    // Otherwise the heading overclaims: these are the biggest of what it looked at.
    mocked.mockResolvedValue(board({ scanCapped: true, scanned: 300 }))
    renderBoard()

    await waitFor(() => expect(screen.getByText(/300 most recent treasures/)).toBeInTheDocument())
  })

  it("stays quiet about the scan when it saw the whole window", async () => {
    mocked.mockResolvedValue(board({ scanCapped: false, scanned: 3 }))
    renderBoard()

    await waitFor(() => expect(screen.getByText("Royal Crown")).toBeInTheDocument())
    expect(screen.queryByText(/most recent treasures/)).not.toBeInTheDocument()
  })

  it("suggests a longer window when a short one is empty", async () => {
    mocked.mockResolvedValue(board({ gifts: [], scanned: 0, window: "24h" }))
    renderBoard({ initialWindow: "24h" })

    await waitFor(() => expect(screen.getByText("No treasures in this window yet")).toBeInTheDocument())
    expect(screen.getByText(/Try a longer one/)).toBeInTheDocument()
  })

  it("does not suggest a longer window when it already looked at all time", async () => {
    mocked.mockResolvedValue(board({ gifts: [], scanned: 0, window: "all" }))
    renderBoard({ initialWindow: "all" })

    await waitFor(() => expect(screen.getByText("No treasures in this window yet")).toBeInTheDocument())
    expect(screen.queryByText(/Try a longer one/)).not.toBeInTheDocument()
  })

  it("fails as a section that offers a retry, not as a broken page", async () => {
    mocked.mockRejectedValueOnce(new Error("network"))
    renderBoard()

    await waitFor(() => expect(screen.getByText("The board could not be loaded.")).toBeInTheDocument())

    mocked.mockResolvedValue(board())
    await userEvent.click(screen.getByRole("button", { name: /Try again/ }))

    await waitFor(() => expect(screen.getByText("Royal Crown")).toBeInTheDocument())
  })
})
