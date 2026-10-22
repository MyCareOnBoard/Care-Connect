import { useEffect, useState } from "react"
import { Link } from "react-router"
import { Cookie, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogScrollBody, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { getAccountAgreement, openCookieSettings, recordAccountAgreement, useCookieConsent } from "@/lib/consent"
import { Routes } from "@/routes/constants"
import { useAuthUser } from "@/utils/auth"

/**
 * Settings → Privacy and cookies: the marketing opt-ins, this device's cookie choices, and
 * the policies. Marketing is separate from service notifications — turning it off never
 * stops messages about your account, bookings or payments.
 */
export function PrivacyChoicesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuthUser()
  const uid = user?.uid
  const cookies = useCookieConsent()
  const [marketingEmail, setMarketingEmail] = useState(false)
  const [marketingSms, setMarketingSms] = useState(false)
  const agreement = uid ? getAccountAgreement(uid) : null

  useEffect(() => {
    if (!open || !uid) return
    const current = getAccountAgreement(uid)
    setMarketingEmail(current?.marketingEmail ?? false)
    setMarketingSms(current?.marketingSms ?? false)
  }, [open, uid])

  const save = () => {
    if (!uid) return
    recordAccountAgreement(uid, { marketingEmail, marketingSms })
    toast.success("Privacy choices saved")
    onOpenChange(false)
  }

  const row = (id: string, title: string, body: string, checked: boolean, onChange: (value: boolean) => void) => (
    <div className="flex items-start gap-4 rounded-2xl bg-[#f7fafb] p-4 ring-1 ring-[#eef1f3]">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm font-bold text-[#141922]">
          {title}
        </label>
        <p className="mt-1 text-xs leading-relaxed text-[#657080]">{body}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,680px)] w-full max-w-lg flex-col overflow-hidden" showCloseButton>
        <DialogHeader className="shrink-0 border-b border-[#eef1f3] pb-4 pr-16">
          <DialogTitle className="inline-flex items-center gap-2">
            <ShieldCheck className="size-5 text-[#00898c]" aria-hidden="true" />
            Privacy and cookies
          </DialogTitle>
          <DialogDescription>Marketing messages, what this device stores, and our policies.</DialogDescription>
        </DialogHeader>

        <DialogScrollBody>
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#8a94a3]">Marketing</h3>
            {row(
              "marketing-email",
              "News and offers by email",
              "Product news, tips and offers. Messages about your account, jobs and payments are always sent.",
              marketingEmail,
              setMarketingEmail,
            )}
            {row("marketing-sms", "Offers by text message", "Occasional offers sent to your phone.", marketingSms, setMarketingSms)}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#8a94a3]">Cookies on this device</h3>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f7fafb] p-4 ring-1 ring-[#eef1f3]">
              <p className="text-xs text-[#4a5260]">
                {cookies
                  ? `Preferences ${cookies.preferences ? "on" : "off"} · Third-party services ${cookies.thirdParty ? "on" : "off"}`
                  : "No choice made yet"}
              </p>
              <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full" onClick={openCookieSettings}>
                <Cookie className="size-4" aria-hidden="true" />
                Change
              </Button>
            </div>
          </section>

          <section className="space-y-2 text-sm">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#8a94a3]">Policies</h3>
            {agreement?.termsAcceptedAt && (
              <p className="text-xs text-[#657080]">
                You accepted the Terms and Privacy Policy on {new Date(agreement.termsAcceptedAt).toLocaleDateString()}.
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link to={Routes.legal.privacy} className="font-semibold text-[#00868a] hover:underline">
                Privacy Policy
              </Link>
              <Link to={Routes.legal.terms} className="font-semibold text-[#00868a] hover:underline">
                Terms of Service
              </Link>
              <Link to={Routes.legal.cookies} className="font-semibold text-[#00868a] hover:underline">
                Cookie Policy
              </Link>
            </div>
          </section>
        </DialogScrollBody>

        <DialogFooter className="shrink-0 border-t border-[#eef1f3] pt-4">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-full bg-[#00b4b8] px-6 text-white hover:bg-[#00a3a7] hover:opacity-100"
            onClick={save}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
