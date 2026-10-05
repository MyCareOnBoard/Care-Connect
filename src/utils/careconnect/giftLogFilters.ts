import type { ListSentGiftsParams } from "@/utils/careconnect/services/cowryAdminService"

/**
 * Turning the gift log's filter form into a request.
 *
 * Separate from the component so the date handling can be tested, which is the part worth
 * testing: a date input gives back YYYY-MM-DD with no time, and sending that as the end of
 * a range would exclude everything sent on the last day the admin asked for. That failure is
 * invisible — the log just quietly omits today — so it gets a test rather than a comment.
 */

/** Which side of the gift the id field filters on. The backend refuses both at once. */
export type GiftLogParty = "sender" | "recipient"

export type GiftLogFilters = {
  party: GiftLogParty
  partyId: string
  giftId: string
  /** YYYY-MM-DD, as a date input gives it. */
  from: string
  to: string
}

export const EMPTY_GIFT_LOG_FILTERS: GiftLogFilters = {
  party: "sender",
  partyId: "",
  giftId: "",
  from: "",
  to: "",
}

/** Only the filters that are actually set, in the shape the request takes. */
export function toGiftLogQuery(
  filters: GiftLogFilters,
  offset: number,
  limit: number,
): ListSentGiftsParams {
  const query: ListSentGiftsParams = { limit, offset }

  const id = filters.partyId.trim()
  if (id) {
    if (filters.party === "sender") query.senderId = id
    else query.recipientId = id
  }

  if (filters.giftId) query.giftId = filters.giftId

  // The start of the chosen day, and the very end of it. Taking the end date at face value
  // would mean a range ending today excluded everything sent today, because the backend
  // compares against a timestamp rather than a calendar day.
  if (filters.from) query.from = new Date(`${filters.from}T00:00:00.000Z`).toISOString()
  if (filters.to) query.to = new Date(`${filters.to}T23:59:59.999Z`).toISOString()

  return query
}

/** Whether anything is being filtered, which decides if a Clear button is worth showing. */
export function hasAnyGiftLogFilter(filters: GiftLogFilters): boolean {
  return Boolean(filters.partyId.trim() || filters.giftId || filters.from || filters.to)
}
