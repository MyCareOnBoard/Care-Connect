/**
 * Care Connect — Cowry economy administration.
 *
 * Thin axios wrappers around `/careconnectCowry/admin`, matching the convention in
 * cowryService.ts rather than the main web app's RTK Query. These endpoints decide how much
 * the platform gives away and what a Cowry is worth, so a mistake here is a financial one
 * rather than a cosmetic one.
 *
 * Every write is recorded by the backend against the staff member who made it, with the old
 * value and the new. Nothing in this module can change a setting without that happening —
 * the change log is read back by `listChangeLog` below.
 */

import axiosClient from "@/lib/axios"
import type { Timestampish } from "@/utils/careconnect/types"

export type CowryPoolType =
  | "daily_engagement"
  | "creator_activity"
  | "referral"
  | "health_education"
  | "sponsored_brand"
  | "special_event"

export type CowryActivityType =
  | "complete_profile"
  | "daily_visit"
  | "comment"
  | "post"
  | "video"
  | "challenge"
  | "referral"
  | "weekly_streak"
  | "video_milestone"

export interface CowryPoolUsage {
  poolType: CowryPoolType
  dayKey: string
  limit: number
  issued: number
  remaining: number
  exhausted: boolean
}

export interface CowryRewardConfig {
  baseValues: Partial<Record<CowryActivityType, number>>
  /** Null means the activity has no daily cap. */
  dailyCaps: Partial<Record<CowryActivityType, number | null>>
  /** May only tighten the engine's own bounds; above them the API answers 400. */
  multiplierCeilings: { quality: number; trust: number; campaign: number }
}

export interface CowryPricingConfig {
  /** Null until finance sets it — deliberately not defaulted to a plausible number. */
  cowryNairaValue: number | null
  depositFeeRate: number
  withdrawalFeeRate: number
}

export interface CowryDataPackage {
  id: string
  label: string
  megabytes: number
  cowryCost: number
  supplierNairaCost?: number | null
  active?: boolean
}

export interface CowryGiftConfig {
  /**
   * How long a gift's creator reward stays pending, in minutes. 43,200 (30 days) by
   * default — the window in which a chargeback on the buyer's purchase can still be
   * unwound before the creator has spent the proceeds.
   */
  creatorHoldMinutes: number
}

export interface CowryAdminConfig {
  pools: Partial<Record<CowryPoolType, number>>
  rewards: CowryRewardConfig
  pricing: CowryPricingConfig
  gifts: CowryGiftConfig
  poolUsage: CowryPoolUsage[]
  packages: CowryDataPackage[]
  /** Derived from supplier prices, never configured. Null until a package carries one. */
  impliedNairaPerCowry: number | null
}

export interface CowryConfigChange {
  id: string
  configKey: string
  field: string
  oldValue: unknown
  newValue: unknown
  staffUid: string | null
  staffName: string | null
  ipAddress: string | null
  at?: unknown
}

export interface CowryConfigWriteResult {
  /** False when the request changed nothing. Nothing is logged in that case. */
  changed: boolean
  changes: Array<{ field: string; from: unknown; to: unknown }>
}

export type CowryMismatchKind =
  | "late_delivery"
  | "missing_delivery"
  | "balance_drift"
  | "stuck_reservation"
  | "payment_unmatched"

export type CowryMismatchStatus = "open" | "assigned" | "resolved"

export type CowryResolution = "auto_corrected" | "manual" | "no_action"

export interface CowryMismatch {
  id: string
  kind: CowryMismatchKind
  subjectId: string | null
  userId: string | null
  detail: Record<string, unknown>
  status: CowryMismatchStatus
  assignedTo: string | null
  resolution: CowryResolution | null
  resolutionNote?: string | null
  /** Runs that found this same problem. Rising means it is not being fixed. */
  seenCount: number
  firstSeenAt?: unknown
  lastSeenAt?: unknown
}

export interface CowryReconciliationRun {
  id: string
  balanceDrift: number
  lateDeliveries: number
  missingDeliveries: number
  stuckReservations: number
  openItems: number
  errors: Array<{ check: string; message: string }>
}

/* ── Configuration ───────────────────────────────────────────────────────── */

