import { createContext } from "react"
import { formatCowries } from "@/utils/careconnect/cowry"

/**
 * The words shown over a legendary arrival — "Congratulations on the 100,000 Gift" — handed
 * down from GiftSplash so every scene shows them without each one being wired up.
 */
export interface MomentCaptionValue {
  title: string
  /** The gift's name, smaller, beneath. */
  subtitle?: string
  /** What the Treasure means — "Celebration" — beneath its name, when it has one. */
  meaning?: string
}

export const MomentCaptionContext = createContext<MomentCaptionValue | null>(null)

export function congratulationsFor(
  cost: number | null | undefined,
  giftName?: string | null,
  meaning?: string | null,
): MomentCaptionValue {
  const amount = Math.trunc(cost ?? 0)
  return {
    title: amount > 0 ? `Congratulations on the ${formatCowries(amount)} Treasure` : "Congratulations on your Treasure",
    subtitle: giftName || undefined,
    meaning: meaning?.trim() || undefined,
  }
}
