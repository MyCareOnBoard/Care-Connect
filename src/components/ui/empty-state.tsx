import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The one look for "nothing here yet": a dashed card, an icon, a line saying what is
 * missing, an optional line on why or what to do, and an optional action.
 */
export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-[#d7dde3] bg-white/60 px-6 py-10 text-center",
        className,
      )}
    >
      {icon && <div className="mx-auto flex justify-center">{icon}</div>}
      <p className={cn("text-sm font-semibold text-[#141922]", icon && "mt-4")}>{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-sm text-[#657080]">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
