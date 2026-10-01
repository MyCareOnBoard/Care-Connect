/**
 * Describing the creator hold in words.
 *
 * The admin screen sets it in minutes, because that is the only unit that lets someone drop
 * it to five on a test environment. But 43200 tells an operator nothing about what they are
 * changing, so the number is echoed back in words.
 *
 * The important case is a hold below the sweep interval. The release sweep runs every
 * fifteen minutes, so a five-minute hold does not release in five — it releases on the next
 * sweep. Someone who sets 5, waits six minutes and sees nothing will conclude the setting
 * is broken, so the screen says so before they do.
 */

/** How often the release sweep runs, in minutes. Mirrors the scheduled job. */
export const RELEASE_SWEEP_MINUTES = 15

/** The production default: thirty days. */
export const DEFAULT_CREATOR_HOLD_MINUTES = 43200

export function holdDescription(raw: string | number | undefined | null): string {
  // Trimmed and checked for emptiness before Number(), because Number("  ") is 0 — so a
  // field containing only spaces would otherwise read as "released on the next sweep",
  // which is both wrong and the most alarming thing it could say.
  if (raw === null || raw === undefined) return "Enter a number of minutes."
  if (typeof raw === "string" && raw.trim() === "") return "Enter a number of minutes."

  const minutes = Number(raw)
  if (!Number.isFinite(minutes) || minutes < 0) {
    return "Enter a number of minutes."
  }

  if (minutes === 0) {
    return `Released on the next sweep, so within ${RELEASE_SWEEP_MINUTES} minutes.`
  }

  if (minutes < RELEASE_SWEEP_MINUTES) {
    return `${minutes} minutes — but the sweep runs every ${RELEASE_SWEEP_MINUTES}, so effectively ${RELEASE_SWEEP_MINUTES}.`
  }

  if (minutes < 60) return `${minutes} minutes.`

  if (minutes < 1440) {
    const hours = minutes / 60
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hours.`
  }

  const days = minutes / 1440
  const label = Number.isInteger(days) ? `${days}` : days.toFixed(1)
  const suffix = minutes === DEFAULT_CREATOR_HOLD_MINUTES ? " — the production default." : "."
  return `${label} days${suffix}`
}
