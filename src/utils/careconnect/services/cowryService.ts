/**
 * Care Connect — Cowry service (wallet and ledger).
 * Thin axios wrappers around the `/careconnectCowry` backend function.
 *
 * Phase 1 is read-only. Earning, redemption, buying and gifting add their own calls here
 * as those phases land; all of them resolve to ledger rows the history endpoint returns.
 */

import axiosClient from "@/lib/axios"
import type { Timestampish } from "@/utils/careconnect/types"

/** Which of the three balances a row moves. The user sees one Cowry; these stay apart. */
export type CowryWalletType = "reward" | "purchased" | "creator"

export type CowryTransactionType =
  | "earn"
  | "buy"
  | "gift"
  | "redeem"
  | "reserve"
  | "release"
  | "reverse"
  | "adjust"

export type CowryTransactionStatus =
  | "pending"
  | "available"
  | "reserved"
  | "completed"
  | "failed"
  | "reversed"

/**
 * The bands the internal risk score maps onto. The score itself is never sent to the
 * client, so this and `limits` are all the UI has to reason about — which is deliberate.
 */
export type CowryTrustBand = "blocked" | "limited" | "standard" | "high"

/** One wallet's three states. */
export interface CowryBucket {
  /** Spendable now. */
  available: number
  /** Earned, still inside its validation window. */
  pending: number
  /** Held against a redemption that has not settled. */
  reserved: number
}

export interface CowryRedemptionLimits {
  perDay: number
  perMonth: number
  maxGbPerMonth: number
}

export interface CowryWallet {
  userId: string
  reward: CowryBucket
  purchased: CowryBucket
  creator: CowryBucket
  /** Only ever increases. Spending must never reduce it, so status cannot be lost by using the programme. */
  lifetimeEarned: number
  trustBand: CowryTrustBand
  canRedeem: boolean
  limits: CowryRedemptionLimits
}

export interface CowryLedgerEntry {
  id: string
  userId: string
  walletType: CowryWalletType
  type: CowryTransactionType
  /** Always positive. Direction lives in `deltas`. */
  amount: number
  deltas: { available: number; pending: number; reserved: number }
  status: CowryTransactionStatus
  source?: string | null
  destination?: string | null
  campaignId?: string | null
  giftSku?: string | null
  paymentReference?: string | null
  fulfillmentReference?: string | null
  /** The row this one corrects. Present on clawbacks and chargeback reversals. */
  reversalOf?: string | null
  /** Plain-language explanation shown in history, so a deduction never looks unexplained. */
  note?: string | null
  createdAt?: Timestampish
}

export interface ListTransactionsParams {
  walletType?: CowryWalletType
  type?: CowryTransactionType
  status?: CowryTransactionStatus
  limit?: number
  offset?: number
}

/** The caller's three balances, plus what their band lets them redeem. */
export async function getWallet(): Promise<CowryWallet> {
  const { data } = await axiosClient.get("/careconnectCowry/wallet")
  return data.data
}

/** History, newest first. */
export async function listTransactions(
  params: ListTransactionsParams = {},
): Promise<CowryLedgerEntry[]> {
  const { data } = await axiosClient.get("/careconnectCowry/transactions", { params })
  return data.data
}

/** One row in full, including the reference support needs to trace it. */
export async function getTransaction(id: string): Promise<CowryLedgerEntry> {
  const { data } = await axiosClient.get(`/careconnectCowry/transactions/${id}`)
  return data.data
}

/* ── Earning ─────────────────────────────────────────────────────────────── */

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

/** Why a reward was refused. Branch on this, not on a message. */
export type CowryRefusalReason =
  | "already_paid"
  | "daily_cap_reached"
  | "pool_exhausted"
  | "not_eligible"

export interface RecordActivityInput {
  activityType: CowryActivityType
  /** Post id, comment id, referred uid. Required for anything paid once per subject. */
  subjectId?: string
  campaignId?: string
  qualifyingViews?: number
  /** Client-generated, so a retried request cannot pay twice. */
  idempotencyKey?: string
}

export interface CowryEarnResult {
  awarded: boolean
  /** True when an idempotency key matched an earlier request; nothing was issued again. */
  replayed?: boolean
  amount?: number
  reason?: CowryRefusalReason
  breakdown?: { base: number; quality: number; trust: number; campaign: number }
  /** When it becomes spendable: a day for ordinary activity, fourteen for a referral. */
  releaseAt?: string
}

