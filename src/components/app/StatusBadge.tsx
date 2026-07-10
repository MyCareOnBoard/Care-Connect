import { cn } from "@/lib/utils"

const STATUS_STYLES: Record<string, string> = {
  positive: "border-[#10ad58] bg-[#eafaf1] text-[#10ad58]",
  negative: "border-[#ff3e66] bg-[#ffeef2] text-[#ff3e66]",
  neutral: "border-transparent bg-black text-white",
  pending: "border-transparent bg-[#eef1f3] text-[#141922]",
  active: "border-[#087fff] bg-[#eaf4ff] text-[#087fff]",
}

const KEYWORD_MAP: { keywords: string[]; style: keyof typeof STATUS_STYLES }[] = [
  { keywords: ["accepted", "shortlisted"], style: "positive" },
  { keywords: ["rejected", "not selected"], style: "negative" },
  { keywords: ["withdrawn", "closed"], style: "neutral" },
  { keywords: ["under review", "interviewing"], style: "active" },
]

function resolveStyle(status: string): string {
  const lower = status.toLowerCase()
  const match = KEYWORD_MAP.find((entry) => entry.keywords.some((keyword) => lower.includes(keyword)))
  return STATUS_STYLES[match?.style ?? "pending"]
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap", resolveStyle(status))}>
      {status}
    </span>
  )
}
