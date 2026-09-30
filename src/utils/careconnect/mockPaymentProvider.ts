/**
 * Recognising the mock payment provider.
 *
 * The backend's mock answers a purchase with `https://mock-payments.invalid/pay/...`, and
 * `.invalid` is a reserved TLD that never resolves — deliberately, since there is no fake
 * checkout page to click through. The buy screen redirected to it anyway, so buying Cowries
 * dead-ended on a browser error and the return leg that credits them never ran. Getting a
 * purchased balance meant reading the purchase id out of the dead URL and editing the
 * address bar by hand.
 *
 * So the buy screen does not follow a URL that points here: it enters its own return leg
 * instead. Only the trip to the provider and back is skipped — the purchase record, the
 * provider's verify call, the ledger entry and the result screen stay the production path.
 *
 * Matching on the unreachable host rather than a build flag is what keeps this safe. A real
 * provider's URL cannot match, so the behaviour retires itself the moment one is
 * configured, with nobody having to remember to remove it.
 */

export const MOCK_PROVIDER_HOST = "mock-payments.invalid"

/**
 * Does this authorization URL point at the mock?
 *
 * The property that matters is the negative one: a real provider's URL must never match,
 * because a false positive would skip a genuine payment page and settle a purchase nobody
 * paid for. Hence a match on the full reserved host, not on the word "mock".
 */
export function isMockAuthorizationUrl(url: string | undefined | null): boolean {
  if (!url) return false
  try {
    return new URL(url).hostname === MOCK_PROVIDER_HOST
  } catch {
    // Not a URL at all, so not the mock's. The caller falls through to its normal path.
    return false
  }
}
