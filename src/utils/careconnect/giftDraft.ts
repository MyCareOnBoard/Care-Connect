import {
  GIFT_ID_PATTERN,
  suggestGiftId,
  type CowryAdminGift,
  type CowryGiftAvailability,
  type CowryGiftStatus,
  type CowryTaxonomyKey,
} from "@/utils/careconnect/services/cowryAdminService"

/**
 * The Treasure being edited on the admin screen, and what is wrong with it.
 *
 * Separate from the component so the rules can be tested on their own — and because the
 * interesting ones are not obvious. Every field arrives from an input as a string, so the
 * checks have to care about the difference between "empty" and "zero" in a way the types
 * cannot express: `Number("")` is 0, which would quietly turn a cost nobody filled in into
 * a free Treasure.
 *
 * `category`, `rarity` and `collection` are plain strings rather than unions on purpose.
 * They are keys from a taxonomy an admin owns, so a union here would be a second copy of
 * the list that goes stale the moment someone adds a category — which is exactly what the
 * taxonomy exists to prevent. Whether a key is real is the server's answer, not this file's.
 */

export type GiftDraft = {
  id: string
  label: string

  /** The three axes. Only the category is required. */
  category: CowryTaxonomyKey
  rarity: CowryTaxonomyKey
  collection: CowryTaxonomyKey

  /** What it means. `story` stays empty until a cultural reviewer writes or sources one. */
  meaning: string
  story: string
  origin: string
  visual: string

  availability: CowryGiftAvailability
  status: CowryGiftStatus

  cost: string
  creatorRate: string

  /** A limited edition's print run. Empty means unlimited, which is the normal case. */
  quantity: string
  /** YYYY-MM-DD, as a date input gives it. Either end may be left open. */
  availableFrom: string
  availableTo: string

  thumbnailUrl: string
  animationUrl: string
  audioUrl: string

  culturalReviewRequired: boolean
  culturalReviewNote: string
  personalizable: boolean

  icon: string
  active: boolean
  /** False when editing. The id is the document id, so it cannot be changed afterwards. */
  isNew: boolean
}

export const emptyGiftDraft = (category = ""): GiftDraft => ({
  id: "",
  label: "",
  category,
  rarity: "",
  collection: "",
  meaning: "",
  story: "",
  origin: "",
  visual: "",
  availability: "purchase",
  status: "published",
  cost: "",
  creatorRate: "",
  quantity: "",
  availableFrom: "",
  availableTo: "",
  thumbnailUrl: "",
  animationUrl: "",
  audioUrl: "",
  culturalReviewRequired: false,
  culturalReviewNote: "",
  personalizable: false,
  icon: "",
  active: true,
  isNew: true,
})

/** A stored date, which may be an ISO timestamp, as the YYYY-MM-DD a date input wants. */
const asDateInput = (value?: string | null): string => {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}

const str = (value: unknown): string =>
  value === undefined || value === null ? "" : String(value)

export const giftDraftFrom = (gift: CowryAdminGift): GiftDraft => ({
  id: gift.id,
  label: gift.label,
  // Falls back to `set` for anything stored before Treasures, which has no category.
  category: gift.category ?? gift.set ?? "",
  rarity: str(gift.rarity),
  collection: str(gift.collection),
  meaning: str(gift.meaning),
  story: str(gift.story),
  origin: str(gift.origin),
  visual: str(gift.visual),
  availability: gift.availability ?? "purchase",
  status: gift.status ?? "published",
  cost: str(gift.cost),
  creatorRate: str(gift.creatorRate),
  quantity: str(gift.quantity),
  availableFrom: asDateInput(gift.availableFrom),
  availableTo: asDateInput(gift.availableTo),
  thumbnailUrl: str(gift.thumbnailUrl),
  animationUrl: str(gift.animationUrl),
  audioUrl: str(gift.audioUrl),
  culturalReviewRequired: gift.culturalReviewRequired === true,
  culturalReviewNote: str(gift.culturalReviewNote),
  personalizable: gift.personalizable === true,
  icon: gift.icon ?? "",
  active: gift.active !== false,
  isNew: false,
})

/** What a label suggests as an id, while the Treasure is still new. */
export function nextDraftForLabel(draft: GiftDraft, label: string): GiftDraft {
  return {
    ...draft,
    label,
    // Only while new. Once a Treasure exists its id is its document id, and changing it
    // would create a different Treasure rather than rename this one.
    id: draft.isNew ? suggestGiftId(label) : draft.id,
  }
}

/** Whether this Treasure is one a member buys, which decides several rules below. */
export const isPurchasable = (draft: GiftDraft): boolean =>
  draft.availability === "purchase" || draft.availability === "limited"

