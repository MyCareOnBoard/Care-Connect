import { forwardRef, useImperativeHandle, useRef, type ClipboardEvent, type KeyboardEvent } from "react"

/**
 * The one-time-code boxes, one digit each.
 *
 * - Typing moves to the next box; typing into a filled box replaces its digit.
 * - Pasting fills the boxes from the one you are in (spaces and dashes ignored), and so does
 *   the phone's offer of the code from the text or email it just received.
 * - Backspace clears from the cursor's box to the end, and the cursor stays to type the rest
 *   again. In an empty box it steps back one and clears from there. Box 1 only ever clears
 *   itself. Delete clears the whole code and goes back to box 1.
 * - ← and → move between boxes.
 *
 * `onComplete` runs when a paste or autofill fills the last box, so a pasted code is the
 * last step; a code typed digit by digit waits for the button, as before.
 */
export interface OtpInputHandle {
  focus: (index?: number) => void
}

export const OtpInput = forwardRef<
  OtpInputHandle,
  {
    value: string[]
    onChange: (next: string[]) => void
    onComplete?: (code: string) => void
    disabled?: boolean
  }
>(function OtpInput({ value: digits, onChange, onComplete, disabled }, ref) {
  const length = digits.length
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const focusBox = (index: number) => {
    const box = inputRefs.current[Math.max(0, Math.min(length - 1, index))]
    box?.focus()
    box?.select()
  }
  useImperativeHandle(ref, () => ({ focus: (index = 0) => focusBox(index) }))

  /** Several digits at once, from `index` on: a paste, or the whole code from autofill. */
  const fillFrom = (index: number, text: string) => {
    const incoming = text.replace(/\D/g, "").slice(0, length - index).split("")
    if (incoming.length === 0) return
    const next = [...digits]
    incoming.forEach((digit, offset) => {
      next[index + offset] = digit
    })
    onChange(next)
    const firstEmpty = next.findIndex((digit) => !digit)
    focusBox(firstEmpty === -1 ? length - 1 : firstEmpty)
    if (firstEmpty === -1) onComplete?.(next.join(""))
  }

  const updateDigit = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, "")
    // More than one digit in a single change: autofill, or a paste delivered as input.
    if (typed.length > 1) {
      fillFrom(index, typed)
      return
    }
    onChange(digits.map((digit, at) => (at === index ? typed : digit)))
    if (typed && index < length - 1) focusBox(index + 1)
  }

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    fillFrom(index, event.clipboardData.getData("text"))
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    const clearFrom = (from: number) => onChange(digits.map((digit, at) => (at >= from ? "" : digit)))

    if (event.key === "Backspace") {
      event.preventDefault()
      if (index === 0) {
        onChange(digits.map((digit, at) => (at === 0 ? "" : digit)))
      } else if (digits[index]) {
        clearFrom(index)
      } else {
        clearFrom(index - 1)
        focusBox(index - 1)
      }
    } else if (event.key === "Delete") {
      event.preventDefault()
      onChange(digits.map(() => ""))
      focusBox(0)
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      focusBox(index - 1)
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      focusBox(index + 1)
    }
  }

  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-4">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputRefs.current[index] = node
          }}
          value={digit}
          disabled={disabled}
          onChange={(event) => updateDigit(index, event.target.value)}
          onPaste={(event) => handlePaste(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          // Lets phones offer the code from the text or email they just received.
          autoComplete={index === 0 ? "one-time-code" : "off"}
          inputMode="numeric"
          pattern="[0-9]*"
          className="h-15.5 rounded-xl border border-[#d7d7d8] text-center text-3xl font-bold outline-none focus:border-[#00b4b8] focus:ring-2 focus:ring-[#00b4b8]/20 disabled:opacity-60"
          aria-label={`Verification digit ${index + 1}`}
          required
        />
      ))}
    </div>
  )
})
