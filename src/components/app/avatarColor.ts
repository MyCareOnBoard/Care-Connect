/**
 * An avatar colour that belongs to a person, not to a position.
 *
 * The feed used to colour avatars by their index in the list, so the same author came out
 * teal in one post and orange two posts down — which reads as two different people. Hashing
 * the id means someone keeps their colour everywhere they appear.
 */

const AVATAR_PALETTE = [
  "bg-[#00b4b8]",
  "bg-[#ffa33d]",
  "bg-[#a782d8]",
  "bg-[#d193ce]",
  "bg-[#e0a93a]",
  "bg-[#33b6a6]",
  "bg-[#5a8dee]",
  "bg-[#ef7a6b]",
]

export function avatarColor(seed: string | null | undefined): string {
  const text = seed || "?"
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}
