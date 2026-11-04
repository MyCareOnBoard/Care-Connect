import { useEffect, useRef, useState } from "react"
import { Check, Copy, Share2, Square, Volume2, X } from "lucide-react"
import type { HealthTip } from "@/utils/careconnect/services/healthTipsService"

/** The tip as plain text: what is copied, shared and read aloud. */
function tipAsText(tip: HealthTip, { spoken = false } = {}): string {
  const lines = [tip.title, "", tip.summary]
  const steps = tip.steps ?? []
  if (steps.length > 0) {
    lines.push("", ...steps.map((step, index) => (spoken ? `Step ${index + 1}. ${step}` : `${index + 1}. ${step}`)))
  }
  if (tip.whenToSeeAProfessional) lines.push("", `See a professional if: ${tip.whenToSeeAProfessional}`)
  return lines.join("\n")
}

const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window
const canShare = () => typeof navigator !== "undefined" && typeof navigator.share === "function"

type CopyState = "idle" | "copied" | "failed"

const actionClass =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#00898c] ring-1 ring-[#d3eeee] transition hover:-translate-y-0.5 hover:bg-[#e3f8f8] active:translate-y-0 active:scale-95"

/**
 * Listen, copy and share for the tip on screen. Each is offered only where the browser can do
 * it, and all of it happens on the device: reading aloud uses the browser's own voice, and
 * sharing hands the text to the system share sheet — nothing goes through our servers.
 */
export function TipActions({ tip }: { tip: HealthTip }) {
  const [speaking, setSpeaking] = useState(false)
  const [copy, setCopy] = useState<CopyState>("idle")
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Stop talking and drop the timer when the tip goes away, so a new tip never inherits either.
  useEffect(
    () => () => {
      clearTimeout(copyTimer.current)
      if (canSpeak()) window.speechSynthesis.cancel()
    },
    [],
  )

  function toggleSpeech() {
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(tipAsText(tip, { spoken: true }))
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    synth.speak(utterance)
    setSpeaking(true)
  }

  async function copyTip() {
    let next: CopyState = "copied"
    try {
      await navigator.clipboard.writeText(tipAsText(tip))
    } catch {
      // Clipboard blocked (insecure context or permission): say so rather than do nothing.
      next = "failed"
    }
    setCopy(next)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopy("idle"), 2500)
  }

  async function shareTip() {
    try {
      await navigator.share({ title: tip.title, text: tipAsText(tip) })
    } catch {
      // Closing the share sheet rejects too; there is nothing to tell the person either way.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSpeak() && (
        <button type="button" onClick={toggleSpeech} aria-pressed={speaking} className={actionClass}>
          {speaking ? (
            <Square className="size-3 fill-current" aria-hidden="true" />
          ) : (
            <Volume2 className="size-3.5" aria-hidden="true" />
          )}
          {speaking ? "Stop" : "Listen"}
          {speaking && (
            <span className="flex h-3 items-end gap-0.5" aria-hidden="true">
              {[0, 1, 2].map((bar) => (
                <span
                  key={bar}
                  className="ht-eq w-0.5 rounded-full bg-current"
                  style={{ animationDelay: `${bar * 120}ms` }}
                />
              ))}
            </span>
          )}
        </button>
      )}

      <button type="button" onClick={() => void copyTip()} className={actionClass}>
        {copy === "copied" ? (
          <Check className="ht-pop size-3.5" aria-hidden="true" />
        ) : copy === "failed" ? (
          <X className="size-3.5" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
        {copy === "copied" ? "Copied" : "Copy"}
      </button>

      {canShare() && (
        <button type="button" onClick={() => void shareTip()} className={actionClass}>
          <Share2 className="size-3.5" aria-hidden="true" />
          Share
        </button>
      )}

      {copy === "failed" && (
        <p role="alert" className="ht-rise text-xs text-[#8c1d18]">
          Couldn&apos;t copy. Your browser blocked it.
        </p>
      )}
    </div>
  )
}
