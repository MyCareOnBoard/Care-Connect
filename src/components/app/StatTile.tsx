export function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/80 p-4 shadow-[0_4px_16px_rgba(16,20,26,0.05)] backdrop-blur-md">
      <p className="text-2xl font-bold text-[#141922]">{value}</p>
      <p className="mt-1 text-sm text-[#657080]">{label}</p>
    </div>
  )
}
