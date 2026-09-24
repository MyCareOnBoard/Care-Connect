/**
 * Care Connect — Cowry display helpers.
 *
 * Presentation only; the arithmetic that matters lives in the backend ledger. What is here
 * is the vocabulary the wallet and history screens share, kept in one place so a movement
 * cannot be labelled "Earned" on one screen and "Reward" on the other.
 */

import type {
  CowryBucket,
  CowryLedgerEntry,
  CowryTransactionType,
  CowryTrustBand,
  CowryWallet,
  CowryWalletType,
} from "@/utils/careconnect/services/cowryService"

/** Cheapest data package in the catalogue, in Cowries. */
export const CHEAPEST_PACKAGE_COWRIES = 1500

/** Thousands separators. Cowries are always whole numbers. */
export function formatCowries(amount: number | null | undefined): string {
  return Math.trunc(amount ?? 0).toLocaleString("en-US")
}

export const WALLET_LABELS: Record<CowryWalletType, string> = {
  reward: "Reward Cowries",
  purchased: "Purchased Cowries",
  creator: "Creator Cowries",
}

/** What each balance is for, in the user's terms rather than the ledger's. */
export const WALLET_BLURBS: Record<CowryWalletType, string> = {
  reward: "Earned by taking part. Redeem these for mobile data.",
  purchased: "Bought with money. Use these to send gifts.",
  creator: "Received through gifts. Redeem these for mobile data.",
}

/** Activity names as the user would say them, not as the engine stores them. */
export const ACTIVITY_LABELS: Record<string, string> = {
  complete_profile: "Complete your profile",
  daily_visit: "Open the app",
  comment: "Leave a comment",
  post: "Write a post",
  video: "Post a video",
  challenge: "Finish a health challenge",
  referral: "Invite someone who stays",
  weekly_streak: "Weekly streak",
  video_milestone: "A video passes 1,000 views",
}

export const TRANSACTION_LABELS: Record<CowryTransactionType, string> = {
  earn: "Earned",
  buy: "Purchased",
  gift: "Gift",
  redeem: "Redeemed",
  reserve: "Held for redemption",
  release: "Returned to your balance",
  reverse: "Correction",
  adjust: "Adjustment",
}

/**
 * Did this row add Cowries, take them away, or only move them between buckets?
 *
 * A reservation is `neutral` on purpose: the total has not changed, and showing it as a
 * loss would make a redemption in progress look like money already gone.
 */
export function entryDirection(entry: CowryLedgerEntry): "in" | "out" | "neutral" {
  const d = entry.deltas
  const net = (d?.available ?? 0) + (d?.pending ?? 0) + (d?.reserved ?? 0)
  if (net > 0) return "in"
  if (net < 0) return "out"
  return "neutral"
}

/** Signed amount for display, e.g. "+120", "−2,500", "2,500". */
export function signedAmount(entry: CowryLedgerEntry): string {
  const direction = entryDirection(entry)
  const value = formatCowries(entry.amount)
  if (direction === "in") return `+${value}`
  if (direction === "out") return `−${value}`
  return value
}

/**
 * The line shown under a transaction.
 *
 * Prefers the note the backend wrote, because that is where a clawback explains itself —
 * a deduction with no explanation is the thing this exists to prevent.
 */
export function entryDescription(entry: CowryLedgerEntry): string {
  if (entry.note) return entry.note
  if (entry.type === "reserve") return "Held while your data request is processed"
  if (entry.type === "release") return "Your data request did not go through"
  return TRANSACTION_LABELS[entry.type] ?? "Movement"
}

/** Available plus pending. Reserved is excluded: it is committed elsewhere. */
export function bucketTotal(bucket: CowryBucket | null | undefined): number {
  return (bucket?.available ?? 0) + (bucket?.pending ?? 0)
}

/** Everything spendable right now across all three balances. */
export function spendableTotal(wallet: CowryWallet | null | undefined): number {
  if (!wallet) return 0
  return (
    (wallet.reward?.available ?? 0) +
    (wallet.purchased?.available ?? 0) +
    (wallet.creator?.available ?? 0)
  )
}

/** Cowries that can go toward mobile data: reward and creator, not purchased. */
export function redeemableTotal(wallet: CowryWallet | null | undefined): number {
  if (!wallet) return 0
  return (wallet.reward?.available ?? 0) + (wallet.creator?.available ?? 0)
}

/**
 * Has this account done anything yet?
 *
 * A new account opens with a signup bonus and nothing else, and the cheapest package costs
 * far more than it, so the wallet has to read as "keep going" rather than as broken. This
 * is what decides which of the two the screen shows.
 */
export function isOpeningState(wallet: CowryWallet | null | undefined): boolean {
  if (!wallet) return true
  const moved =
    bucketTotal(wallet.reward) + bucketTotal(wallet.purchased) + bucketTotal(wallet.creator)
  return (wallet.lifetimeEarned ?? 0) <= moved && redeemableTotal(wallet) < CHEAPEST_PACKAGE_COWRIES
}

/** How far off the cheapest reward the account is. Zero once it is within reach. */
export function cowriesToFirstReward(wallet: CowryWallet | null | undefined): number {
  return Math.max(0, CHEAPEST_PACKAGE_COWRIES - redeemableTotal(wallet))
}

/**
 * What the band entitles this account to, in a sentence.
 *
 * The score itself never reaches the client, so this is the only explanation the user
 * gets — it has to be useful without naming a number they could work backwards from.
 */
