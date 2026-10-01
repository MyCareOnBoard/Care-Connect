/**
 * @mentions inside post text.
 *
 * In the composer a mention reads naturally — "@Ada Obi" — and the composer remembers which
 * person each name was picked from. When the post is sent, each picked name becomes a
 * compact token that carries the person's id:
 *
 *     @[Ada Obi](uid123)
 *
 * so it can be rendered as a link to their profile, and (once the backend reads the same
 * token) turned into a notification. Only names chosen from the suggestions become tokens;
 * typing "@someone" by hand stays plain text.
 */

export const MENTION_TOKEN = /@\[([^\]\n]{1,80})\]\(([A-Za-z0-9_-]{1,128})\)/g

export interface MentionPick {
  uid: string
  name: string
}

/** Turn each "@Name" that was picked from suggestions into a token. */
export function encodeMentions(text: string, picks: MentionPick[]): string {
  let result = text
  // Longest names first, so "@Ada Obi" is not claimed by a pick named "Ada".
  for (const pick of [...picks].sort((a, b) => b.name.length - a.name.length)) {
    const escaped = pick.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    result = result.replace(new RegExp(`@${escaped}(?![\\w])`, "g"), `@[${pick.name}](${pick.uid})`)
  }
  return result
}

/** The ids of everyone mentioned in a piece of text. */
export function mentionedUids(text: string): string[] {
  return [...text.matchAll(MENTION_TOKEN)].map((match) => match[2])
}

/** The "@word" being typed just before the caret, if any: where it starts and what it says. */
export function mentionQueryAt(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret)
  const match = /(^|\s)@([\p{L}\p{N}_'-]{0,30}(?: [\p{L}\p{N}_'-]{0,30})?)$/u.exec(before)
  if (!match) return null
  return { start: caret - match[2].length - 1, query: match[2] }
}

/** The hashtags in a piece of text, lower-cased, without the #. */
export function hashtagsIn(text: string): string[] {
  return [...text.matchAll(/(^|[^\p{L}\p{N}_&])#([\p{L}\p{N}_]{2,50})/gu)].map((match) => match[2].toLowerCase())
}
