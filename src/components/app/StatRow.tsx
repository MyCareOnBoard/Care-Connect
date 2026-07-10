export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-semibold">{label}</span>
      <span className="rounded-full bg-[#e8eff2] px-1.5 py-0.5 text-xs text-[#20242c]">{value}</span>
    </div>
  )
}