/** What is wrong with this draft, in the order an admin would hit it. Null when it is fine. */
export function giftDraftProblem(draft: GiftDraft): string | null {
  if (!draft.label.trim()) return "Give the Treasure a name."
  if (!draft.id) return "Give the Treasure an id."
  if (!GIFT_ID_PATTERN.test(draft.id)) {
    return "An id must be lowercase letters, numbers and underscores."
  }
  if (!draft.category.trim()) return "Choose a category."

  // Emptiness checked before Number(), because Number("") and Number("  ") are both 0 — so
  // a cost nobody filled in would otherwise validate as a Treasure that costs nothing.
  if (!draft.cost.trim()) return "Give the Treasure a cost."
  const cost = Number(draft.cost)
  if (!Number.isInteger(cost) || cost < 0) return "A cost must be a whole number."
  // Free is legitimate for something earned rather than bought, and a spam vector for
  // anything else — a free Treasure anyone can send also mints Creator Cowries for nothing.
  if (draft.availability === "purchase" && cost < 1) {
    return "A Treasure that is bought must cost at least 1 Cowry. Change its availability to make it free."
  }

  if (draft.creatorRate.trim()) {
    const rate = Number(draft.creatorRate)
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      return "A creator share is between 0 and 1, where 0.5 is half the cost."
    }
  }

  if (draft.quantity.trim()) {
    const quantity = Number(draft.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) {
      return "A print run must be a whole number, at least 1. Leave it empty for unlimited."
    }
  }

  if (draft.availableFrom && draft.availableTo && draft.availableFrom > draft.availableTo) {
    return "A Treasure cannot stop being available before it starts."
  }

  if (draft.culturalReviewRequired && !draft.culturalReviewNote.trim()) {
    return "Say what the cultural review needs to check. A flag with no question cannot be resolved."
  }

  return null
}

/**
 * What to warn about without blocking the save.
 *
 * Separate from `giftDraftProblem` because these are judgements rather than errors, and an
 * admin is allowed to overrule them. Publishing a Treasure that still needs cultural review
 * is the one that matters: the brief requires the review, but the decision to hold or
 * release belongs to a person, not to a form.
 */
export function giftDraftWarnings(
  draft: GiftDraft,
  suggestedRarity?: string | null,
): string[] {
  const warnings: string[] = []

  if (draft.culturalReviewRequired && draft.status === "published") {
    warnings.push(
      "This Treasure is flagged for cultural review but is set to publish. Members will be able to send it.",
    )
  }
  if (!draft.rarity.trim()) {
    warnings.push("No rarity set. It will not appear under any rarity grouping.")
  } else if (suggestedRarity && suggestedRarity !== draft.rarity) {
    warnings.push(`Its cost falls in the ${suggestedRarity} band, not ${draft.rarity}.`)
  }
  if (draft.availability === "limited" && !draft.quantity.trim()) {
    warnings.push("A limited edition with no print run never closes.")
  }
  if (!draft.meaning.trim()) {
    warnings.push("No meaning set. The brief asks every Treasure to say what it represents.")
  }

  return warnings
}

/** The body to send for a valid draft. */
export function giftDraftToInput(draft: GiftDraft) {
  // Sent as null rather than omitted, so clearing a field on an existing Treasure actually
  // clears it. An omitted field would merge as "leave it alone", which looks like the save
  // silently failing.
  const orNull = (value: string) => (value.trim() ? value.trim() : null)

  return {
    label: draft.label.trim(),
    category: draft.category.trim(),
    rarity: orNull(draft.rarity),
    collection: orNull(draft.collection),
    meaning: orNull(draft.meaning),
    story: orNull(draft.story),
    origin: orNull(draft.origin),
    visual: orNull(draft.visual),
    availability: draft.availability,
    status: draft.status,
    cost: Number(draft.cost),
    // Omitted rather than sent as null, so a Treasure with no override keeps using the
    // platform default rather than storing one.
    ...(draft.creatorRate.trim() ? { creatorRate: Number(draft.creatorRate) } : {}),
    quantity: draft.quantity.trim() ? Number(draft.quantity) : null,
    // Sent as an instant rather than a bare date. The end of the window covers the whole of
    // its last day, or a Treasure available "to the 5th" would stop at midnight on the 4th.
    availableFrom: draft.availableFrom ? `${draft.availableFrom}T00:00:00.000Z` : null,
    availableTo: draft.availableTo ? `${draft.availableTo}T23:59:59.999Z` : null,
    thumbnailUrl: orNull(draft.thumbnailUrl),
    animationUrl: orNull(draft.animationUrl),
    audioUrl: orNull(draft.audioUrl),
    culturalReviewRequired: draft.culturalReviewRequired,
    culturalReviewNote: orNull(draft.culturalReviewNote),
    personalizable: draft.personalizable,
    icon: draft.icon.trim(),
    active: draft.active,
  }
}
