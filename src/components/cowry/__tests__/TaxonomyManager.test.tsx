import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { TaxonomyManager } from "../TaxonomyManager"
import {
  deleteTaxonomy,
  listGiftTaxonomy,
  saveTaxonomy,
} from "@/utils/careconnect/services/cowryAdminService"
import type { CowryTaxonomy } from "@/utils/careconnect/services/cowryAdminService"

/**
 * The screen that makes the Treasure groupings configurable.
 *
 * The assertions worth keeping are about the two rules that protect existing data.
 *
 * A key cannot be edited once it exists. Every Treasure filed under a category stores the
 * key, so renaming it would orphan them — the field is disabled and the form says why.
 * Getting this wrong loses Treasures silently, which is why it is tested rather than
 * trusted to a comment.
 *
 * Retired rows stay on screen. The categories from before Treasures are inactive, not
 * deleted, because gifts sent back then still carry those keys and have to render a label.
 * A screen that hid them could not turn one back on either.
 */

vi.mock("@/utils/careconnect/services/cowryAdminService", async () => {
  const actual = await vi.importActual<
    typeof import("@/utils/careconnect/services/cowryAdminService")
  >("@/utils/careconnect/services/cowryAdminService")
  return {
    ...actual,
    listGiftTaxonomy: vi.fn(),
    saveTaxonomy: vi.fn(),
    deleteTaxonomy: vi.fn(),
  }
})

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const listMock = vi.mocked(listGiftTaxonomy)
const saveMock = vi.mocked(saveTaxonomy)
const deleteMock = vi.mocked(deleteTaxonomy)

function taxonomy(over: Partial<CowryTaxonomy> = {}): CowryTaxonomy {
  return {
    categories: [
      { kind: "category", key: "heritage", label: "Heritage", order: 1, active: true },
      { kind: "category", key: "nature", label: "Nature", order: 2, active: true },
      { kind: "category", key: "warm", label: "Warm (retired)", order: 99, active: false },
    ],
    rarities: [
      {
        kind: "rarity",
        key: "special",
        label: "Special",
        order: 2,
        active: true,
        minCost: 300,
        maxCost: 749,
        liveTier: 2,
      },
      {
        kind: "rarity",
        key: "timeless",
        label: "Timeless",
        order: 5,
        active: true,
        minCost: 5000,
        maxCost: null,
        liveTier: 5,
      },
    ],
    collections: [
      {
        kind: "collection",
        key: "wellness_collection",
        label: "Wellness Collection",
        order: 1,
        active: true,
        rewardKey: "healing_horizon",
      },
    ],
    ...over,
  }
}

let user: ReturnType<typeof userEvent.setup>

beforeEach(() => {
  user = userEvent.setup({ delay: null })
  listMock.mockReset()
  saveMock.mockReset()
  deleteMock.mockReset()
  listMock.mockResolvedValue(taxonomy())
  saveMock.mockResolvedValue({ kind: "category", key: "x", label: "X" })
  deleteMock.mockResolvedValue(undefined)
})

const show = () => render(<TaxonomyManager />)

/* ── reading ─────────────────────────────────────────────────────────────── */

describe("the groupings", () => {
  it("lists the categories it was given, not a built-in set", async () => {
    // The whole point: these names exist only in the fixture.
    show()
    expect(await screen.findByText("Heritage")).toBeInTheDocument()
    expect(screen.getByText("Nature")).toBeInTheDocument()
  })

  it("keeps retired rows on screen, marked", async () => {
    // Gifts sent before Treasures still carry these keys. Hiding them would mean no way to
    // turn one back on, and no label for the records that reference it.
    show()
    expect(await screen.findByText("Warm (retired)")).toBeInTheDocument()
    expect(screen.getByText("Hidden from pickers")).toBeInTheDocument()
  })

  it("shows a rarity's price band and live tier", async () => {
    show()
    await screen.findByText("Heritage")
    await user.click(screen.getByRole("tab", { name: /Rarities/ }))

    expect(await screen.findByText("300–749 Cowries")).toBeInTheDocument()
    expect(screen.getByText("Live tier 2")).toBeInTheDocument()
  })

  it("says an open-ended band is open-ended rather than showing a null", async () => {
    show()
    await screen.findByText("Heritage")
    await user.click(screen.getByRole("tab", { name: /Rarities/ }))

    expect(await screen.findByText("5000+ Cowries")).toBeInTheDocument()
  })

  it("names the Treasure a collection unlocks", async () => {
    show()
    await screen.findByText("Heritage")
    await user.click(screen.getByRole("tab", { name: /Collections/ }))

    expect(await screen.findByText(/Unlocks healing_horizon/)).toBeInTheDocument()
  })
})

