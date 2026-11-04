import { useCallback, useEffect, useState } from "react"
import { Bookmark } from "lucide-react"
import type { HealthTip } from "@/utils/careconnect/services/healthTipsService"
import {
  deleteSavedHealthTip,
  listSavedHealthTips,
  type SavedHealthTip,
} from "@/utils/careconnect/services/savedHealthTipsService"

/**
 * "Saved tips": the tips the person kept (by setting a reminder with "also save this tip").
 *
 * Shows nothing at all until there is one, and nothing if the list can't be loaded: it is a
 * convenience, never a reason for the page to show an error. Opening one hands the tip to the
 * page, which shows it in full without searching (so it also has its Remind me button).
 * Removing asks once, inline. Removing a saved tip does not touch any reminder set from it.
 */
type Props = {
  /** Shows the tip in full on the page. */
  onOpen: (tip: HealthTip) => void
  /** Change this to reload the list, e.g. after a reminder also saved its tip. */
  refreshKey?: number
}

export function SavedHealthTips({ onOpen, refreshKey = 0 }: Props) {
  const [items, setItems] = useState<SavedHealthTip[]>([])
  const [max, setMax] = useState(50)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const result = await listSavedHealthTips()
      setItems(result.tips)
      setMax(result.max)
    } catch {
      // Quietly nothing: the page works without this list.
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  async function remove(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await deleteSavedHealthTip(id)
      await load()
    } catch {
      setError("That didn't work. Please try again.")
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  if (items.length === 0) return null

  const button =
    "rounded-full px-3 py-1 text-xs font-semibold text-[#00898c] transition hover:bg-[#e3f8f8] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#00b4b8]"

  return (
    <section aria-label="Saved tips" className="ht-rise space-y-2 rounded-2xl bg-white p-4 ring-1 ring-[#e2e6ea]">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#151922]">
        <Bookmark className="size-4 text-[#00898c]" aria-hidden="true" />
        Saved tips
        <span className="text-xs font-normal text-[#657080]">
          ({items.length} of {max})
        </span>
      </h2>
      <ul className="divide-y divide-[#eef1f3]">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#151922]">{item.tip.title}</p>
              <p className="line-clamp-1 text-xs text-[#657080]">{item.tip.summary}</p>
            </div>
            <div className="flex items-center gap-1">
              {confirmId === item.id ? (
                <>
                  <span className="text-xs text-[#4a5260]">Remove this tip?</span>
                  <button
                    type="button"
                    className={button}
                    disabled={busyId === item.id}
                    onClick={() => void remove(item.id)}
                  >
                    Yes, remove
                  </button>
                  <button type="button" className={button} onClick={() => setConfirmId(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className={button} onClick={() => onOpen(item.tip)}>
                    Open
                  </button>
                  <button
                    type="button"
                    className={button}
                    disabled={busyId === item.id}
                    onClick={() => setConfirmId(item.id)}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-xs text-[#b42318]">
          {error}
        </p>
      )}
      <p className="text-xs text-[#657080]">
        Only the tip's text is saved, never what you searched for. Removing a tip doesn't cancel any
        reminder you set from it.
      </p>
    </section>
  )
}
