import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { GiftLog } from "../GiftLog"
import { listAdminGifts, listSentGifts } from "@/utils/careconnect/services/cowryAdminService"
import type { CowrySentGiftLog } from "@/utils/careconnect/services/cowryAdminService"

/**
 * The admin sent-gift log.
 *
 * The assertions worth keeping are about honesty rather than rendering. The totals describe
 * the whole filter, not the page, so the screen must not imply otherwise — and when the
 * database cannot total, it must say so rather than showing zeroes, because a zero here
 * reads as "no gifts" when it means "we could not count".
 *
 * The sender's note is never returned by the backend. The row marks that one exists, and
 * that is all an admin sees while scrolling.
 */

vi.mock("@/utils/careconnect/services/cowryAdminService", async () => {
  const actual = await vi.importActual<
    typeof import("@/utils/careconnect/services/cowryAdminService")
  >("@/utils/careconnect/services/cowryAdminService")
  return { ...actual, listSentGifts: vi.fn(), listAdminGifts: vi.fn() }
})

const logMock = vi.mocked(listSentGifts)
const catalogMock = vi.mocked(listAdminGifts)

let user: ReturnType<typeof userEvent.setup>

function gift(over: Partial<CowrySentGiftLog["data"][number]> = {}) {
  return {
    id: "g1",
    giftId: "royal_crown",
    giftLabel: "Royal Crown",
    giftSet: "legendary" as const,
    cost: 5000,
    creatorAmount: 2500,
    senderId: "u_sender",
    senderName: "Kofi Mensah",
    recipientId: "u_recipient",
    recipientName: "Ama Owusu",
    targetType: "post" as const,
    targetId: "post_1",
    visible: true,
    hasMessage: false,
    held: true,
    ...over,
  }
}

function log(over: Partial<CowrySentGiftLog> = {}): CowrySentGiftLog {
  return {
    data: [gift()],
    totals: { gifts: 1, cost: 5000, creatorAmount: 2500, exact: true },
    paging: { limit: 50, offset: 0, hasMore: false },
    ...over,
  }
}

beforeEach(() => {
  user = userEvent.setup({ delay: null })
  logMock.mockReset()
  catalogMock.mockReset()
  logMock.mockResolvedValue(log())
  catalogMock.mockResolvedValue({
    gifts: [{ id: "rose", label: "Rose", set: "everyday", cost: 50 }],
    seeded: true,
    fromDefaults: false,
  })
})

/* ── reading it ──────────────────────────────────────────────────────────── */

describe("the log", () => {
  it("shows both sides of a treasure and what each side got", async () => {
    render(<GiftLog />)

    expect(await screen.findByText("Royal Crown")).toBeInTheDocument()
    expect(screen.getByText("Kofi Mensah")).toBeInTheDocument()
    expect(screen.getByText("Ama Owusu")).toBeInTheDocument()
  })

  it("says a note exists without showing it", async () => {
    // The backend never sends the words; the row says only that there are some.
    logMock.mockResolvedValue(log({ data: [gift({ hasMessage: true })] }))
    render(<GiftLog />)

    expect(await screen.findByText("note")).toBeInTheDocument()
  })

  it("says nothing about a note when there is none", async () => {
    render(<GiftLog />)
    await screen.findByText("Royal Crown")
    expect(screen.queryByText("note")).not.toBeInTheDocument()
  })

  it("marks whether the creator's share is still held", async () => {
    logMock.mockResolvedValue(log({ data: [gift({ held: true })] }))
    render(<GiftLog />)
    expect(await screen.findByText("Held")).toBeInTheDocument()
  })

  it("marks a released share differently", async () => {
    logMock.mockResolvedValue(log({ data: [gift({ held: false })] }))
    render(<GiftLog />)
    expect(await screen.findByText("Released")).toBeInTheDocument()
  })

  it("falls back to the id when a name was never stored", async () => {
    logMock.mockResolvedValue(log({ data: [gift({ senderName: null, recipientName: null })] }))
    render(<GiftLog />)
    expect(await screen.findByText("u_sender")).toBeInTheDocument()
  })
})

/* ── the totals, and their honesty ──────────────────────────────────────── */

