import { ChevronRight } from "lucide-react"
import { Link } from "react-router"

const className =
  "group mt-4 flex w-full items-center justify-between px-1 text-sm font-semibold text-[#087fff] transition-colors hover:text-[#0665cc]"

function Contents() {
  return (
    <>
      <span className="transition-transform duration-200 group-hover:translate-x-0.5">View all</span>
      <ChevronRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
    </>
  )
}

export function ViewAllLink({ href }: { href?: string }) {
  if (href) {
    return (
      <Link to={href} className={className}>
        <Contents />
      </Link>
    )
  }

  return (
    <button type="button" className={className}>
      <Contents />
    </button>
  )
}