export interface CowryDailyProgress {
  activityType: CowryActivityType
  value: number
  cap: number
  used: number
  remaining: number
}

export interface CowryStreak {
  weekKey: string
  daysActive: number
  daysRequired: number
  earned: boolean
  reward: number
}

export interface CowryPoolStatus {
  poolType: string
  dayKey: string
  limit: number
  issued: number
  remaining: number
  exhausted: boolean
}

export interface CowryEarnSummary {
  today: CowryDailyProgress[]
  streak: CowryStreak
  pools: CowryPoolStatus[]
}

/**
 * Record a qualifying activity.
 *
 * A refused reward comes back as `awarded: false` with a reason on a 200 — hitting a daily
 * cap is an ordinary outcome, so callers should read the result rather than catch.
 */
export async function recordActivity(input: RecordActivityInput): Promise<CowryEarnResult> {
  const { data } = await axiosClient.post("/careconnectCowry/earn", input)
  return data.data
}

/** Everything the Earn screen renders: caps, streak and pool headroom. */
export async function getEarnSummary(): Promise<CowryEarnSummary> {
  const { data } = await axiosClient.get("/careconnectCowry/earn/summary")
  return data.data
}

/* ── Redemption ──────────────────────────────────────────────────────────── */

export type CowryNetwork = "mtn" | "airtel" | "glo" | "9mobile"

export type CowryRedemptionStatus = "reserved" | "completed" | "failed" | "expired"

export type CowryRedeemRefusal =
  | "trust_too_low"
  | "daily_limit_reached"
  | "monthly_limit_reached"
  | "monthly_data_cap_reached"
  | "insufficient_cowries"
  | "unknown_package"
  | "invalid_phone"
  | "phone_in_use"

/** Cost of a package from one wallet, fee included. Computed server-side. */
export interface CowryPrice {
  cowryCost: number
  fee: number
  total: number
}

export interface CowryDataPackage {
  id: string
  label: string
  megabytes: number
  cowryCost: number
  /** Keyed by wallet type; `purchased` carries the 15% conversion fee. */
  pricing?: Partial<Record<CowryWalletType, CowryPrice>>
}

export interface CowryRedemption {
  id: string
  network: CowryNetwork
  phoneNumber: string
  packageId: string
  packageLabel: string
  megabytes: number
  walletType: CowryWalletType
  cowryCost: number
  fee: number
  total: number
  status: CowryRedemptionStatus
  providerReference?: string | null
  createdAt?: Timestampish
}

export interface CowryRedeemResult {
  ok: boolean
  /** Supplier did not answer. Cowries stay held; the sweep returns them after 15 minutes. */
  pending?: boolean
  /** Delivery failed and the reservation has already gone back. */
  released?: boolean
  replayed?: boolean
  reason?: CowryRedeemRefusal
  required?: number
  available?: number
  redemption?: CowryRedemption
}

export interface CowryRedemptionCatalog {
  packages: CowryDataPackage[]
  networks: Array<{ id: CowryNetwork; label: string }>
  usage: { today: number; month: number; megabytesThisMonth: number }
  wallet: CowryWallet
}

export interface RedeemInput {
  packageId: string
  network: string
  phoneNumber: string
  walletType?: CowryWalletType
  idempotencyKey?: string
}

/** Packages, per-wallet pricing, networks and what the caller has left this month. */
export async function getRedemptionCatalog(): Promise<CowryRedemptionCatalog> {
  const { data } = await axiosClient.get("/careconnectCowry/redeem/catalog")
  return data.data
}

/**
 * Reserve Cowries and ask the supplier for the data.
 *
 * A refusal comes back as `ok: false` with a reason on a 200, so callers read the result
 * rather than catch. `pending` means the supplier has not answered yet.
 */
export async function redeemForData(input: RedeemInput): Promise<CowryRedeemResult> {
  const { data } = await axiosClient.post("/careconnectCowry/redeem", input)
  return data.data
}

/** The caller's redemptions, newest first. */
export async function listRedemptions(params: { status?: CowryRedemptionStatus; limit?: number } = {}) {
  const { data } = await axiosClient.get("/careconnectCowry/redeem", { params })
  return data.data as CowryRedemption[]
}

/** One redemption — the receipt, and what a client polls while it is still reserved. */
export async function getRedemption(id: string): Promise<CowryRedemption> {
  const { data } = await axiosClient.get(`/careconnectCowry/redeem/${id}`)
  return data.data
}

