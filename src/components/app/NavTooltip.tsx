import type { ReactNode } from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

/**
 * The name under an icon-only nav button.
 *
 * Built on Radix directly rather than the shared tooltip, whose colours come from theme
 * tokens this app does not define. Portalled, so the header's own clipping cannot cut it
 * off; shown on keyboard focus as well as hover, so the icons are never a guessing game.
 */
export function NavTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={120} skipDelayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="bottom"
            sideOffset={8}
            className="animate-fadeIn z-50 rounded-full bg-[#10141a] px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
          >
            {label}
            <TooltipPrimitive.Arrow className="fill-[#10141a]" width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
