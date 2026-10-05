/**
 * Which purchase the provider has just sent the buyer back for.
 *
 * The buy screen asks for a return URL before the purchase exists, so the id cannot be in
 * the URL it supplies — the server adds `purchase` to it before handing it to the provider.
 * That is the parameter to read, and it is the same whoever took the money.
 *
 * The fallbacks are for the providers themselves. Every one appends its own reference under
 * its own name — Flutterwave uses `tx_ref`, others use `reference` or `trxref` — and our own
 * id is what we send as that reference, so any of them identifies the purchase. Reading them
 * means the screen still works if `purchase` is ever dropped in a redirect chain.
 *
 * Deliberately ignores the provider's own `status` parameter. Flutterwave puts
 * `status=successful` on the URL and it would be easy to branch on, but a query string is
 * whatever the browser was handed: anyone can type one. The screen asks the server to settle,
 * and the server asks the provider directly. A cancelled payment settles to a refusal, which
 * is the right outcome rather than something to pre-empt here.
 */
export function purchaseIdFromReturn(params: URLSearchParams): string | null {
  const candidates = ["purchase", "tx_ref", "reference", "trxref"]
  for (const name of candidates) {
    const value = params.get(name)?.trim()
    if (value) return value
  }
  return null
}

/** Which of them it came from, for a log line when a purchase will not settle. */
export function purchaseReturnSource(params: URLSearchParams): string | null {
  for (const name of ["purchase", "tx_ref", "reference", "trxref"]) {
    if (params.get(name)?.trim()) return name
  }
  return null
}
