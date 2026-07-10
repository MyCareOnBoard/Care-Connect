import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type SidePanelProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  widthClassName?: string
}

export function SidePanel({ open, onClose, title, children, footer, widthClassName = "max-w-[520px]" }: SidePanelProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="Close panel" onClick={onClose} className="absolute inset-0 bg-black/40 animate-fadeIn" />
      <aside
        className={cn(
          "animate-slide-in-right relative z-10 ml-auto flex h-full w-full flex-col bg-white shadow-2xl",
          widthClassName
        )}
      >
        <header className="flex items-center justify-between border-b border-[#eef1f3] px-6 py-5">
          <h2 className="text-xl font-semibold text-[#151922]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex size-9 items-center justify-center rounded-full text-[#565656] transition hover:bg-[#f2f6f8]"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <footer className="border-t border-[#eef1f3] px-6 py-4">{footer}</footer>}
      </aside>
    </div>
  )
}
