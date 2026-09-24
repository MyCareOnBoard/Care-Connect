import { useEffect, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { Routes } from "@/routes/constants"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import {
  COWRY_REFUSAL_MESSAGES,
  onCowryEarned,
  type CowryEarnedDetail,
} from "@/utils/careconnect/cowryEarned"

/**
 * Cowries arriving.
 *
 * Mounted once in AppLayout, as a sibling of the Outlet rather than inside it, so a route
 * change during the animation does not unmount it mid-flight.
 *
 * Two outcomes, two treatments. Earning is the moment worth celebrating, so it gets its
 * own pill that rises and fades. A refusal is information, not an occasion, so it goes
 * through the ordinary toast — the same channel as every other "here is what happened".
 *
 * The pill says **pending**, not just the number. A user who earns 10 and then finds they
 * cannot spend it reads that as the system taking it back; saying so at the moment of
 * earning costs nothing and prevents the misunderstanding entirely.
 */

interface Landing {
  id: number
  amount: number
}

/** How long a pill stays before it is removed. Matches the CSS animation below. */
const VISIBLE_MS = 2600

export function CowryEarnedLayer() {
  const [landings, setLandings] = useState<Landing[]>([])

  useEffect(() => {
    let nextId = 0
    const timers = new Set<ReturnType<typeof setTimeout>>()

    const unsubscribe = onCowryEarned((detail: CowryEarnedDetail) => {
      const { award } = detail

      if (!award.awarded) {
        const message = award.reason ? COWRY_REFUSAL_MESSAGES[award.reason] : null
        if (message) toast(message)
        return
      }

      const amount = award.amount ?? 0
      if (amount <= 0) return

      const id = (nextId += 1)
      setLandings((current) => [...current, { id, amount }])

      const timer = setTimeout(() => {
        setLandings((current) => current.filter((item) => item.id !== id))
        timers.delete(timer)
      }, VISIBLE_MS)
      timers.add(timer)
    })

    return () => {
      unsubscribe()
      for (const timer of timers) clearTimeout(timer)
    }
  }, [])

  if (!landings.length) return null

  return (
    <>
      <style>{`
        @keyframes cowry-rise {
          0%   { opacity: 0; transform: translateY(14px) scale(0.94); }
          12%  { opacity: 1; transform: translateY(0) scale(1); }
          72%  { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-16px) scale(0.98); }
        }
        .cowry-landing { animation: cowry-rise ${VISIBLE_MS}ms ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          @keyframes cowry-rise {
            0%, 100% { opacity: 0; transform: none; }
            12%, 72% { opacity: 1; transform: none; }
          }
        }
      `}</style>

      <div
        // aria-live so the award is announced rather than only seen. Not a dialog: it
        // steals no focus and nothing here is interactive except the link out.
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
      >
        {landings.map((landing) => (
          <Link
            key={landing.id}
            to={Routes.app.user.cowryWallet}
            className="cowry-landing pointer-events-auto flex items-center gap-2 rounded-full bg-[#10141a] px-4 py-2 text-white shadow-lg"
          >
            <CowryIcon size={20} className="animate-cowry-pop [animation-delay:150ms]" />
            <span className="text-sm font-semibold tabular-nums">
              +{landing.amount.toLocaleString("en-US")} Cowries
            </span>
            <span className="text-xs text-white/70">pending &middot; ready tomorrow</span>
          </Link>
        ))}
      </div>
    </>
  )
}