/* ── Buying Cowries ──────────────────────────────────────────────────────── */

export type CowryPurchaseStatus = "pending" | "credited" | "failed" | "abandoned";

export type CowryPurchaseRefusal = "unknown_package" | "not_purchasable" | "provider_error";

/** What a package costs and what actually reaches the wallet. Computed server-side. */
export interface CowryPurchasePricing {
  /** Cowries before the deposit fee. */
  gross: number
  fee: number
  /** What lands in the purchased balance. */
  credited: number
  /** Exactly what the card is charged. */
  nairaPrice: number
}

export interface CowryPurchasePackage {
  id: string
  label: string
  nairaPrice: number
  cowries: number
  depositFeeRate: number
  /** Disclosed on the buy screen so a round trip holds no surprise later. */
  withdrawalFeeRate: number
  pricing: CowryPurchasePricing
}

export interface CowryPurchase {
  id: string
  packageId: string
  packageLabel: string
  nairaPrice: number
  grossCowries: number
  feeCowries: number
  creditedCowries: number
  status: CowryPurchaseStatus
  provider: string
  providerReference?: string | null
  ledgerId?: string | null
  createdAt?: Timestampish
}

export interface CowryPurchaseResult {
  ok: boolean
  reason?: CowryPurchaseRefusal
  /** Send the user here to pay. */
  authorizationUrl?: string
  purchase?: CowryPurchase
}

export interface CowryPurchaseSettleResult {
  ok: boolean
  credited?: boolean
  /** Someone got there first — the webhook, or an earlier call. Not an error. */
  alreadyCredited?: boolean
  /** The provider has not settled it yet. Worth checking again shortly. */
  pending?: boolean
  failed?: boolean
  ledgerId?: string | null
  purchase?: CowryPurchase
}

/** Packages with the naira price and the fee already worked out. */
export async function getPurchasePackages(): Promise<CowryPurchasePackage[]> {
  const { data } = await axiosClient.get("/careconnectCowry/purchase/packages")
  return data.data
}

/**
 * Start a purchase.
 *
 * Credits nothing on its own — it returns somewhere to send the user, and the Cowries
 * arrive only after the provider confirms the payment to the server.
 */
export async function startPurchase(input: {
  packageId: string
  returnUrl?: string
  idempotencyKey?: string
}): Promise<CowryPurchaseResult> {
  const { data } = await axiosClient.post("/careconnectCowry/purchase", input)
  return data.data
}

/**
 * Ask the server to check with the provider and credit if it was paid.
 *
 * Safe to call repeatedly: an already-credited purchase answers without crediting again,
 * so polling a pending one costs nothing.
 */
export async function settlePurchase(id: string): Promise<CowryPurchaseSettleResult> {
  const { data } = await axiosClient.post(`/careconnectCowry/purchase/${id}/settle`)
  return data.data
}

/** The caller's purchases, newest first. */
export async function listPurchases(
  params: { status?: CowryPurchaseStatus; limit?: number } = {},
): Promise<CowryPurchase[]> {
  const { data } = await axiosClient.get("/careconnectCowry/purchase", { params })
  return data.data
}

/* ── Gifts ───────────────────────────────────────────────────────────────── */

export type CowryGiftSet = "everyday" | "warm" | "bold" | "rare" | "legendary";

export type CowryGiftRefusal =
  | "unknown_gift"
  | "self_gift"
  | "same_device"
  | "insufficient_cowries"
  | "recipient_suspended"

export interface CowryGiftCatalogItem {
  id: string
  label: string
  set: CowryGiftSet
  cost: number
  creatorRate?: number | null
}

export interface CowryGiftCatalog {
  gifts: CowryGiftCatalogItem[]
  sets: Array<{ id: CowryGiftSet; label: string }>
  /** What the caller can spend right now, so the tray can dim the rest. */
  purchasedAvailable: number
}

export interface CowryGift {
  id: string
  giftId: string
  giftLabel: string
  giftSet: CowryGiftSet
  cost: number
  /** Minted for the recipient. Never equal to the cost. */
  creatorAmount: number
  senderId: string
  senderName?: string | null
  recipientId: string
  targetType: "post" | "profile"
  targetId?: string | null
  message?: string | null
  visible?: boolean
  releaseAt?: Timestampish
  createdAt?: Timestampish
}

export interface CowrySendGiftResult {
  ok: boolean
  replayed?: boolean
  reason?: CowryGiftRefusal
  required?: number
  available?: number
  creatorAmount?: number
  gift?: CowryGift
}

