import { createContext, useContext, type CSSProperties } from "react"

/**
 * Shared plumbing for the Treasure scenes (SceneParts.tsx, treasureScenes.tsx).
 *
 * Kept apart from the components so React's fast refresh is left alone.
 */

/** Inline styles, with room for the CSS custom properties the scene keyframes read. */
export type SceneStyle = CSSProperties & Record<`--${string}`, string | number>

/**
 * A repeatable scatter of random numbers. The same scene lays out the same way every time,
 * and render stays pure — nothing calls Math.random.
 */
export function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function scatter<T>(count: number, seed: number, make: (random: () => number, index: number) => T): T[] {
  const random = seeded(seed)
  return Array.from({ length: count }, (_, index) => make(random, index))
}

/** A value between two bounds, from a 0..1 random. */
export const between = (random: () => number, [low, high]: readonly [number, number]) => low + random() * (high - low)

/**
 * Whether the scene is held as one still frame (reduced motion). Every part reads it, so a
 * scene is written once and each part decides for itself how it looks standing still.
 */
export const SceneStill = createContext(false)

export const useStill = () => useContext(SceneStill)

/** An animation class, or nothing when the scene is held still. */
export const moving = (still: boolean, className: string) => (still ? "" : className)
