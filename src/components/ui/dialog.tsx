import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

/** The dialog's heading. One look across every modal; a className still overrides it. */
export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-snug text-[#141922]", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

/** The line under the heading. */
export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm leading-relaxed text-[#657080]", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, DialogContentProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm pointer-events-auto",
        className
      )}
      {...props}
    />
  )
)
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

type DialogLayout = "center" | "custom"

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps & {
    showCloseButton?: boolean
    layout?: DialogLayout
    /**
     * Set false to drop the dimmed backdrop. For a dialog that deliberately does not
     * block the page behind it — a docked or minimized panel — where a backdrop would
     * both darken and swallow clicks meant for what it is sitting on top of.
     */
    overlay?: boolean
  }
>(
  (
    { className, children, showCloseButton = false, layout = "center", overlay = true, ...props },
    ref,
  ) => (
    <DialogPortal>
      {overlay ? <DialogOverlay /> : null}
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "z-50 bg-white outline-none pointer-events-auto",
          layout === "center" &&
            "fixed left-1/2 top-1/2 w-full max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] shadow-[0_24px_64px_rgba(17,24,39,0.16)] data-[state=open]:animate-fadeIn max-h-[calc(100vh-32px)] overflow-y-auto",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f6f8] text-[#565656] transition hover:bg-[#e8edf2]"
            aria-label="Close"
          >
            <span className="text-xl">×</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
)
DialogContent.displayName = DialogPrimitive.Content.displayName

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex shrink-0 flex-col gap-2 px-6 pt-6 text-center sm:text-left", className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex shrink-0 flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:justify-end sm:gap-3", className)} {...props} />
}

/**
 * The scrolling middle of a tall dialog. Pair with `flex flex-col` and a max height on
 * DialogContent, and a bordered DialogHeader / DialogFooter: the heading and the actions
 * stay put while only this part scrolls.
 */
export function DialogScrollBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm text-[#20242c]", className)}
      {...props}
    />
  )
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6 text-sm text-[#20242c]", className)} {...props} />
}