export function allowanceSummary(wallet: CowryWallet | null | undefined): string {
  if (!wallet) return ""
  if (!wallet.canRedeem) return "Redeeming is unavailable on this account right now."
  const { perMonth, maxGbPerMonth } = wallet.limits ?? { perMonth: 0, maxGbPerMonth: 0 }
  return `You can claim up to ${perMonth} data reward${perMonth === 1 ? "" : "s"} a month, to a maximum of ${maxGbPerMonth} GB.`
}

/** Badge styling per band, matching the palette the rest of the app uses. */
export const TRUST_BAND_STYLES: Record<CowryTrustBand, string> = {
  blocked: "bg-[#ffe0dd] text-[#b4372c]",
  limited: "bg-[#ffe9d6] text-[#d97a2b]",
  standard: "bg-[#e2f7e8] text-[#1f9c4c]",
  high: "bg-[#e0f2ff] text-[#0d8de0]",
}

export const TRUST_BAND_LABELS: Record<CowryTrustBand, string> = {
  blocked: "Restricted",
  limited: "Getting started",
  standard: "Full access",
  high: "Full access",
}

/**
 * Nigerian mobile number, local or +234. Mirrors the backend's PHONE_PATTERN so the
 * Continue button and the server agree on what is valid.
 */
export function isValidNigerianMobile(value: string): boolean {
  const digits = String(value || "").replace(/[\s\-()]/g, "")
  return /^(?:\+?234|0)[789]\d{9}$/.test(digits)
}

/**
 * What to tell someone whose redemption was refused.
 *
 * Deliberately vague about trust: naming the score, or even implying there is one, tells
 * a farmer exactly what to work on.
 */
export const REDEEM_REFUSAL_MESSAGES: Record<string, string> = {
  trust_too_low: "Redeeming isn't available on this account at the moment.",
  daily_limit_reached: "You've already claimed a data reward today. Try again tomorrow.",
  monthly_limit_reached: "You've used all your data rewards for this month.",
  monthly_data_cap_reached: "This package would take you over your data allowance for the month.",
  insufficient_cowries: "You don't have enough Cowries for this package yet.",
  unknown_package: "That package isn't available any more.",
  invalid_phone: "That doesn't look like a Nigerian mobile number.",
  phone_in_use: "That number is already receiving data on another account.",
  not_eligible: "We couldn't complete this request.",
}

/** What to tell someone whose purchase could not be started. */
export const PURCHASE_REFUSAL_MESSAGES: Record<string, string> = {
  unknown_package: "That package isn't available any more.",
  not_purchasable: "That package can't be bought right now.",
  provider_error: "We couldn't reach the payment service. Nothing has been charged.",
}

/**
 * Naira, formatted the way a price should be read.
 *
 * Whole naira only: kobo on a price nobody quotes in kobo reads as a rounding error.
 */
export function formatNaira(amount: number | null | undefined): string {
  return `\u20a6${Math.round(amount ?? 0).toLocaleString("en-US")}`
}

/**
 * What a full round trip returns, given both fee rates.
 *
 * Shown on the buy screen on purpose. Someone who discovers the second fee at withdrawal
 * reads it as a trick; someone told before they pay has been treated fairly.
 */
export function roundTripValue(
  naira: number,
  depositFeeRate: number,
  withdrawalFeeRate: number,
): number {
  return naira * (1 - (depositFeeRate ?? 0)) * (1 - (withdrawalFeeRate ?? 0))
}

/**
 * What to tell someone whose gift was refused.
 *
 * The same-device case is worded as a limitation rather than an accusation: a shared
 * family phone is a real reason to hit it, and calling an honest user a cheat is worse
 * than losing the gift.
 */
export const GIFT_REFUSAL_MESSAGES: Record<string, string> = {
  unknown_gift: "That gift isn't available any more.",
  self_gift: "You can't send a gift to yourself.",
  same_device: "Gifts can't be sent between accounts that share a device.",
  insufficient_cowries: "You don't have enough bought Cowries for this gift yet.",
  recipient_suspended: "This account can't receive gifts at the moment.",
}

export const GIFT_SET_LABELS: Record<string, string> = {
  everyday: "Everyday",
  warm: "Warm",
  bold: "Bold",
  rare: "Rare",
  legendary: "Legendary",
}

/** What to tell someone whose withdrawal was refused. */
export const WITHDRAWAL_REFUSAL_MESSAGES: Record<string, string> = {
  cowry_rate_not_set: "Cashing out isn't available yet. You can still spend your Cowries here.",
  below_minimum: "That's below the smallest amount we can send to a bank.",
  insufficient_cowries: "You don't have that many bought Cowries.",
  trust_too_low: "Cashing out isn't available on this account at the moment.",
  daily_limit_reached: "You've already made a withdrawal today. Try again tomorrow.",
  invalid_destination: "Check the account number and bank.",
  wallet_not_withdrawable: "Only bought Cowries can be cashed out.",
}

/**
 * Nigerian banks and their codes, for the destination picker.
 *
 * PLACEHOLDER. The payment provider publishes an authoritative bank list, and this must be
 * replaced by a call to it before launch: a wrong code sends someone's money to the wrong
 * bank, which is a worse failure than not offering the picker at all. Kept here so the
 * screen is complete and reviewable, not because these are verified.
 */
export const NIGERIAN_BANKS: Array<{ code: string; name: string }> = [
  { code: "044", name: "Access Bank" },
  { code: "023", name: "Citibank" },
  { code: "050", name: "Ecobank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
]

/** A Nigerian account number is ten digits. The provider validates it properly. */
export function isValidAccountNumber(value: string): boolean {
  return /^\d{10}$/.test(String(value || "").trim())
}
