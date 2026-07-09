import { CheckCircle2, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type CertificationChipProps = {
  label: string
  selected?: boolean
  onClick?: () => void
}

export function CertificationChip({ label, selected = false, onClick }: CertificationChipProps) {
  const Icon = selected ? CheckCircle2 : PlusCircle

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-sm transition",
        selected
          ? "border-[#087fff] bg-[#eaf4ff] text-[#087fff]"
          : "border-[#d6d6d6] bg-white text-[#2c3038] hover:border-[#087fff] hover:text-[#087fff]"
      )}
    >
      <span>{label}</span>
      <Icon className="size-4" />
    </button>
  )
}
