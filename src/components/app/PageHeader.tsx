import type { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#dfe4ea] px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal text-[#141922]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#657080]">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}
