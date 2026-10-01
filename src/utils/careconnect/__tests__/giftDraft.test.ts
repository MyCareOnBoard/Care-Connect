import { describe, it, expect } from "vitest"
import {
  emptyGiftDraft,
  giftDraftFrom,
  giftDraftProblem,
  giftDraftToInput,
  nextDraftForLabel,
  type GiftDraft,
} from "@/utils/careconnect/giftDraft"

/**
 * The rules behind the add/edit gift form.
 *
 * Worth their own file because every field arrives from an input as a string, and the
 * failures that matter are the ones the types cannot catch. `Number("")` is 0, so a cost
 * nobody filled in would validate as a gift that costs nothing — which in a system where
 * gifts mint Cowries for the recipient is not a cosmetic bug.
 */

const valid = (over: Partial<GiftDraft> = {}): GiftDraft => ({
  ...emptyGiftDraft(),
  label: "Rose Bouquet",
  id: "rose_bouquet",
  cost: "250",
  ...over,
})

describe("giftDraftProblem", () => {
  it("accepts a filled-in gift", () => {
    expect(giftDraftProblem(valid())).toBeNull()
  })

  it("refuses an empty cost rather than reading it as free", () => {
    // The assertion this file exists for. Number("") is 0, and a gift costing nothing
    // still mints Creator Cowries for whoever receives it.
    expect(giftDraftProblem(valid({ cost: "" }))).toMatch(/cost/i)
    expect(giftDraftProblem(valid({ cost: "   " }))).toMatch(/cost/i)
  })

  it("refuses a cost of zero or less", () => {
    expect(giftDraftProblem(valid({ cost: "0" }))).toMatch(/at least 1/i)
    expect(giftDraftProblem(valid({ cost: "-5" }))).toMatch(/at least 1/i)
  })

  it("refuses a fractional cost, Cowries being whole things", () => {
    expect(giftDraftProblem(valid({ cost: "2.5" }))).toMatch(/whole number/i)
  })

  it("refuses a cost that is not a number at all", () => {
    expect(giftDraftProblem(valid({ cost: "expensive" }))).toMatch(/whole number/i)
  })

  it("asks for a name before anything else", () => {
    expect(giftDraftProblem(valid({ label: "   " }))).toMatch(/name/i)
  })

  it("refuses an id word matching could not read", () => {
    // The id is what picks the icon, so it has to stay a slug.
    expect(giftDraftProblem(valid({ id: "Rose Bouquet" }))).toMatch(/lowercase/i)
    expect(giftDraftProblem(valid({ id: "rose-bouquet" }))).toMatch(/lowercase/i)
    expect(giftDraftProblem(valid({ id: "_rose" }))).toMatch(/lowercase/i)
  })

  it("asks for an id when a label produced none", () => {
    // "***" slugifies to nothing, so the form has to ask rather than save an empty id.
    expect(giftDraftProblem(valid({ id: "" }))).toMatch(/id/i)
  })

  it("treats a creator share as optional", () => {
    expect(giftDraftProblem(valid({ creatorRate: "" }))).toBeNull()
    expect(giftDraftProblem(valid({ creatorRate: "   " }))).toBeNull()
  })

  it("refuses a creator share above the whole cost", () => {
    // Minting more than the sender spent would make gifting a way to print Cowries.
    expect(giftDraftProblem(valid({ creatorRate: "1.2" }))).toMatch(/between 0 and 1/i)
    expect(giftDraftProblem(valid({ creatorRate: "-0.1" }))).toMatch(/between 0 and 1/i)
    expect(giftDraftProblem(valid({ creatorRate: "half" }))).toMatch(/between 0 and 1/i)
  })

  it("accepts the edges of a creator share", () => {
    expect(giftDraftProblem(valid({ creatorRate: "0" }))).toBeNull()
    expect(giftDraftProblem(valid({ creatorRate: "1" }))).toBeNull()
  })
})

describe("the id a label suggests", () => {
  it("follows the label while the gift is new", () => {
    const draft = nextDraftForLabel(emptyGiftDraft(), "Rose Bouquet")
    expect(draft.id).toBe("rose_bouquet")
    expect(draft.label).toBe("Rose Bouquet")
  })

  it("leaves the id alone once the gift exists", () => {
    // An id is the document id. Changing it would create a second gift rather than rename
    // this one, so renaming an existing gift must not touch it.
    const existing = giftDraftFrom({ id: "rose", label: "Rose", set: "everyday", cost: 50 })
    const renamed = nextDraftForLabel(existing, "Rose Bouquet")

    expect(renamed.label).toBe("Rose Bouquet")
    // Must not follow the rename: a changed id is a different gift.
    expect(renamed.id).toBe("rose")
  })
})

describe("giftDraftFrom", () => {
  it("marks an existing gift as not new", () => {
    const draft = giftDraftFrom({ id: "rose", label: "Rose", set: "everyday", cost: 50 })
    expect(draft.isNew).toBe(false)
  })

  it("leaves the creator share empty when the gift has none", () => {
    // Empty means "use the platform default", which is different from zero.
    const draft = giftDraftFrom({ id: "rose", label: "Rose", set: "everyday", cost: 50 })
    expect(draft.creatorRate).toBe("")
  })

  it("keeps a creator share of zero, which is not the same as none", () => {
    const draft = giftDraftFrom({
      id: "rose",
      label: "Rose",
      set: "everyday",
      cost: 50,
      creatorRate: 0,
    })
    expect(draft.creatorRate).toBe("0")
  })

  it("reads a gift with no active flag as sendable", () => {
    const draft = giftDraftFrom({ id: "rose", label: "Rose", set: "everyday", cost: 50 })
    expect(draft.active).toBe(true)
  })

  it("reads a deactivated gift as not sendable", () => {
    const draft = giftDraftFrom({
      id: "rose",
      label: "Rose",
      set: "everyday",
      cost: 50,
      active: false,
    })
    expect(draft.active).toBe(false)
  })
})

describe("giftDraftToInput", () => {
  it("sends numbers, not the strings the inputs held", () => {
    const body = giftDraftToInput(valid({ cost: "250", creatorRate: "0.4" }))
    expect(body.cost).toBe(250)
    expect(body.creatorRate).toBe(0.4)
  })

  it("omits the creator share entirely when there is none", () => {
    // Sent as null it would store an override; omitted, the gift keeps the default.
    const body = giftDraftToInput(valid({ creatorRate: "" }))
    expect("creatorRate" in body).toBe(false)
  })

  it("trims the name, so a stray space is not part of it", () => {
    expect(giftDraftToInput(valid({ label: "  Rose  " })).label).toBe("Rose")
  })

  it("sends an empty icon, which is what clears the override", () => {
    expect(giftDraftToInput(valid({ icon: "   " })).icon).toBe("")
  })
})
