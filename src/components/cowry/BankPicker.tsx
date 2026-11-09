import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { CheckIcon, ChevronDownIcon, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { bankMatches } from "@/components/cowry/bankSearch"

export type PayoutBank = { code: string; name: string }

type Props = {
  id?: string
  banks: PayoutBank[]
  value: string
  onChange: (code: string) => void
  className?: string
}

/**
 * The bank list, with a search box.
 *
 * A list of a few dozen banks in a plain dropdown means scrolling for the one you want, and
 * a plain dropdown cannot hold a text field. So this is a popover holding a search field
 * above the list. Banks whose name starts with what was typed come first.
 */
export function BankPicker({ id, banks, value, onChange, className }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const selected = banks.find((bank) => bank.code === value) ?? null

  const results = useMemo(() => {
    const typed = query.trim().toLowerCase()
    const found = banks.filter((bank) => bankMatches(bank.name, query))
    if (!typed) return found
    // A name that starts with what was typed is the likeliest one meant.
    return [...found].sort(
      (a, b) => Number(!a.name.toLowerCase().startsWith(typed)) - Number(!b.name.toLowerCase().startsWith(typed)),
    )
  }, [banks, query])

  function choose(bank: PayoutBank) {
    onChange(bank.code)
    setOpen(false)
  }

  function moveTo(index: number) {
    const next = Math.max(0, Math.min(results.length - 1, index))
    setActive(next)
    listRef.current?.children[next]?.scrollIntoView?.({ block: "nearest" })
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      moveTo(active + 1)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      moveTo(active - 1)
    } else if (event.key === "Enter") {
      event.preventDefault()
      const bank = results[active]
      if (bank) choose(bank)
    }
  }

  return (
    // Modal, so the list scrolls with a mouse wheel inside the Add account dialog — the
    // dialog otherwise blocks scrolling anywhere outside itself, and the list is portalled out.
    <Popover
      modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setQuery("")
          setActive(Math.max(0, banks.findIndex((bank) => bank.code === value)))
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          data-placeholder={selected ? undefined : ""}
          className={cn(
            "flex w-63.5 items-center justify-between gap-3 rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-0 text-left text-sm font-normal leading-[1.4] text-(--input-text) outline-none transition-colors duration-200",
            "h-11",
            "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20",
            "data-placeholder:text-(--input-placeholder)",
            className,
          )}
        >
          <span className="truncate">{selected?.name ?? (banks.length ? "Choose your bank" : "Loading banks…")}</span>
          <ChevronDownIcon className="size-5 shrink-0 text-(--input-text)" aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-64 overflow-hidden p-0"
        // The search field takes focus, not the first bank.
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          searchRef.current?.focus()
        }}
      >
        <div className="flex items-center gap-2 border-b border-(--input-border) px-3">
          <Search className="size-4 shrink-0 text-(--input-placeholder)" aria-hidden="true" />
          <input
            ref={searchRef}
            type="text"
            role="searchbox"
            aria-label="Search banks"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].code}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder="Search banks"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-(--input-text) outline-none placeholder:text-(--input-placeholder)"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
              listRef.current?.scrollTo?.({ top: 0 })
            }}
            onKeyDown={onKeyDown}
          />
        </div>

        <ul ref={listRef} id={listId} role="listbox" aria-label="Banks" className="max-h-64 overflow-y-auto p-1">
          {banks.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-(--input-placeholder)">Loading banks…</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-(--input-placeholder)">
              No bank matches &ldquo;{query.trim()}&rdquo;
            </li>
          ) : (
            results.map((bank, index) => (
              <li
                key={bank.code}
                id={`${listId}-${bank.code}`}
                role="option"
                aria-selected={bank.code === value}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(bank)}
                className={cn(
                  "relative flex w-full cursor-pointer items-center rounded-lg py-2 pl-3 pr-9 text-sm text-(--input-text) transition-colors duration-150",
                  index === active && "bg-[color-mix(in_oklab,var(--main-color)_12%,transparent)]",
                )}
              >
                {bank.name}
                {bank.code === value && (
                  <CheckIcon className="absolute right-3 size-4 text-(--main-color)" aria-hidden="true" />
                )}
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
