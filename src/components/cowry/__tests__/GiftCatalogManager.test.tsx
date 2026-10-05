import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { GiftCatalogManager } from "../GiftCatalogManager"
import {
  deleteGift,
  listAdminGifts,
  saveGift,
} from "@/utils/careconnect/services/cowryAdminService"
import type { CowryAdminGiftCatalog } from "@/utils/careconnect/services/cowryAdminService"

/**
 * The gift catalogue screen.
 *
 * The assertion that matters most is the warning. Until an admin saves something, the
 * catalogue they are looking at is a built-in list the backend returns for an empty
 * collection — and their first change turns all fifty into stored rows. Someone who edits
 * one price and finds they have created fifty rows should have been told beforehand, so the
 * banner is tested, and so is the fact that it goes away once the rows are real.
 *
 * Removing a gift is also behind a confirmation on purpose: it is the one action here that
 * cannot be undone from this screen, and "turn off Sendable" is almost always what was
 * meant.
 */

vi.mock("@/utils/careconnect/services/cowryAdminService", async () => {
  const actual = await vi.importActual<
    typeof import("@/utils/careconnect/services/cowryAdminService")
  >("@/utils/careconnect/services/cowryAdminService")
  return {
    ...actual,
    listAdminGifts: vi.fn(),
    saveGift: vi.fn(),
    deleteGift: vi.fn(),
  }
})

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const listMock = vi.mocked(listAdminGifts)
const saveMock = vi.mocked(saveGift)
const deleteMock = vi.mocked(deleteGift)

function catalog(over: Partial<CowryAdminGiftCatalog> = {}): CowryAdminGiftCatalog {
  return {
    seeded: true,
    fromDefaults: false,
    gifts: [
      { id: "rose", label: "Rose", set: "everyday", cost: 50, active: true },
      { id: "clap", label: "Clap", set: "everyday", cost: 15, active: true },
      { id: "bouquet", label: "Bouquet", set: "warm", cost: 100, active: true },
      { id: "royal_crown", label: "Royal Crown", set: "legendary", cost: 50000, active: false },
    ],
    ...over,
  }
}

/**
 * No artificial delay between keystrokes.
 *
 * Every character typed into the name field re-renders the dialog and recomputes both the
 * suggested id and the icon preview, so with the default inter-key delay these tests ran
 * three to five seconds each and tipped over the five-second timeout whenever the whole
 * suite ran at once. The delay buys nothing here: nothing in this form is debounced.
 */
let user: ReturnType<typeof userEvent.setup>

beforeEach(() => {
  user = userEvent.setup({ delay: null })
  listMock.mockReset()
  saveMock.mockReset()
  deleteMock.mockReset()
  listMock.mockResolvedValue(catalog())
  saveMock.mockResolvedValue({
    gift: { id: "rose", label: "Rose", set: "everyday", cost: 50 },
  })
  deleteMock.mockResolvedValue(undefined)
})

const show = () => render(<GiftCatalogManager />)

/* ── reading it ──────────────────────────────────────────────────────────── */

describe("the catalogue", () => {
  it("lists the gifts in a tab per set, with how many each holds", async () => {
    show()
    expect(await screen.findByText("Rose")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Everyday\s*2/ })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: /Legendary\s*1/ })).toBeInTheDocument()
    // Another set's gifts wait behind their own tab.
    expect(screen.queryByText("Bouquet")).not.toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: /Warm/ }))
    expect(await screen.findByText("Bouquet")).toBeInTheDocument()
    expect(screen.queryByText("Rose")).not.toBeInTheDocument()
  })

  it("searches across every set", async () => {
    show()
    await screen.findByText("Rose")
    await user.type(screen.getByRole("textbox", { name: "Search all gifts" }), "bouq")
    expect(await screen.findByText("Bouquet")).toBeInTheDocument()
    expect(screen.queryByText("Rose")).not.toBeInTheDocument()
  })

  it("shows a deactivated gift, marked, rather than hiding it", async () => {
    // A screen that hid them could never turn one back on.
    show()
    await screen.findByText("Rose")
    await user.click(screen.getByRole("tab", { name: /Legendary/ }))
    expect(await screen.findByText("Royal Crown")).toBeInTheDocument()
    expect(screen.getByText("Not sendable")).toBeInTheDocument()
  })

  it("flags a legendary gift the app has no full-screen scene for", async () => {
    show()
    await screen.findByText("Rose")
    await user.click(screen.getByRole("tab", { name: /Legendary/ }))
    expect(await screen.findByText("No full-screen scene")).toBeInTheDocument()
  })

  it("says nothing is sendable when the catalogue is empty", async () => {
    listMock.mockResolvedValue(catalog({ gifts: [] }))
    show()
    expect(await screen.findByText("No gifts")).toBeInTheDocument()
    expect(screen.getByText(/gift tray will be empty/i)).toBeInTheDocument()
  })

  it("offers a retry rather than breaking when it cannot load", async () => {
    listMock.mockRejectedValueOnce(new Error("nope"))
    show()
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument()

    listMock.mockResolvedValue(catalog())
    await user.click(screen.getByRole("button", { name: /Try again/ }))
    expect(await screen.findByText("Rose")).toBeInTheDocument()
  })
})

