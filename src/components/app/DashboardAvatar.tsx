export function Avatar({ className = "", initials = "" }: { className?: string; initials?: string }) {
  return (
    <span
      className={`flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_2px_8px_rgba(16,20,26,0.12)] ring-2 ring-white transition-transform duration-200 hover:scale-105 ${className || "bg-[#e8f1f7]"}`}
    >
      <span className="text-xs font-bold text-white">{initials}</span>
    </span>
  )
}
