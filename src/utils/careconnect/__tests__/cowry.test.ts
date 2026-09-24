import { describe, it, expect } from "vitest"
import {
  CHEAPEST_PACKAGE_COWRIES,
  REDEEM_REFUSAL_MESSAGES,
  PURCHASE_REFUSAL_MESSAGES,
  GIFT_REFUSAL_MESSAGES,
  WITHDRAWAL_REFUSAL_MESSAGES,
  NIGERIAN_BANKS,
  isValidAccountNumber,
  GIFT_SET_LABELS,
  formatNaira,
  roundTripValue,
  isValidNigerianMobile,
  allowanceSummary,
  bucketTotal,
  cowriesToFirstReward,
  entryDescription,
  entryDirection,
  formatCowries,
  isOpeningState,
  redeemableTotal,
  signedAmount,
  spendableTotal,
} from "@/utils/careconnect/cowry"
import type {
  CowryLedgerEntry,
  CowryWallet,
} from "@/utils/careconnect/services/cowryService"

/**
 * These cover the two things the wallet screen can get wrong in ways a user would notice:
 * showing a movement with the wrong sign, and telling a brand-new account it has nothing
 * when what it actually has is a start.
 */

const bucket = (available = 0, pending = 0, reserved = 0) => ({ available, pending, reserved })

function wallet(overrides: Partial<CowryWallet> = {}): CowryWallet {
  return {
    userId: "u1",
    reward: bucket(),
    purchased: bucket(),
    creator: bucket(),
    lifetimeEarned: 0,
    trustBand: "limited",
    canRedeem: true,
    limits: { perDay: 1, perMonth: 2, maxGbPerMonth: 2 },
    ...overrides,
  }
}

function entry(overrides: Partial<CowryLedgerEntry> = {}): CowryLedgerEntry {
  return {
    id: "t1",
    userId: "u1",
    walletType: "reward",
    type: "earn",
    amount: 100,
    deltas: { available: 100, pending: 0, reserved: 0 },
    status: "available",
    ...overrides,
  }
}

describe("formatCowries", () => {
  it("groups thousands and never shows a fraction", () => {
    expect(formatCowries(2500)).toBe("2,500")
    expect(formatCowries(10000)).toBe("10,000")
    expect(formatCowries(17.9)).toBe("17")
  })

  it("treats a missing balance as zero rather than rendering NaN", () => {
    expect(formatCowries(null)).toBe("0")
    expect(formatCowries(undefined)).toBe("0")
  })
})

describe("entryDirection", () => {
  it("reads an earn as in and a redemption as out", () => {
    expect(entryDirection(entry())).toBe("in")
    expect(
      entryDirection(entry({ type: "redeem", deltas: { available: -2500, pending: 0, reserved: 0 } })),
    ).toBe("out")
  })

  it("calls a reservation neutral, because the total has not changed", () => {
    const reserved = entry({
      type: "reserve",
      deltas: { available: -2500, pending: 0, reserved: 2500 },
    })
    expect(entryDirection(reserved)).toBe("neutral")
    // Showing this as a loss would make an in-flight redemption look already spent.
    expect(signedAmount(reserved)).toBe("100")
  })

  it("reads a pending release as neutral too", () => {
    expect(
      entryDirection(entry({ deltas: { available: 100, pending: -100, reserved: 0 } })),
    ).toBe("neutral")
  })
})

describe("signedAmount", () => {
  it("signs in and out, using a real minus sign", () => {
    expect(signedAmount(entry())).toBe("+100")
    expect(
      signedAmount(entry({ amount: 2500, deltas: { available: -2500, pending: 0, reserved: 0 } })),
    ).toBe("−2,500")
  })
})

describe("entryDescription", () => {
  it("prefers the note, which is where a clawback explains itself", () => {
    const clawback = entry({
      type: "reverse",
      note: "Data arrived late — Cowries taken back",
      deltas: { available: -2500, pending: 0, reserved: 0 },
    })
    expect(entryDescription(clawback)).toBe("Data arrived late — Cowries taken back")
  })

  it("falls back to something meaningful when there is no note", () => {
    expect(entryDescription(entry({ type: "reserve", note: null }))).toMatch(/processed/)
    expect(entryDescription(entry({ type: "release", note: null }))).toMatch(/did not go through/)
    expect(entryDescription(entry({ type: "earn", note: null }))).toBe("Earned")
  })
})

