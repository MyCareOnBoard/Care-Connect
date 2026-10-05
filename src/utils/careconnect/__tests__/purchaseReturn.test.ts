import { describe, it, expect } from "vitest"
import { purchaseIdFromReturn, purchaseReturnSource } from "@/utils/careconnect/purchaseReturn"

/**
 * Which purchase a provider has sent the buyer back for.
 *
 * This file exists because of a real redirect that did nothing. Flutterwave returned the
 * buyer to the buy screen with `?status=successful&tx_ref=…&transaction_id=…`, the screen
 * read only `purchase`, and so a payment that had actually gone through sat there with
 * nothing happening and no error to explain it.
 */

const params = (query: string) => new URLSearchParams(query)

describe("purchaseIdFromReturn", () => {
  it("prefers our own parameter, which the server puts on the return URL", () => {
    expect(purchaseIdFromReturn(params("purchase=abc123"))).toBe("abc123")
  })

  it("reads the Flutterwave redirect that did nothing", () => {
    // The exact shape from the live sandbox payment.
    const real = "status=successful&tx_ref=ax82aSOyqQ5zD6acPAOH&transaction_id=10531599"
    expect(purchaseIdFromReturn(params(real))).toBe("ax82aSOyqQ5zD6acPAOH")
  })

  it("takes ours when both are present, since the provider's is only a fallback", () => {
    expect(purchaseIdFromReturn(params("purchase=ours&tx_ref=theirs"))).toBe("ours")
  })

  it("reads the names other providers use", () => {
    expect(purchaseIdFromReturn(params("reference=ref1"))).toBe("ref1")
    expect(purchaseIdFromReturn(params("trxref=ref2"))).toBe("ref2")
  })

  it("ignores the provider's own status, which is only a query string", () => {
    /*
     * status=successful is right there and tempting to branch on, but a query string is
     * whatever the browser was handed. The screen settles and lets the server ask the
     * provider directly; a cancelled payment settles to a refusal, which is correct.
     */
    expect(purchaseIdFromReturn(params("status=cancelled&tx_ref=abc"))).toBe("abc")
    expect(purchaseIdFromReturn(params("status=successful"))).toBeNull()
  })

  it("answers null when there is nothing to settle", () => {
    expect(purchaseIdFromReturn(params(""))).toBeNull()
    expect(purchaseIdFromReturn(params("other=1"))).toBeNull()
  })

  it("ignores an empty or blank value rather than settling nothing", () => {
    expect(purchaseIdFromReturn(params("purchase=&tx_ref=abc"))).toBe("abc")
    expect(purchaseIdFromReturn(params("purchase=%20%20"))).toBeNull()
  })

  it("trims a value, since a stray space would not match any purchase", () => {
    expect(purchaseIdFromReturn(params("purchase=%20abc%20"))).toBe("abc")
  })
})

describe("purchaseReturnSource", () => {
  it("names which parameter was used, for when a purchase will not settle", () => {
    expect(purchaseReturnSource(params("tx_ref=abc"))).toBe("tx_ref")
    expect(purchaseReturnSource(params("purchase=abc&tx_ref=x"))).toBe("purchase")
    expect(purchaseReturnSource(params(""))).toBeNull()
  })
})