describe("the totals", () => {
  it("shows what members spent against what creators earned", async () => {
    // The spent-against-minted comparison is the reason the log exists.
    logMock.mockResolvedValue(
      log({ totals: { gifts: 12, cost: 60000, creatorAmount: 30000, exact: true } }),
    )
    render(<GiftLog />)

    await screen.findByText("Royal Crown")
    expect(screen.getByText("Members spent")).toBeInTheDocument()
    expect(screen.getByText("Creators earned")).toBeInTheDocument()
  })

  it("says it could not count rather than showing a zero", async () => {
    /*
     * A zero here would read as "no gifts" when it means "we could not count". That is the
     * difference between an empty log and a broken one, and an admin reconciling money
     * should never have to guess which they are looking at.
     */
    logMock.mockResolvedValue(
      log({ totals: { gifts: null, cost: null, creatorAmount: null, exact: false } }),
    )
    render(<GiftLog />)

    await screen.findByText("Royal Crown")
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0)
    expect(screen.getByText(/Totals are unavailable here/i)).toBeInTheDocument()
  })

  it("still shows the rows when it cannot total them", async () => {
    logMock.mockResolvedValue(
      log({ totals: { gifts: null, cost: null, creatorAmount: null, exact: false } }),
    )
    render(<GiftLog />)
    expect(await screen.findByText("Royal Crown")).toBeInTheDocument()
  })
})

/* ── filtering ───────────────────────────────────────────────────────────── */

describe("filtering", () => {
  it("asks for one side only, which is what the backend accepts", async () => {
    render(<GiftLog />)
    await screen.findByText("Royal Crown")

    await user.type(screen.getByLabelText("Member"), "u_sender")
    await user.click(screen.getByRole("button", { name: /Apply/ }))

    await waitFor(() =>
      expect(logMock).toHaveBeenLastCalledWith(expect.objectContaining({ senderId: "u_sender" })),
    )
    expect(logMock.mock.calls.at(-1)?.[0]).not.toHaveProperty("recipientId")
  })

  it("covers the whole last day of a date range", async () => {
    // Otherwise a range ending today omits everything sent today.
    render(<GiftLog />)
    await screen.findByText("Royal Crown")

    await user.type(screen.getByLabelText("To"), "2026-10-02")
    await user.click(screen.getByRole("button", { name: /Apply/ }))

    await waitFor(() =>
      expect(logMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ to: "2026-10-02T23:59:59.999Z" }),
      ),
    )
  })

  it("offers Clear only once something is filtered", async () => {
    render(<GiftLog />)
    await screen.findByText("Royal Crown")
    expect(screen.queryByRole("button", { name: /Clear/ })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("Member"), "u_sender")
    await user.click(screen.getByRole("button", { name: /Apply/ }))

    expect(await screen.findByRole("button", { name: /Clear/ })).toBeInTheDocument()
  })

  it("says no treasures match, rather than that none exist, when a filter is on", async () => {
    render(<GiftLog />)
    await screen.findByText("Royal Crown")

    logMock.mockResolvedValue(
      log({ data: [], totals: { gifts: 0, cost: 0, creatorAmount: 0, exact: true } }),
    )
    await user.type(screen.getByLabelText("Member"), "nobody")
    await user.click(screen.getByRole("button", { name: /Apply/ }))

    expect(await screen.findByText("No treasures match these filters")).toBeInTheDocument()
  })

  it("says none have been sent when nothing is filtered", async () => {
    logMock.mockResolvedValue(
      log({ data: [], totals: { gifts: 0, cost: 0, creatorAmount: 0, exact: true } }),
    )
    render(<GiftLog />)
    expect(await screen.findByText("No treasures have been sent yet")).toBeInTheDocument()
  })
})

/* ── paging and failure ─────────────────────────────────────────────────── */

describe("paging", () => {
  it("cannot go back from the first page", async () => {
    render(<GiftLog />)
    await screen.findByText("Royal Crown")
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled()
  })

  it("cannot go forward when the exact total says this is the end", async () => {
    render(<GiftLog />)
    await screen.findByText("Royal Crown")
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled()
  })

  it("advances the offset by a page", async () => {
    logMock.mockResolvedValue(log({ paging: { limit: 50, offset: 0, hasMore: true } }))
    render(<GiftLog />)
    await screen.findByText("Royal Crown")

    await user.click(screen.getByRole("button", { name: "Next" }))
    await waitFor(() =>
      expect(logMock).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50 })),
    )
  })
})

describe("when it cannot load", () => {
  it("offers a retry rather than breaking", async () => {
    logMock.mockRejectedValueOnce(new Error("nope"))
    render(<GiftLog />)

    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument()

    logMock.mockResolvedValue(log())
    await user.click(screen.getByRole("button", { name: /Try again/ }))
    expect(await screen.findByText("Royal Crown")).toBeInTheDocument()
  })

  it("still renders when the treasure picker cannot load its options", async () => {
    // The catalogue is a convenience for the filter; the log does not depend on it.
    catalogMock.mockRejectedValue(new Error("nope"))
    render(<GiftLog />)
    expect(await screen.findByText("Royal Crown")).toBeInTheDocument()
  })
})
