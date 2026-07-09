import type { ReactNode } from "react"

type ListCardProps = {
  title: string
  meta: string
  children: ReactNode
  action?: ReactNode
}

export function ListCard({ title, meta, children, action }: ListCardProps) {
  return (
    <article className="rounded-lg border border-[#dfe4ea] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#141922]">{title}</h2>
          <p className="mt-1 text-sm text-[#657080]">{meta}</p>
        </div>
        {action}
      </div>
      <div className="mt-4 text-sm leading-6 text-[#3c4654]">{children}</div>
    </article>
  )
}
