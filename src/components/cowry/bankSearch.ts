/** Words left out of a short form: United Bank for Africa is UBA, not UBFA. */
const SMALL_WORDS = new Set(["for", "of", "the", "and", "&"])

function words(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9&\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Whether a bank answers to what was typed.
 *
 * Every typed word has to start a word of the name, in any order — "trust guaranty" finds
 * Guaranty Trust Bank, and "nith" does not find Zenith. A single typed word may also be the
 * short form people actually say: GTB, UBA, FCMB.
 */
export function bankMatches(name: string, query: string) {
  const typed = words(query)
  if (typed.length === 0) return true
  const nameWords = words(name)
  if (typed.every((word) => nameWords.some((part) => part.startsWith(word)))) return true
  if (typed.length === 1 && typed[0].length >= 2) {
    const initials = nameWords.map((part) => part[0]).join("")
    const shortForm = nameWords.filter((part) => !SMALL_WORDS.has(part)).map((part) => part[0]).join("")
    return initials.startsWith(typed[0]) || shortForm.startsWith(typed[0])
  }
  return false
}
