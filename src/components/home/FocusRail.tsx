import { useEffect, useState, type ReactNode } from "react"
import { X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * A side column, folded into a slim strip of icons.
 *
 * Focus mode used to remove the side columns outright — good for reading, bad for the job
 * matches and suggestions that live there, which is where most new connections and
 * applications start. The strip keeps each section one click away: its icon opens the real
 * section in a panel beside the strip, and small badges say when there is something to see.
 *
 * It sits in the same grid cell as the column it replaces and is sticky in the same way,
 * so it follows you down the feed. It hugs the feed's edge rather than the screen's, which
 * keeps it within easy reach of where your eyes already are.
 */

export interface RailItem {
  key: string
  label: string
  /** The icon. A node rather than a component, so a section can draw its own (a ring, say). */
  icon: ReactNode
  /** A count, or `true` for a plain dot. Hidden when falsy. */
  badge?: number | boolean
  /** The section itself, as it appears in the full column. */
  content: ReactNode
}

interface FocusRailProps {
  side: "left" | "right"
  items: RailItem[]
  /** Whether focus mode is on. The strip is hidden, and out of the tab order, otherwise. */
  active: boolean
}

export function FocusRail({ side, items, active }: FocusRailProps) {
  const [open, setOpen] = useState<string | null>(null)

  // Leaving focus mode takes the strip away; an open panel must not be left floating.
  useEffect(() => {
    if (!active) setOpen(null)
  }, [active])

  if (items.length === 0) return null

  return (
    <nav
      aria-label={side === "left" ? "Your profile and jobs" : "Suggestions"}
      inert={!active || undefined}
      className={cn(
        "hidden self-start lg:sticky lg:top-22 lg:row-start-1 lg:flex",
        side === "left" ? "lg:col-start-1 lg:justify-self-end" : "lg:col-start-3 lg:justify-self-start",
        // Arrives a beat after the columns have moved, from the side it came from.
        "transition-[opacity,translate,visibility] duration-500 ease-in-out motion-reduce:transition-none",
        active
          ? "visible translate-x-0 opacity-100 delay-200"
          : cn("pointer-events-none invisible opacity-0", side === "left" ? "translate-x-4" : "-translate-x-4"),
      )}
    >
      <ul className="flex flex-col gap-1.5 rounded-full border border-white/70 bg-white/85 p-1.5 shadow-[0_10px_30px_-14px_rgba(16,20,26,0.35)] backdrop-blur-md">
        {items.map((item, index) => {
          const isOpen = open === item.key
          return (
            <li key={item.key} className="animate-fade-in-up" style={{ animationDelay: `${200 + index * 60}ms` }}>
              <Popover open={isOpen} onOpenChange={(next) => setOpen(next ? item.key : null)}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={item.label}
                    className={cn(
                      "group relative flex size-11 items-center justify-center rounded-full transition-all duration-200 active:scale-90 cursor-pointer",
                      isOpen
                        ? "bg-[#00b4b8] text-white shadow-[0_6px_16px_-6px_rgba(0,180,184,0.7)]"
                        : "text-[#4a5260] hover:bg-[#e3f8f8] hover:text-[#00898c]",
                    )}
                  >
                    <span className="transition-transform duration-200 group-hover:scale-110">{item.icon}</span>

                    {item.badge ? (
                      <span
                        className={cn(
                          "absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[#ff3e66] px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white",
                          item.badge === true && "size-2.5 min-w-0 p-0",
                        )}
                        aria-hidden="true"
                      >
                        {item.badge === true ? null : item.badge > 9 ? "9+" : item.badge}
                      </span>
                    ) : null}

                    {/* The name, sliding out on hover — the icon alone is not always enough. */}
                    {!isOpen && (
                      <span
                        className={cn(
                          "pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[#10141a] px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100 group-focus-visible:opacity-100",
                          side === "right"
                            ? "left-full ml-3 -translate-x-1 group-hover:translate-x-0"
                            : "right-full mr-3 translate-x-1 group-hover:translate-x-0",
                        )}
                      >
                        {item.label}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  side={side === "left" ? "right" : "left"}
                  align="start"
                  sideOffset={14}
                  collisionPadding={16}
                  className="animate-fadeIn w-85 max-h-[min(70vh,560px)] overflow-y-auto rounded-2xl border-white/70 bg-[#f5f8fa] p-4 shadow-[0_24px_60px_-20px_rgba(16,20,26,0.45)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a94a3]">{item.label}</p>
                    <button
                      type="button"
                      onClick={() => setOpen(null)}
                      aria-label="Close"
                      className="flex size-7 items-center justify-center rounded-full text-[#657080] transition hover:bg-white"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  {item.content}
                </PopoverContent>
              </Popover>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
