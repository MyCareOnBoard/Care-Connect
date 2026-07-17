import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function ViewAllLink({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group mt-4 flex w-full items-center justify-between px-1 text-sm font-semibold text-[#087fff] transition-colors hover:text-[#0665cc]",
        onClick && "cursor-pointer"
      )}
    >
      <span className="transition-transform duration-200 group-hover:translate-x-0.5">View all</span>
      <ChevronRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
    </button>
  )
}
