import { useEffect } from "react"
import type { GiftLike } from "@/components/cowry/giftIcons"
import { celebrateInColors } from "@/components/cowry/celebrate"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"
import { Hero } from "@/components/cowry/moments/scene/SceneParts"
import { SceneStill } from "@/components/cowry/moments/scene/sceneKit"
import type { TreasureScene } from "@/components/cowry/moments/scene/treasureScenes"

/**
 * A Treasure arriving as a scene of its own (treasureScenes.tsx): what is behind it, the
 * treasure itself, what is in front, and confetti in its colours at the high point.
 *
 * In FullScreenMoment like every big arrival, so it is skippable with a tap or Esc, carries
 * the "Congratulations" caption, and holds one still frame under reduced motion.
 */

export const SCENE_MS = 5200

export function TreasureSceneMoment({ scene, gift, label, onDone }: { scene: TreasureScene; gift: GiftLike; label: string; onDone: () => void }) {
  useEffect(() => {
    if (scene.burstAt == null) return
    const burst = window.setTimeout(() => celebrateInColors(scene.colors, { x: 0.5, y: 0.5 }, 100), scene.burstAt)
    return () => window.clearTimeout(burst)
  }, [scene])

  return (
    <FullScreenMoment durationMs={SCENE_MS} sound={scene.sound} label={label} onDone={onDone}>
      {(still) => (
        <SceneStill.Provider value={still}>
          {scene.back()}
          <Hero gift={gift} {...scene.hero} />
          {scene.front?.()}
        </SceneStill.Provider>
      )}
    </FullScreenMoment>
  )
}
