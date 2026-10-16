import { ArrowRight, Check } from "lucide-react"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import type { ProfileStrength } from "@/components/home/profileStrength"
import { cn } from "@/lib/utils"
import { formatCowries } from "@/utils/careconnect/cowry"

/**
 * How complete your profile is, every step at a glance, and one button for the next one.
 *
 * The ring in the header says how far along you are; this says what is left and takes you
 * straight to it. When the Cowry engine pays for a finished profile, the amount is shown,
 * because "add your skills" is easier to do with a reason attached.
 */
export function ProfileCompletionCard({
  strength,
  reward,
  onStep,
}: {
  strength: ProfileStrength
  /** Cowries for finishing the profile, when that reward is on and still to be earned. */
  reward?: number | null
  onStep: (key: string) => void
}) {
  const remaining = strength.steps.filter((step) => !step.done).length

  return (
    <section
      aria-label="Profile completion"
      className="rounded-[24px] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(16,20,26,0.35)] ring-1 ring-[#e2e6ea] sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-[#151922]">Finish your profile</h2>
        <p className="text-sm text-[#657080]">
          <span className="font-bold tabular-nums text-[#00898c]">{strength.percent}%</span> · {remaining} step
          {remaining === 1 ? "" : "s"} left
        </p>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef1f3]"
        role="progressbar"
        aria-valuenow={strength.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completion"
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-[#00b4b8] to-[#10ad58] transition-[width] duration-700 ease-out"
          style={{ width: `${strength.percent}%` }}
        />
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {strength.steps.map((step) => (
          <li key={step.key}>
            <button
              type="button"
              onClick={() => onStep(step.key)}
              disabled={step.done}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                step.done
                  ? "bg-[#e9f9f0] text-[#0f8a4d]"
                  : "bg-[#f3f6f8] text-[#4a5260] ring-1 ring-[#e2e6ea] hover:ring-[#00b4b8] active:scale-95",
              )}
            >
              {step.done && <Check className="size-3.5" aria-hidden="true" />}
              {step.label}
              {step.done && (
                <>
                  {" "}
                  <span className="sr-only">(done)</span>
                </>
              )}
            </button>
          </li>
        ))}
      </ul>

      {strength.next && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1f3] pt-4">
          {reward ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-[#7a5a1f]">
              <CowryIcon size={18} />
              Finish to earn <span className="font-bold tabular-nums">{formatCowries(reward)}</span>
            </p>
          ) : (
            <p className="text-sm text-[#657080]">Complete profiles get more linkups and job views.</p>
          )}
          <button
            type="button"
            onClick={() => onStep(strength.next!.key)}
            className="cowry-press inline-flex items-center gap-2 rounded-full bg-[#00b4b8] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(0,180,184,0.75)] transition hover:-translate-y-0.5 hover:bg-[#00a3a7]"
          >
            {strength.next.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  )
}