/** Everything the console renders: budgets, rates, pricing, catalogue and today's usage. */
export async function getAdminConfig(): Promise<CowryAdminConfig> {
  const { data } = await axiosClient.get("/careconnectCowry/admin/config")
  return data.data
}

/** Daily issuing ceilings, per pool. */
export async function updatePools(
  body: Partial<Record<CowryPoolType, number>>,
): Promise<CowryConfigWriteResult> {
  const { data } = await axiosClient.patch("/careconnectCowry/admin/config/pools", body)
  return data.data
}

/** What each activity pays, and how often it may pay. */
export async function updateRewards(
  body: Partial<CowryRewardConfig>,
): Promise<CowryConfigWriteResult> {
  const { data } = await axiosClient.patch("/careconnectCowry/admin/config/rewards", body)
  return data.data
}

/** Cowry value and the two fee rates. */
export async function updatePricing(
  body: Partial<CowryPricingConfig>,
): Promise<CowryConfigWriteResult> {
  const { data } = await axiosClient.patch("/careconnectCowry/admin/config/pricing", body)
  return data.data
}

/**
 * Gift settings.
 *
 * Shortening the hold does not free gifts already held: a gift's release date is stamped
 * when it is sent. And the release sweep runs every fifteen minutes, so a hold shorter than
 * that is effectively fifteen. The screen says both, because both surprise people.
 */
export async function updateGifts(
  body: Partial<CowryGiftConfig>,
): Promise<CowryConfigWriteResult> {
  const { data } = await axiosClient.patch("/careconnectCowry/admin/config/gifts", body)
  return data.data
}

/* ── The gift catalogue ──────────────────────────────────────────────────── */

export type CowryGiftSetId = "everyday" | "warm" | "bold" | "rare" | "legendary"

export interface CowryAdminGift {
  id: string
  label: string
  set: CowryGiftSetId
  cost: number
  /**
   * Share of the cost minted for the recipient. Undefined means the platform default.
   * Never above 1 — minting more than was spent would make gifting a way to print Cowries.
   */
  creatorRate?: number
  /**
   * An icon override: a rule key the client knows, or an emoji. Absent means the icon is
   * matched from the gift's words, which is why a gift is worth naming after a real thing.
   */
  icon?: string | null
  /** False keeps it out of the gift tray while leaving it recoverable. */
  active?: boolean
}

export interface CowryAdminGiftCatalog {
  gifts: CowryAdminGift[]
  /** Whether the catalogue has been written to the database at all. */
  seeded: boolean
  /**
   * True while these rows are the built-in list rather than stored documents.
   *
   * Worth surfacing: without it the screen would imply an admin is editing saved rows when
   * nothing has been saved. The first write turns them into real rows.
   */
  fromDefaults: boolean
}

/** The catalogue for editing — deactivated gifts included, so they can be turned back on. */
export async function listAdminGifts(): Promise<CowryAdminGiftCatalog> {
  const { data } = await axiosClient.get("/careconnectCowry/admin/gifts")
  return data.data
}

export type CowryGiftInput = Omit<CowryAdminGift, "id">

/**
 * Add or edit a gift.
 *
 * The first save also copies the fifty built-in gifts into the catalogue, because until
 * then the catalogue was only a fallback for an empty collection — saving one gift without
 * that would leave members with that gift and no other. The response reports it once as
 * `seededCatalogue`.
 */
export async function saveGift(
  id: string,
  body: CowryGiftInput,
): Promise<{ gift: CowryAdminGift; seededCatalogue?: number }> {
  const { data } = await axiosClient.put(`/careconnectCowry/admin/gifts/${id}`, body)
  return { gift: data.data, seededCatalogue: data.seededCatalogue }
}

/**
 * Remove a gift from the catalogue.
 *
 * Safe for history: a sent gift copies the label, set and cost onto its own record, so past
 * gifts and creator earnings still read correctly afterwards. Deactivating is the
 * recoverable option — that is `saveGift` with `active: false`.
 */
export async function deleteGift(id: string): Promise<void> {
  await axiosClient.delete(`/careconnectCowry/admin/gifts/${id}`)
}