/* ── the warning that earns this file ───────────────────────────────────── */

describe("before anything has been saved", () => {
  it("warns that the first change will save all of them", async () => {
    // Said beforehand on purpose.
    listMock.mockResolvedValue(catalog({ seeded: false, fromDefaults: true }))
    show()

    expect(await screen.findByText("These are the built-in gifts")).toBeInTheDocument()
    expect(screen.getByText(/first change you make saves all 4 of them/i)).toBeInTheDocument()
  })

  it("stops warning once the rows are real", async () => {
    listMock.mockResolvedValue(catalog({ seeded: true, fromDefaults: false }))
    show()

    await screen.findByText("Rose")
    expect(screen.queryByText("These are the built-in gifts")).not.toBeInTheDocument()
  })
})

/* ── editing ─────────────────────────────────────────────────────────────── */

describe("adding a gift", () => {
  it("suggests an id from the name", async () => {
    show()
    await screen.findByText("Rose")
    await user.click(screen.getByRole("button", { name: /Add a gift/ }))

    const name = await screen.findByLabelText("Name")
    await user.type(name, "Kente Cloth")

    expect(screen.getByLabelText("Id")).toHaveValue("kente_cloth")
  })

  it("will not save without a cost", async () => {
    // Number("") is 0, so an unfilled cost must not read as a free gift.
    show()
    await screen.findByText("Rose")
    await user.click(screen.getByRole("button", { name: /Add a gift/ }))
    await user.type(await screen.findByLabelText("Name"), "Kente Cloth")

    expect(await screen.findByText("Give the gift a cost.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add gift" })).toBeDisabled()
  })

  it("saves once it has a name, an id and a cost", async () => {
    show()
    await screen.findByText("Rose")
    await user.click(screen.getByRole("button", { name: /Add a gift/ }))
    await user.type(await screen.findByLabelText("Name"), "Kente Cloth")
    await user.type(screen.getByLabelText("Cost in Cowries"), "2500")

    await user.click(screen.getByRole("button", { name: "Add gift" }))

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(
        "kente_cloth",
        expect.objectContaining({ label: "Kente Cloth", cost: 2500, active: true }),
      ),
    )
  })

  it("does not send a creator share that was left blank", async () => {
    // Blank means "use the platform default", which is not the same as zero.
    show()
    await screen.findByText("Rose")
    await user.click(screen.getByRole("button", { name: /Add a gift/ }))
    await user.type(await screen.findByLabelText("Name"), "Kente Cloth")
    await user.type(screen.getByLabelText("Cost in Cowries"), "2500")
    await user.click(screen.getByRole("button", { name: "Add gift" }))

    await waitFor(() => expect(saveMock).toHaveBeenCalled())
    const [, body] = saveMock.mock.calls[0]
    expect("creatorRate" in body).toBe(false)
  })
})

describe("editing a gift", () => {
  it("opens with its values and will not let the id change", async () => {
    // The id is the document id: editing it would create a second gift, not rename this one.
    show()
    await screen.findByText("Rose")
    await user.click(screen.getByRole("button", { name: "Edit Rose" }))

    expect(await screen.findByLabelText("Name")).toHaveValue("Rose")
    expect(screen.getByLabelText("Cost in Cowries")).toHaveValue(50)
    expect(screen.getByLabelText("Id")).toBeDisabled()
  })

  it("keeps the id when the name is changed", async () => {
    show()
    await screen.findByText("Rose")
    await user.click(screen.getByRole("button", { name: "Edit Rose" }))

    const name = await screen.findByLabelText("Name")
    await user.clear(name)
    await user.type(name, "Rose Bouquet")

    expect(screen.getByLabelText("Id")).toHaveValue("rose")
  })
})

/* ── removing ────────────────────────────────────────────────────────────── */

describe("removing a gift", () => {
  it("asks first, and points at deactivating instead", async () => {
    show()
    await screen.findByText("Rose")
    await user.click(screen.getByRole("button", { name: "Remove Rose" }))

    expect(await screen.findByText("Remove Rose?")).toBeInTheDocument()
    expect(screen.getByText(/Sendable/)).toBeInTheDocument()
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it("removes it once confirmed", async () => {
    show()
    await screen.findByText("Rose")
    await user.click(screen.getByRole("button", { name: "Remove Rose" }))
    await user.click(await screen.findByRole("button", { name: "Remove" }))

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("rose"))
  })

  it("does nothing when the confirmation is dismissed", async () => {
    show()
    await screen.findByText("Rose")
    await user.click(screen.getByRole("button", { name: "Remove Rose" }))
    await user.click(await screen.findByRole("button", { name: "Keep it" }))

    await waitFor(() => expect(screen.queryByText("Remove Rose?")).not.toBeInTheDocument())
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it("says the gift history is unaffected, because that is the worry", async () => {
    show()
    await screen.findByText("Rose")
    await user.click(screen.getByRole("button", { name: "Remove Rose" }))

    expect(await screen.findByText(/Gifts already sent are unaffected/i)).toBeInTheDocument()
  })
})
