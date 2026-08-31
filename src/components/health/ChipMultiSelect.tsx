import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"

/**
 * Pick from a curated list, plus add anything not on it.
 *
 * The curated options keep common answers consistent enough to skim across
 * visits; the free-text row keeps the field honest when a client's situation is
 * not on anyone's list. Reused for conditions, mobility aids, communication
 * needs, and the care tasks on a visit record.
 */
export function ChipMultiSelect({
  options,
  selected,
  onChange,
  allowCustom = true,
  customPlaceholder = "Add something else",
  emptyHint,
}: {
  options: readonly string[]
  selected: string[]
  onChange: (next: string[]) => void
  allowCustom?: boolean
  customPlaceholder?: string
  emptyHint?: string
}) {
  const [custom, setCustom] = useState("")

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    )
  }

  const addCustom = () => {
    const value = custom.trim()
    if (!value) return
    // Case-insensitive so "Asthma" typed by hand does not sit beside the chip.
    const exists = selected.some((item) => item.toLowerCase() === value.toLowerCase())
    if (!exists) onChange([...selected, value])
    setCustom("")
  }

  // Anything selected that is not one of the offered options — shown separately
  // so a client can see and remove their own additions.
  const extras = selected.filter(
    (item) => !options.some((option) => option.toLowerCase() === item.toLowerCase()),
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                active
                  ? "border-[#00b4b8] bg-[#e3f8f8] font-medium text-[#00898c]"
                  : "border-[#eef1f3] text-[#657080] hover:border-[#d7dde5]"
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>

      {extras.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {extras.map((extra) => (
            <span
              key={extra}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#00b4b8] bg-[#e3f8f8] px-3 py-1.5 text-sm font-medium text-[#00898c]"
            >
              {extra}
              <button
                type="button"
                onClick={() => toggle(extra)}
                aria-label={`Remove ${extra}`}
                className="text-[#00898c] hover:opacity-70"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {allowCustom && (
        <div className="flex gap-2">
          <Input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                // Never let Enter submit the surrounding form by accident.
                event.preventDefault()
                addCustom()
              }
            }}
            placeholder={customPlaceholder}
            className="h-11"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!custom.trim()}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[#eef1f3] px-4 text-sm font-semibold text-[#151922] transition hover:border-[#d7dde5] disabled:opacity-40"
          >
            <Plus className="size-4" />
            Add
          </button>
        </div>
      )}

      {selected.length === 0 && emptyHint && (
        <p className="text-sm text-[#657080]">{emptyHint}</p>
      )}
    </div>
  )
}
