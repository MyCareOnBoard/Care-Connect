import { ChevronRight } from "lucide-react"

export function ViewAllLink() {
  return (
    <button
      type="button"
      className="group mt-4 flex w-full items-center justify-between px-1 text-sm font-semibold text-[#087fff] transition-colors hover:text-[#0665cc]"
    >
      <span className="transition-transform duration-200 group-hover:translate-x-0.5">View all</span>
      <ChevronRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
    </button>
  )
}
