import { describe, it, expect } from "vitest"
import { isMockAuthorizationUrl, MOCK_PROVIDER_HOST } from "@/utils/careconnect/mockPaymentProvider"

/**
 * The predicate that decides whether the buy screen follows a provider's authorization URL.
 *
 * It exists because the mock provider answers with `https://mock-payments.invalid/...`, and
 * `.invalid` is a reserved TLD that never resolves — so the redirect dead-ended on a browser
 * error and the return leg that credits the Cowries never ran.
 *
 * The property that matters is the negative one: **a real provider's URL must never match.**
 * If it did, the app would skip a genuine payment page and settle a purchase nobody paid for.
 * That is why the test list below is mostly real-looking hosts.
 */

describe("isMockAuthorizationUrl", () => {
  it("recognises the mock provider", () => {
    expect(isMockAuthorizationUrl(`https://${MOCK_PROVIDER_HOST}/pay/mockpay_abc123`)).toBe(true)
    expect(
      isMockAuthorizationUrl(
        `https://${MOCK_PROVIDER_HOST}/pay/mockpay_abc?return=${encodeURIComponent("https://app/user/cowry/buy")}`,
      ),
    ).toBe(true)
  })

  it("NEVER matches a real payment provider", () => {
    // The dangerous direction. A false positive here would skip a real checkout page and
    // settle a purchase the user never paid for.
    for (const url of [
      "https://checkout.paystack.com/abc123",
      "https://checkout.flutterwave.com/v3/hosted/pay/abc",
      "https://api.paystack.co/transaction/initialize",
      "https://pay.example.com/mock-payments/abc",
      "https://mock-payments.example.com/pay/abc",
      "https://payments.invalid.example.com/pay",
    ]) {
      expect(isMockAuthorizationUrl(url)).toBe(false)
    }
  })

  it("treats a missing url as not-mock, so the normal path is taken", () => {
    expect(isMockAuthorizationUrl(undefined)).toBe(false)
    expect(isMockAuthorizationUrl("")).toBe(false)
  })

  it("stops applying on its own once a real provider is configured", () => {
    // No build flag to remember to remove: the condition is the unreachable host itself,
    // so configuring a real provider retires this behaviour without a code change.
    expect(MOCK_PROVIDER_HOST.endsWith(".invalid")).toBe(true)
  })
})