/* ── adding and editing ──────────────────────────────────────────────────── */

describe("adding one", () => {
  it("suggests a key from the name", async () => {
    show()
    await screen.findByText("Heritage")

    await user.click(screen.getByRole("button", { name: /Add a category/ }))
    await user.type(screen.getByLabelText("Name"), "Food & Table")

    expect(screen.getByLabelText("Key")).toHaveValue("food_table")
  })

  it("saves the new row and reloads", async () => {
    show()
    await screen.findByText("Heritage")

    await user.click(screen.getByRole("button", { name: /Add a category/ }))
    await user.type(screen.getByLabelText("Name"), "Celebration")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(
        "category",
        "celebration",
        expect.objectContaining({ label: "Celebration", active: true }),
      ),
    )
  })

  it("will not save without a name", async () => {
    show()
    await screen.findByText("Heritage")

    await user.click(screen.getByRole("button", { name: /Add a category/ }))
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })
})

describe("editing one", () => {
  it("will not let the key change, because Treasures store it", async () => {
    // The assertion this file exists for. Renaming a key orphans every Treasure filed
    // under it, and nothing on screen would say so.
    show()
    await screen.findByText("Heritage")

    await user.click(screen.getByRole("button", { name: "Edit Heritage" }))

    expect(screen.getByLabelText("Key")).toBeDisabled()
    expect(screen.getByText(/Every Treasure filed here stores this key/)).toBeInTheDocument()
  })

  it("lets the label change, which is what every screen shows", async () => {
    show()
    await screen.findByText("Heritage")

    await user.click(screen.getByRole("button", { name: "Edit Heritage" }))
    await user.clear(screen.getByLabelText("Name"))
    await user.type(screen.getByLabelText("Name"), "Heritage & Ancestry")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(
        "category",
        "heritage",
        expect.objectContaining({ label: "Heritage & Ancestry" }),
      ),
    )
  })

  it("refuses a price band that runs backwards", async () => {
    show()
    await screen.findByText("Heritage")
    await user.click(screen.getByRole("tab", { name: /Rarities/ }))
    await user.click(await screen.findByRole("button", { name: "Edit Special" }))

    await user.clear(screen.getByLabelText("From"))
    await user.type(screen.getByLabelText("From"), "900")

    expect(screen.getByText(/must not be above the top/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })
})

/* ── removing ────────────────────────────────────────────────────────────── */

describe("removing one", () => {
  it("asks first, and offers turning it off instead", async () => {
    show()
    await screen.findByText("Heritage")

    await user.click(screen.getByRole("button", { name: "Remove Heritage" }))

    expect(await screen.findByText("Remove Heritage?")).toBeInTheDocument()
    expect(screen.getByText(/turning it off instead/i)).toBeInTheDocument()
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it("removes it once confirmed", async () => {
    show()
    await screen.findByText("Heritage")

    await user.click(screen.getByRole("button", { name: "Remove Heritage" }))
    await user.click(await screen.findByRole("button", { name: "Remove" }))

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("category", "heritage"))
  })
})

describe("when it cannot load", () => {
  it("offers a retry rather than an empty screen", async () => {
    listMock.mockRejectedValueOnce(new Error("nope"))
    show()

    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument()

    listMock.mockResolvedValue(taxonomy())
    await user.click(screen.getByRole("button", { name: /Try again/ }))
    expect(await screen.findByText("Heritage")).toBeInTheDocument()
  })
})