export interface CowryCreatorHold {
  giftId: string
  giftLabel: string
  amount: number
  releaseAt?: Timestampish
}

export interface CowryCreatorEarnings {
  available: number
  /** Still inside the chargeback hold. */
  pending: number
  suspended: boolean
  holdDays: number
  holds: CowryCreatorHold[]
  giftsReceived: number
}

/** Every gift, its set, and what the caller has to spend. */
export async function getGiftCatalog(): Promise<CowryGiftCatalog> {
  const { data } = await axiosClient.get("/careconnectCowry/gifts/catalog")
  return data.data
}

/**
 * Send a gift.
 *
 * Do not play the animation until this resolves — a gift shown on tap is a gift that may
 * never have been paid for.
 */
export async function sendGift(input: {
  giftId: string
  recipientId: string
  targetType?: "post" | "profile"
  targetId?: string | null
  message?: string
  idempotencyKey?: string
}): Promise<CowrySendGiftResult> {
  const { data } = await axiosClient.post("/careconnectCowry/gifts", input)
  return data.data
}

/** The caller's gifts, or the public gifts on a post. */
export async function listGifts(
  params: { direction?: "sent" | "received"; targetId?: string; limit?: number } = {},
): Promise<CowryGift[]> {
  const { data } = await axiosClient.get("/careconnectCowry/gifts", { params })
  return data.data
}

/** What a creator has received, what is held, and when each held amount frees up. */
export async function getCreatorEarnings(): Promise<CowryCreatorEarnings> {
  const { data } = await axiosClient.get("/careconnectCowry/creator/earnings")
  return data.data
}

/* ── Cashing out ─────────────────────────────────────────────────────────── */

export type CowryWithdrawalStatus = "reserved" | "paid" | "failed" | "expired";

export type CowryWithdrawalRefusal =
  | "cowry_rate_not_set"
  | "below_minimum"
  | "insufficient_cowries"
  | "trust_too_low"
  | "daily_limit_reached"
  | "invalid_destination"
  | "wallet_not_withdrawable"

export interface CowryBankDestination {
  /** Ten digits. */
  accountNumber: string
  bankCode: string
  accountName: string
}

export interface CowryWithdrawalQuote {
  cowries: number
  /** Null while the Cowry value is unset, which is the state today. */
  grossNaira: number | null
  feeNaira: number | null
  /** What would reach the bank. */
  netNaira: number | null
  withdrawalFeeRate: number
  minimumCowries: number
  /** Purchased Cowries the caller could cash out. */
  available: number
  /** False until finance sets the Cowry value. Every withdrawal is refused while false. */
  rateSet: boolean
}

export interface CowryWithdrawal {
  id: string
  cowries: number
  grossNaira: number | null
  feeNaira: number | null
  netNaira: number | null
  withdrawalFeeRate: number
  destination: CowryBankDestination
  status: CowryWithdrawalStatus
  provider: string
  payoutReference?: string | null
  createdAt?: Timestampish
  paidAt?: Timestampish
}

export interface CowryWithdrawalResult {
  ok: boolean
  paid?: boolean
  /** Refused by the bank; the Cowries are already back. */
  released?: boolean
  /** The provider has not confirmed. Cowries stay held; the sweep returns them. */
  pending?: boolean
  replayed?: boolean
  reason?: CowryWithdrawalRefusal
  required?: number
  available?: number
  minimumCowries?: number
  withdrawal?: CowryWithdrawal
}

/** What a number of Cowries is worth, and whether it can be taken out at all. */
export async function getWithdrawalQuote(cowries: number): Promise<CowryWithdrawalQuote> {
  const { data } = await axiosClient.get("/careconnectCowry/withdraw/quote", {
    params: { cowries },
  })
  return data.data
}

/** Cash out Purchased Cowries. Reward and Creator Cowries cannot be withdrawn. */
export async function requestWithdrawal(input: {
  cowries: number
  destination: CowryBankDestination
  idempotencyKey?: string
}): Promise<CowryWithdrawalResult> {
  const { data } = await axiosClient.post("/careconnectCowry/withdraw", input)
  return data.data
}

/** The caller's withdrawals, newest first. */
export async function listWithdrawals(
  params: { status?: CowryWithdrawalStatus; limit?: number } = {},
): Promise<CowryWithdrawal[]> {
  const { data } = await axiosClient.get("/careconnectCowry/withdraw", { params })
  return data.data
}
