import type { LucideIcon } from "lucide-react"

type MetricCardProps = {
  icon: LucideIcon
  label: string
  value: string
  detail: string
}

export function MetricCard({ icon: Icon, label, value, detail }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-[#dfe4ea] bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <span className="flex size-11 items-center justify-center rounded-lg bg-[#eaf4ff] text-[#087fff]">
          <Icon className="size-5" />
        </span>
        <span className="rounded-full bg-[#eef7f1] px-3 py-1 text-xs font-semibold text-[#16834c]">{label}</span>
      </div>
      <p className="mt-5 text-3xl font-semibold text-[#141922]">{value}</p>
      <p className="mt-2 text-sm text-[#657080]">{detail}</p>
    </article>
  )
}
