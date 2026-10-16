import { useRef, useState, type PointerEvent, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/** How far the row slides to show its left-swipe action. */
const REVEAL = 88
/** How far a swipe must travel before letting go acts on it. */
const THRESHOLD = 56

type SwipeAction = {
  label: string
  icon: ReactNode
  /** Background of the action behind the row. */
  className: string
  onAction: () => void
}

/**
 * A list row with swipe actions, for touch screens. Swiping left uncovers `left` (a button
 * that stays out until tapped or the row is swiped back); swiping right past the threshold
 * runs `right` straight away and springs back. A mouse never swipes, so desktop is unchanged.
 * From the keyboard, the Delete key on the row runs the left action.
 */
export function SwipeRow({
  children,
  left,
  right,
  className,
}: {
  children: ReactNode
  left?: SwipeAction
  right?: SwipeAction
  className?: string
}) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(null)
  // A swipe ends in a click on the row underneath; this swallows that one click.
  const swallowClick = useRef(false)

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse") return
    start.current = { x: event.clientX, y: event.clientY, base: offset, horizontal: null }
  }

  const onPointerMove = (event: PointerEvent) => {
    const s = start.current
    if (!s) return
    const dx = event.clientX - s.x
    const dy = event.clientY - s.y
    // Decide once whether this is a swipe or a scroll, then stick with it.
    if (s.horizontal === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      s.horizontal = Math.abs(dx) > Math.abs(dy)
      if (s.horizontal) setDragging(true)
    }
    if (!s.horizontal) return
    const min = left ? -REVEAL - 24 : 0
    const max = right ? REVEAL : 0
    setOffset(Math.max(min, Math.min(max, s.base + dx)))
  }

  const onPointerEnd = () => {
    const s = start.current
    start.current = null
    if (!s?.horizontal) return
    setDragging(false)
    swallowClick.current = true
    if (right && offset > THRESHOLD) {
      right.onAction()
      setOffset(0)
    } else if (left && offset < -THRESHOLD) {
      setOffset(-REVEAL)
    } else {
      setOffset(0)
    }
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {right && offset > 0 && (
        <div
          className={cn("absolute inset-y-0 left-0 flex items-center gap-2 pl-5 text-sm font-semibold text-white", right.className)}
          style={{ width: Math.max(offset, 0) }}
          aria-hidden="true"
        >
          {right.icon}
        </div>
      )}
      {left && offset < 0 && (
        <button
          type="button"
          onClick={() => {
            setOffset(0)
            left.onAction()
          }}
          className={cn("absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 text-xs font-semibold text-white", left.className)}
          style={{ width: Math.max(-offset, REVEAL) }}
        >
          {left.icon}
          {left.label}
        </button>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={(event) => {
          if (left && event.key === "Delete") {
            event.preventDefault()
            left.onAction()
          }
        }}
        onClickCapture={(event) => {
          if (swallowClick.current) {
            swallowClick.current = false
            event.stopPropagation()
            event.preventDefault()
          } else if (offset !== 0) {
            // A tap on an open row closes it rather than opening it.
            setOffset(0)
            event.stopPropagation()
            event.preventDefault()
          }
        }}
        className={cn("relative touch-pan-y bg-white", !dragging && "transition-transform duration-200 ease-out")}
        style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
      >
        {children}
      </div>
    </div>
  )
}