describe("totals", () => {
  it("counts available plus pending, but not reserved", () => {
    expect(bucketTotal(bucket(100, 50, 25))).toBe(150)
  })

  it("adds spendable across all three balances", () => {
    const w = wallet({ reward: bucket(100), purchased: bucket(40), creator: bucket(10) })
    expect(spendableTotal(w)).toBe(150)
  })

  it("excludes purchased Cowries from what can go toward data", () => {
    const w = wallet({ reward: bucket(100), purchased: bucket(9999), creator: bucket(10) })
    expect(redeemableTotal(w)).toBe(110)
  })

  it("survives a null wallet", () => {
    expect(spendableTotal(null)).toBe(0)
    expect(redeemableTotal(undefined)).toBe(0)
  })
})

describe("opening state", () => {
  it("treats a fresh account as opening, not as broken", () => {
    const w = wallet({ reward: bucket(50), lifetimeEarned: 50 })
    expect(isOpeningState(w)).toBe(true)
    // The signup bonus is nowhere near the cheapest package, which is exactly why the
    // screen has to show progress rather than an empty balance.
    expect(cowriesToFirstReward(w)).toBe(CHEAPEST_PACKAGE_COWRIES - 50)
  })

  it("stops being an opening state once a reward is within reach", () => {
    const w = wallet({ reward: bucket(CHEAPEST_PACKAGE_COWRIES), lifetimeEarned: 1500 })
    expect(isOpeningState(w)).toBe(false)
    expect(cowriesToFirstReward(w)).toBe(0)
  })

  it("never reports a negative shortfall", () => {
    expect(cowriesToFirstReward(wallet({ reward: bucket(99999) }))).toBe(0)
  })
})

describe("allowanceSummary", () => {
  it("explains the limit without naming the score behind it", () => {
    const text = allowanceSummary(wallet())
    expect(text).toMatch(/2 data rewards a month/)
    expect(text).toMatch(/2 GB/)
    // The risk score must never surface, directly or by arithmetic.
    expect(text).not.toMatch(/score|60|trust/i)
  })

  it("says so plainly when the account cannot redeem", () => {
    expect(allowanceSummary(wallet({ canRedeem: false }))).toMatch(/unavailable/i)
  })

  it("gets the singular right", () => {
    const w = wallet({ limits: { perDay: 1, perMonth: 1, maxGbPerMonth: 1 } })
    expect(allowanceSummary(w)).toMatch(/1 data reward a month/)
  })
})

describe("isValidNigerianMobile", () => {
  it("accepts the forms people actually type", () => {
    for (const input of ["08012345678", "+2348012345678", "2348012345678", "0801 234 5678", "0901-234-5678"]) {
      expect(isValidNigerianMobile(input)).toBe(true)
    }
  })

  it("rejects what the server would reject, so Continue and the API agree", () => {
    for (const input of ["", "12345", "0601234567", "080123456789", "abcdefghijk"]) {
      expect(isValidNigerianMobile(input)).toBe(false)
    }
  })
})

describe("REDEEM_REFUSAL_MESSAGES", () => {
  it("has copy for every refusal the server can send", () => {
    const fromServer = [
      "trust_too_low",
      "daily_limit_reached",
      "monthly_limit_reached",
      "monthly_data_cap_reached",
      "insufficient_cowries",
      "unknown_package",
      "invalid_phone",
      "phone_in_use",
    ]
    for (const reason of fromServer) {
      expect(REDEEM_REFUSAL_MESSAGES[reason], reason).toBeTruthy()
    }
    // Fallback, for a reason added server-side before the copy lands here.
    expect(REDEEM_REFUSAL_MESSAGES.not_eligible).toBeTruthy()
  })

  it("never hints at the trust score, even when trust is the reason", () => {
    const text = REDEEM_REFUSAL_MESSAGES.trust_too_low
    expect(text).not.toMatch(/score|trust|risk|\d/i)
  })
})

describe("formatNaira", () => {
  it("shows whole naira with the symbol", () => {
    expect(formatNaira(2500)).toBe("\u20a62,500")
    expect(formatNaira(1000000)).toBe("\u20a61,000,000")
  })

  it("rounds rather than showing kobo nobody quotes", () => {
    expect(formatNaira(764.9999)).toBe("\u20a6765")
  })

  it("treats a missing amount as zero", () => {
    expect(formatNaira(null)).toBe("\u20a60")
    expect(formatNaira(undefined)).toBe("\u20a60")
  })
})

