import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * A filter you switch on and off with one tap. One look on every page that filters a list —
 * Jobs, Marketplace, agency postings — so "on" means the same dark pill everywhere.
 */
export function FilterChip({
  active,
  count,
  children,
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  active: boolean
  /** Shown faded after the label, e.g. how many postings are open. */
  count?: number
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2",
        active
          ? "bg-[#10141a] text-white shadow-sm"
          : "bg-white text-[#4a5260] ring-1 ring-[#e2e6ea] hover:ring-[#c8cdd4]",
        className,
      )}
      {...props}
    >
      {children}
      {/* The space keeps label and count apart when read aloud ("Open 2", not "Open2"). */}
      {count !== undefined && (
        <>
          {" "}
          <span className="tabular-nums opacity-70">{count}</span>
        </>
      )}
    </button>
  )
}

/** A sideways-scrolling row of chips that bleeds to the screen edge on phones. */
export function FilterChipRow({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("scrollbar-hide -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1", className)}
    >
      {children}
    </div>
  )
}
