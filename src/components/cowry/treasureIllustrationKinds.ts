/** Every everyday Treasure with a drawing of its own (treasureIllustrations.tsx). */
export const ILLUSTRATION_KINDS = [
  // Wellness & Emotion
  "new-dawn", "strong-root", "calm-water", "open-hand", "family-basket", "light-within", "safe-harbour",
  // Heritage
  "talking-drum", "calabash", "heritage-basket", "village-lantern", "story-fire", "ancestral-pattern", "golden-stool",
  // Food & Table
  "shared-bowl", "jollof-table", "morning-akara", "family-pot", "harvest-basket", "spice-trail", "tea-circle",
  // Achievement
  "barefoot-victory", "first-flight", "breakthrough", "golden-mile", "open-door", "legacy",
  // Nature
  "baobab", "golden-sunset", "first-rain", "rising-moon", "golden-savannah", "ocean-breeze",
  // Music & Expression
  "rhythm", "dancing-shadow", "voice", "painters-sun", "storyteller",
  // Human Connection
  "thank-you", "friendship-thread", "warm-embrace", "helping-hand", "welcome",
] as const

export type IllustrationKind = (typeof ILLUSTRATION_KINDS)[number]

export function isIllustration(kind: string): kind is IllustrationKind {
  return (ILLUSTRATION_KINDS as readonly string[]).includes(kind)
}
