import { describe, expect, it } from "vitest"
import { congratulationsFor } from "@/components/cowry/moments/captionContext"

describe("legendary arrival caption", () => {
  it("names the amount the treasure cost", () => {
    expect(congratulationsFor(100000, "Golden Lion King")).toEqual({
      title: "Congratulations on the 100,000 Treasure",
      subtitle: "Golden Lion King",
    })
    expect(congratulationsFor(10000).title).toBe("Congratulations on the 10,000 Treasure")
  })

  it("still congratulates when the amount is unknown", () => {
    expect(congratulationsFor(0).title).toBe("Congratulations on your Treasure")
    expect(congratulationsFor(null).title).toBe("Congratulations on your Treasure")
  })
})
