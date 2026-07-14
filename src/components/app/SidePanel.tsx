import { type ReactNode } from "react"
import { X } from "lucide-react"
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type SidePanelProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  widthClassName?: string
  centered?: boolean
}

export function SidePanel({ open, onClose, title, children, footer, widthClassName = "max-w-[520px]", centered = false }: SidePanelProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        layout={centered ? "center" : "custom"}
        className={cn(
          "flex flex-col",
          centered
            ? "max-h-[90vh] rounded-3xl"
            : "fixed inset-y-0 right-0 h-full w-full max-w-130 overflow-hidden shadow-2xl sm:rounded-l-3xl data-[state=open]:animate-slide-in-right",
          widthClassName
        )}
      >
        <header className="flex items-center justify-between border-b border-[#eef1f3] px-6 py-5">
          <h2 className="text-xl font-semibold text-[#151922]">{title}</h2>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close panel"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f6f8] text-[#565656] transition hover:bg-[#e8edf2]"
            >
              <X className="size-5" />
            </button>
          </DialogClose>
        </header>

        <div className="flex-1 px-6 py-5 overflow-y-auto">{children}</div>

        {footer && <footer className="border-t border-[#eef1f3] px-6 py-4">{footer}</footer>}
      </DialogContent>
    </Dialog>
  )
}
