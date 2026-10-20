import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import CowryHistoryPage from "../cowry-history"
import type { CowryLedgerEntry } from "@/utils/careconnect/services/cowryService"

const listTransactions = vi.hoisted(() => vi.fn())
vi.mock("@/utils/careconnect/services/cowryService", async () => ({
  ...(await vi.importActual<object>("@/utils/careconnect/services/cowryService")),
  listTransactions,
}))

const DAY = 86_400_000
function entry(id: string, daysAgo: number): CowryLedgerEntry {
  return {
    id,
    type: "earn",
    walletType: "reward",
    amount: 10,
    createdAt: new Date(Date.now() - daysAgo * DAY).toISOString(),
  } as unknown as CowryLedgerEntry
}

describe("Cowry history — date filter", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 16, 15, 0)) // a Thursday
  })
  afterEach(() => vi.useRealTimers())

  it("keeps only rows inside the period, and stops reading once past it", async () => {
    // 25 rows a page: the first page is all this month, the second crosses into last month.
    const page1 = Array.from({ length: 25 }, (_, i) => entry(`a${i}`, i * 0.5))
    const page2 = [entry("b0", 13), entry("b1", 15), entry("b2", 40), ...Array.from({ length: 22 }, (_, i) => entry(`old${i}`, 60 + i))]
    listTransactions.mockImplementation(({ offset = 0 }: { offset?: number }) =>
      Promise.resolve(offset === 0 ? page1 : offset === 25 ? page2 : []),
    )

    render(
      <MemoryRouter>
        <CowryHistoryPage />
      </MemoryRouter>,
    )
    await screen.findByText(/Showing 25 movements/)

    listTransactions.mockClear()
    await userEvent.click(screen.getByRole("button", { name: "This month" }))

    // A page's worth fits in the first page, so it stops there and offers more.
    expect(await screen.findByText(/Showing 25 movements/)).toBeInTheDocument()
    expect(screen.getByText("In, this month")).toBeInTheDocument()
    expect(listTransactions).toHaveBeenCalledTimes(1)

    // The next page reaches back into September: two October rows, then it is done.
    await userEvent.click(screen.getByRole("button", { name: "Load more" }))
    expect(await screen.findByText(/Showing 27 movements/)).toBeInTheDocument()
    expect(listTransactions).toHaveBeenCalledTimes(2)
    expect(listTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 25 }))
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument()
  })

  it("says when a period has nothing, and offers to show any time", async () => {
    listTransactions.mockResolvedValue([entry("x", 20)])
    render(
      <MemoryRouter>
        <CowryHistoryPage />
      </MemoryRouter>,
    )
    await screen.findByText(/Showing 1 movement/)
    await userEvent.click(screen.getByRole("button", { name: "Today" }))
    expect(await screen.findByText("No Cowry activity today")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Show any time" }))
    expect(await screen.findByText(/Showing 1 movement/)).toBeInTheDocument()
  })
})
