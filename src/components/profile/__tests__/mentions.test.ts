import { describe, expect, it } from "vitest"
import { encodeMentions, hashtagsIn, mentionQueryAt, mentionedUids } from "@/components/profile/mentions"

describe("mentions", () => {
  it("turns picked names into tokens, and only picked ones", () => {
    const text = "Thanks @Ada Obi and @Tunde for today, and @someone else"
    const encoded = encodeMentions(text, [
      { uid: "u1", name: "Ada Obi" },
      { uid: "u2", name: "Tunde" },
    ])
    expect(encoded).toBe("Thanks @[Ada Obi](u1) and @[Tunde](u2) for today, and @someone else")
    expect(mentionedUids(encoded)).toEqual(["u1", "u2"])
  })

  it("prefers the longer name when one pick is the start of another", () => {
    const encoded = encodeMentions("Hi @Ada Obi", [
      { uid: "short", name: "Ada" },
      { uid: "long", name: "Ada Obi" },
    ])
    expect(encoded).toBe("Hi @[Ada Obi](long)")
  })

  it("finds the @word being typed at the caret", () => {
    const text = "Shout out to @Ad"
    expect(mentionQueryAt(text, text.length)).toEqual({ start: 13, query: "Ad" })
    // An email address is not a mention.
    expect(mentionQueryAt("mail me at a@b", 14)).toBeNull()
    // Nothing being typed after a finished word.
    expect(mentionQueryAt("no mention here", 15)).toBeNull()
  })

  it("collects hashtags, lower-cased, ignoring colours and anchors inside words", () => {
    expect(hashtagsIn("Great shift #NightShift #care_team and colour&#35; x#notatag")).toEqual([
      "nightshift",
      "care_team",
    ])
  })
})
