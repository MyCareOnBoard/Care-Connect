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

export interface CowryAdminConfig {
  pools: Partial<Record<CowryPoolType, number>>
  rewards: CowryRewardConfig
  pricing: CowryPricingConfig
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
