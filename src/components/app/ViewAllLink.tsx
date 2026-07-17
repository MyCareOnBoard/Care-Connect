import { ChevronRight } from "lucide-react"
import { Link } from "react-router"
import { cn } from "@/lib/utils"

const baseClassName =
  "group mt-4 flex w-full items-center justify-between px-1 text-sm font-semibold text-[#087fff] transition-colors hover:text-[#0665cc]"

function Contents() {
  return (
    <>
      <span className="transition-transform duration-200 group-hover:translate-x-0.5">View all</span>
      <ChevronRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
    </>
  )
}

export function ViewAllLink({ href, onClick }: { href?: string; onClick?: () => void }) {
  if (href) {
    return (
      <Link to={href} className={baseClassName}>
        <Contents />
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={cn(baseClassName, onClick && "cursor-pointer")}>
      <Contents />
    </button>
  )
}
