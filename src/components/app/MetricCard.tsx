import type { LucideIcon } from "lucide-react"

type MetricCardProps = {
  icon: LucideIcon
  label: string
  value: string
  detail: string
}

export function MetricCard({ icon: Icon, label, value, detail }: MetricCardProps) {
  return (
    <article className="group rounded-lg border border-white/60 bg-white/80 p-5 shadow-[0_4px_20px_rgba(16,20,26,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,20,26,0.1)]">
      <div className="flex items-center justify-between gap-4">
        <span className="flex size-11 items-center justify-center rounded-lg bg-linear-to-br from-[#eaf4ff] to-[#dbeafe] text-[#087fff] shadow-inner transition-transform duration-300 group-hover:scale-105">
          <Icon className="size-5" />
        </span>
        <span className="rounded-full bg-[#eef7f1] px-3 py-1 text-xs font-semibold text-[#16834c]">{label}</span>
      </div>
      <p className="mt-5 text-3xl font-semibold text-[#141922]">{value}</p>
      <p className="mt-2 text-sm text-[#657080]">{detail}</p>
    </article>
  )
}
