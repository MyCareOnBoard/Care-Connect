import { Fragment, type ReactNode } from "react"
import { Link } from "react-router"
import { MENTION_TOKEN } from "@/components/profile/mentions"

/**
 * Post text with its hashtags, mentions and web links made tappable.
 *
 *   #hashtag       → the feed filtered to that tag
 *   @[Name](uid)   → that person's profile (see mentions.ts for the token)
 *   https://…      → opens in a new tab
 *
 * Everything else renders exactly as written, line breaks included.
 */

// One pass over the text for all three, in order of appearance.
const PATTERN = new RegExp(
  [
    MENTION_TOKEN.source, // groups 1–2: name, uid
    String.raw`(^|[^\p{L}\p{N}_&])#([\p{L}\p{N}_]{2,50})`, // groups 3–4: lead, tag
    String.raw`(https?:\/\/[^\s<]+[^\s<.,;:!?'")\]])`, // group 5: url
  ].join("|"),
  "gu",
)

interface PostTextProps {
  text: string
  /** Where a hashtag leads. Without it, hashtags are styled but not linked. */
  tagHref?: (tag: string) => string
  /** Where a mention leads. Without it, mentions are styled but not linked. */
  profileHref?: (uid: string) => string
  className?: string
}

export function PostText({ text, tagHref, profileHref, className }: PostTextProps) {
  const parts: ReactNode[] = []
  let last = 0

  for (const match of text.matchAll(PATTERN)) {
    const index = match.index ?? 0
    const [whole, mentionName, mentionUid, lead, tag, url] = match

    if (mentionName && mentionUid) {
      parts.push(text.slice(last, index))
      parts.push(
        profileHref ? (
          <Link key={index} to={profileHref(mentionUid)} className="font-semibold text-[#00898c] hover:underline">
            @{mentionName}
          </Link>
        ) : (
          <span key={index} className="font-semibold text-[#00898c]">@{mentionName}</span>
        ),
      )
    } else if (tag) {
      // The lead character belongs to the text before the tag.
      parts.push(text.slice(last, index) + (lead ?? ""))
      parts.push(
        tagHref ? (
          <Link key={index} to={tagHref(tag)} className="font-semibold text-[#0e5fc2] hover:underline">
            #{tag}
          </Link>
        ) : (
          <span key={index} className="font-semibold text-[#0e5fc2]">#{tag}</span>
        ),
      )
    } else if (url) {
      parts.push(text.slice(last, index))
      parts.push(
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="break-all text-[#0e5fc2] underline-offset-2 hover:underline"
        >
          {url.replace(/^https?:\/\//, "")}
        </a>,
      )
    } else {
      continue
    }
    last = index + whole.length
  }
  parts.push(text.slice(last))

  return (
    <p className={className ?? "whitespace-pre-line"}>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </p>
  )
}