describe("roundTripValue", () => {
  it("compounds both fees, which is the number the buy screen discloses", () => {
    // 1,000 in, 10% on the way in, 15% on the way out.
    expect(roundTripValue(1000, 0.1, 0.15)).toBeCloseTo(765, 5)
  })

  it("returns the whole amount when there are no fees", () => {
    expect(roundTripValue(1000, 0, 0)).toBe(1000)
  })

  it("survives missing rates rather than producing NaN", () => {
    expect(roundTripValue(1000, undefined as unknown as number, 0.15)).toBeCloseTo(850, 5)
  })
})

describe("PURCHASE_REFUSAL_MESSAGES", () => {
  it("has copy for every refusal the server can send", () => {
    for (const reason of ["unknown_package", "not_purchasable", "provider_error"]) {
      expect(PURCHASE_REFUSAL_MESSAGES[reason], reason).toBeTruthy()
    }
  })

  it("says plainly that nothing was charged when the provider could not be reached", () => {
    expect(PURCHASE_REFUSAL_MESSAGES.provider_error).toMatch(/nothing has been charged/i)
  })
})

describe("GIFT_REFUSAL_MESSAGES", () => {
  it("has copy for every refusal the server can send", () => {
    for (const reason of [
      "unknown_gift",
      "self_gift",
      "same_device",
      "insufficient_cowries",
      "recipient_suspended",
    ]) {
      expect(GIFT_REFUSAL_MESSAGES[reason], reason).toBeTruthy()
    }
  })

  it("words the same-device case as a limit, not an accusation", () => {
    // A shared family phone is a real reason to hit this. Calling an honest user a cheat
    // is worse than losing the gift.
    const text = GIFT_REFUSAL_MESSAGES.same_device
    expect(text).not.toMatch(/fraud|cheat|abuse|suspicious/i)
    expect(text).toMatch(/share a device/i)
  })

  it("names bought Cowries specifically when the balance is short", () => {
    // Earned Cowries cannot buy gifts, so "not enough Cowries" would be misleading to
    // someone with a full reward balance.
    expect(GIFT_REFUSAL_MESSAGES.insufficient_cowries).toMatch(/bought/i)
  })
})

describe("GIFT_SET_LABELS", () => {
  it("covers all five sets", () => {
    for (const set of ["everyday", "warm", "bold", "rare", "legendary"]) {
      expect(GIFT_SET_LABELS[set], set).toBeTruthy()
    }
  })
})

describe("isValidAccountNumber", () => {
  it("accepts exactly ten digits", () => {
    expect(isValidAccountNumber("0123456789")).toBe(true)
    expect(isValidAccountNumber("  0123456789  ")).toBe(true)
  })

  it("rejects anything else, matching the server's own rule", () => {
    for (const value of ["123", "01234567890", "01234abcde", "", "012 345 6789"]) {
      expect(isValidAccountNumber(value), value).toBe(false)
    }
  })
})

describe("WITHDRAWAL_REFUSAL_MESSAGES", () => {
  it("has copy for every refusal the server can send", () => {
    for (const reason of [
      "cowry_rate_not_set",
      "below_minimum",
      "insufficient_cowries",
      "trust_too_low",
      "daily_limit_reached",
      "invalid_destination",
      "wallet_not_withdrawable",
    ]) {
      expect(WITHDRAWAL_REFUSAL_MESSAGES[reason], reason).toBeTruthy()
    }
  })

  it("offers something to do when cashing out is not available yet", () => {
    // This is the live state, so the message has to be more than a dead end.
    expect(WITHDRAWAL_REFUSAL_MESSAGES.cowry_rate_not_set).toMatch(/spend your Cowries/i)
  })

  it("says bought specifically, since earned Cowries can never be cashed out", () => {
    expect(WITHDRAWAL_REFUSAL_MESSAGES.insufficient_cowries).toMatch(/bought/i)
    expect(WITHDRAWAL_REFUSAL_MESSAGES.wallet_not_withdrawable).toMatch(/bought/i)
  })
})

describe("NIGERIAN_BANKS", () => {
  it("has unique codes, since a duplicate would send money to the wrong bank", () => {
    const codes = NIGERIAN_BANKS.map((bank) => bank.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it("gives every entry a code and a name", () => {
    for (const bank of NIGERIAN_BANKS) {
      expect(bank.code, bank.name).toBeTruthy()
      expect(bank.name, bank.code).toBeTruthy()
    }
  })
})