/**
 * The id to suggest for a new gift.
 *
 * Mirrors slugifyGiftLabel on the backend. The id is what the icon is matched against and
 * it cannot be changed afterwards — a different id is a different gift — so the screen
 * shows it and lets it be edited rather than deriving it silently.
 */
export function suggestGiftId(label: string): string {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80)
}

/** What the backend will accept as a gift id. */
export const GIFT_ID_PATTERN = /^[a-z0-9][a-z0-9_]*$/

/* ── The sent-gift log ───────────────────────────────────────────────────── */

export interface CowrySentGift {
  id: string
  giftId: string
  giftLabel: string
  giftSet: CowryGiftSetId
  /** Purchased Cowries the sender spent. */
  cost: number
  /** Creator Cowries minted for the recipient. Always less than the cost. */
  creatorAmount: number
  senderId: string
  senderName?: string | null
  recipientId: string
  recipientName?: string | null
  targetType?: "post" | "profile" | null
  targetId?: string | null
  visible?: boolean
  releaseAt?: Timestampish
  createdAt?: Timestampish
  /**
   * Whether the sender attached a note. The note itself is never returned: an admin list of
   * private messages between members would be surveillance rather than an audit trail.
   */
  hasMessage: boolean
  /** Whether the creator's share is still inside its chargeback window. */
  held: boolean
}

export interface CowrySentGiftTotals {
  /** Across the whole filtered set, not the page. Null when aggregation was unavailable. */
  gifts: number | null
  cost: number | null
  creatorAmount: number | null
  /** False means the three figures above are null and the log cannot total itself. */
  exact: boolean
}

export interface CowrySentGiftLog {
  data: CowrySentGift[]
  totals: CowrySentGiftTotals
  paging: { limit: number; offset: number; hasMore: boolean }
}

export interface ListSentGiftsParams {
  /** Sender and recipient cannot both be set; the backend refuses it. */
  senderId?: string
  recipientId?: string
  giftId?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/** Every gift that has been sent, newest first, with exact totals for the filter. */
export async function listSentGifts(params: ListSentGiftsParams = {}): Promise<CowrySentGiftLog> {
  const { data } = await axiosClient.get("/careconnectCowry/admin/gifts/sent", { params })
  return { data: data.data, totals: data.totals, paging: data.paging }
}

/** One data package. Changing a price changes what every user pays next redemption. */
export async function savePackage(
  id: string,
  body: Omit<CowryDataPackage, "id">,
): Promise<CowryDataPackage> {
  const { data } = await axiosClient.put(`/careconnectCowry/admin/packages/${id}`, body)
  return data.data
}

/* ── Reconciliation ──────────────────────────────────────────────────────── */

export interface ListMismatchesParams {
  status?: CowryMismatchStatus
  kind?: CowryMismatchKind
  limit?: number
}

export async function listMismatches(
  params: ListMismatchesParams = {},
): Promise<CowryMismatch[]> {
  const { data } = await axiosClient.get("/careconnectCowry/admin/reconciliation", {
    params: { limit: 100, ...params },
  })
  return data.data
}

export interface UpdateMismatchInput {
  assignedTo?: string | null
  resolution?: CowryResolution
  note?: string
}

export async function updateMismatch(
  id: string,
  body: UpdateMismatchInput,
): Promise<CowryMismatch> {
  const { data } = await axiosClient.patch(`/careconnectCowry/admin/reconciliation/${id}`, body)
  return data.data
}

/** Run the sweep now rather than waiting for the 02:30 job. */
export async function runReconciliation(): Promise<CowryReconciliationRun> {
  const { data } = await axiosClient.post("/careconnectCowry/admin/reconciliation/run")
  return data.data
}

/* ── Change log ──────────────────────────────────────────────────────────── */

export interface ListChangeLogParams {
  configKey?: string
  limit?: number
}

/** Read-only. One row per field, so a save that moved four ceilings reads as four decisions. */
export async function listChangeLog(
  params: ListChangeLogParams = {},
): Promise<CowryConfigChange[]> {
  const { data } = await axiosClient.get("/careconnectCowry/admin/changelog", {
    params: { limit: 100, ...params },
  })
  return data.data
}
