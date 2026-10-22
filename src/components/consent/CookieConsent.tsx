import { useEffect, useState } from "react"
import { Cookie, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogScrollBody, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  acceptAllCookies,
  acceptNecessaryOnly,
  getCookieConsent,
  onOpenCookieSettings,
  setCookieConsent,
  useCookieConsent,
} from "@/lib/consent"
import { Link } from "react-router"
import { Routes } from "@/routes/constants"

/**
 * The cookie banner, and the dialog for choosing category by category.
 *
 * Shown until a choice is made for the current policy version. Turning everything optional
 * down is as easy as accepting it — the two buttons sit side by side, same size — and nothing
 * optional is stored or loaded before a choice. Necessary storage needs no consent and is
 * explained rather than offered as a switch.
 *
 */

const CATEGORIES = [
  {
    key: "necessary" as const,
    title: "Necessary",
    body: "Keeps you signed in, remembers your progress through sign-up, and runs the security checks (Google reCAPTCHA) that protect your account. The service cannot work without these, so they are always on.",
  },
  {
    key: "preferences" as const,
    title: "Preferences",
    body: "Remembers choices on this device: light or dark theme, sound, unsent post drafts, recent and saved searches, your preferred currency, and features you have already been shown.",
  },
  {
    key: "thirdParty" as const,
    title: "Third-party services",
    body: "Loads Google Maps to suggest addresses as you type a location. Google may set its own cookies. Without it, you type addresses in full.",
  },
]

export function CookieConsent() {
  const consent = useCookieConsent()
  const [manageOpen, setManageOpen] = useState(false)
  const [preferences, setPreferences] = useState(false)
  const [thirdParty, setThirdParty] = useState(false)

  // Open from Settings, a footer link or the cookie policy page.
  useEffect(() => onOpenCookieSettings(() => setManageOpen(true)), [])

  // The dialog starts from what was chosen before, or everything optional off.
  useEffect(() => {
    if (!manageOpen) return
    const current = getCookieConsent()
    setPreferences(current?.preferences ?? false)
    setThirdParty(current?.thirdParty ?? false)
  }, [manageOpen])

  const save = () => {
    setCookieConsent({ preferences, thirdParty })
    setManageOpen(false)
  }

  return (
    <>
      {!consent && !manageOpen && (
        <div
          role="region"
          aria-label="Cookie choices"
          className="animate-fade-in-up fixed inset-x-3 bottom-[calc(var(--app-bottom-inset,0px)+0.75rem)] z-[70] mx-auto max-w-3xl rounded-2xl bg-white p-4 shadow-[0_20px_60px_-20px_rgba(16,20,26,0.45)] ring-1 ring-[#e2e6ea] sm:p-5"
        >
          <div className="flex gap-3">
            <span className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-[#e3f8f8] text-[#00898c] sm:flex">
              <Cookie className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#141922]">Your privacy choices</p>
              <p className="mt-1 text-sm leading-relaxed text-[#4a5260]">
                We use necessary storage to keep you signed in and your account secure. With your permission we
                also remember your preferences on this device and use Google Maps to suggest addresses. You can
                change this at any time in Settings.{" "}
                <Link to={Routes.legal.cookies} className="font-semibold text-[#00868a] underline-offset-2 hover:underline">
                  Cookie policy
                </Link>
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className="h-10 rounded-full px-4 text-sm font-semibold text-[#00868a] hover:underline sm:mr-auto"
            >
              Manage choices
            </button>
            {/* Same size and weight: saying no is as easy as saying yes. */}
            <Button type="button" variant="outline" className="h-10 rounded-full px-5" onClick={acceptNecessaryOnly}>
              Necessary only
            </Button>
            <Button
              type="button"
              className="h-10 rounded-full bg-[#00b4b8] px-5 text-white hover:bg-[#00a3a7] hover:opacity-100"
              onClick={acceptAllCookies}
            >
              Accept all
            </Button>
          </div>
        </div>
      )}

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="flex max-h-[min(90vh,680px)] w-full max-w-lg flex-col overflow-hidden" showCloseButton>
          <DialogHeader className="shrink-0 border-b border-[#eef1f3] pb-4 pr-16">
            <DialogTitle className="inline-flex items-center gap-2">
              <ShieldCheck className="size-5 text-[#00898c]" aria-hidden="true" />
              Cookie and storage choices
            </DialogTitle>
            <DialogDescription>
              Choose what this device may store and load. Your choice applies to this browser.
            </DialogDescription>
          </DialogHeader>

          <DialogScrollBody>
            {CATEGORIES.map((category) => {
              const locked = category.key === "necessary"
              const checked = locked ? true : category.key === "preferences" ? preferences : thirdParty
              const id = `consent-${category.key}`
              return (
                <div key={category.key} className="flex items-start gap-4 rounded-2xl bg-[#f7fafb] p-4 ring-1 ring-[#eef1f3]">
                  <div className="min-w-0 flex-1">
                    <label htmlFor={id} className="text-sm font-bold text-[#141922]">
                      {category.title}
                      {locked && <span className="ml-2 text-xs font-semibold text-[#00898c]">Always on</span>}
                    </label>
                    <p className="mt-1 text-xs leading-relaxed text-[#657080]">{category.body}</p>
                  </div>
                  <Switch
                    id={id}
                    checked={checked}
                    disabled={locked}
                    onCheckedChange={(value) =>
                      category.key === "preferences" ? setPreferences(value) : setThirdParty(value)
                    }
                    aria-label={category.title}
                  />
                </div>
              )
            })}
            <p className="text-xs text-[#8a94a3]">
              Turning Preferences off also clears what was saved on this device.{" "}
              <Link
                to={Routes.legal.cookies}
                onClick={() => setManageOpen(false)}
                className="font-semibold text-[#00868a] hover:underline"
              >
                Read the cookie policy
              </Link>
            </p>
          </DialogScrollBody>

          <DialogFooter className="shrink-0 border-t border-[#eef1f3] pt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                acceptNecessaryOnly()
                setManageOpen(false)
              }}
            >
              Necessary only
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#00b4b8] px-6 text-white hover:bg-[#00a3a7] hover:opacity-100"
              onClick={save}
            >
              Save choices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
