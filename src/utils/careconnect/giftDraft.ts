import {
  GIFT_ID_PATTERN,
  suggestGiftId,
  type CowryAdminGift,
  type CowryGiftSetId,
} from "@/utils/careconnect/services/cowryAdminService"

/**
 * The gift being edited on the admin screen, and what is wrong with it.
 *
 * Separate from the component so the rules can be tested on their own — and because the
 * interesting ones are not obvious. Every field arrives from an input as a string, so the
 * checks have to care about the difference between "empty" and "zero" in a way the types
 * cannot express: `Number("")` is 0, which would quietly turn a cost nobody filled in into
 * a free gift.
 */

export type GiftDraft = {
  id: string
  label: string
  set: CowryGiftSetId
  cost: string
  creatorRate: string
  icon: string
  active: boolean
  /** False when editing. The id is the document id, so it cannot be changed afterwards. */
  isNew: boolean
}

export const emptyGiftDraft = (): GiftDraft => ({
  id: "",
  label: "",
  set: "everyday",
  cost: "",
  creatorRate: "",
  icon: "",
  active: true,
  isNew: true,
})

export const giftDraftFrom = (gift: CowryAdminGift): GiftDraft => ({
  id: gift.id,
  label: gift.label,
  set: gift.set,
  cost: String(gift.cost ?? ""),
  creatorRate:
    gift.creatorRate === undefined || gift.creatorRate === null ? "" : String(gift.creatorRate),
  icon: gift.icon ?? "",
  active: gift.active !== false,
  isNew: false,
})

/** What a label suggests as an id, while the gift is still new. */
export function nextDraftForLabel(draft: GiftDraft, label: string): GiftDraft {
  return {
    ...draft,
    label,
    // Only while new. Once a gift exists its id is its document id, and changing it would
    // create a different gift rather than rename this one.
    id: draft.isNew ? suggestGiftId(label) : draft.id,
  }
}

/** What is wrong with this draft, in the order an admin would hit it. Null when it is fine. */
export function giftDraftProblem(draft: GiftDraft): string | null {
  if (!draft.label.trim()) return "Give the gift a name."
  if (!draft.id) return "Give the gift an id."
  if (!GIFT_ID_PATTERN.test(draft.id)) {
    return "An id must be lowercase letters, numbers and underscores."
  }

  // Emptiness checked before Number(), because Number("") and Number("  ") are both 0 — so
  // a cost nobody filled in would otherwise validate as a gift that costs nothing.
  if (!draft.cost.trim()) return "Give the gift a cost."
  const cost = Number(draft.cost)
  if (!Number.isInteger(cost) || cost < 1) return "A cost must be a whole number, at least 1."

  if (draft.creatorRate.trim()) {
    const rate = Number(draft.creatorRate)
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      return "A creator share is between 0 and 1, where 0.5 is half the cost."
    }
  }

  return null
}

/** The body to send for a valid draft. */
export function giftDraftToInput(draft: GiftDraft) {
  return {
    label: draft.label.trim(),
    set: draft.set,
    cost: Number(draft.cost),
    // Omitted rather than sent as null, so a gift with no override keeps using the
    // platform default rather than storing one.
    ...(draft.creatorRate.trim() ? { creatorRate: Number(draft.creatorRate) } : {}),
    icon: draft.icon.trim(),
    active: draft.active,
  }
}
