import { Button } from "@/components/ui/button"
import { openCookieSettings, useCookieConsent } from "@/lib/consent"
import { LegalPage, ToBeProvided } from "./LegalPage"

/**
 * Cookie Policy. Unlike the other two, the table below is factual — it lists what the app
 * itself stores — so it is kept in step with the code: add a row when a new key is added.
 */
const STORAGE: { name: string; category: string; purpose: string; kept: string }[] = [
  { name: "Firebase sign-in", category: "Necessary", purpose: "Keeps you signed in securely.", kept: "Until you sign out" },
  { name: "auth_user, persisted app state", category: "Necessary", purpose: "Your session and account state between pages.", kept: "Until you sign out" },
  { name: "careconnect_signup_wizard", category: "Necessary", purpose: "Your progress through sign-up.", kept: "Until sign-up is finished" },
  { name: "careconnect.consent.*", category: "Necessary", purpose: "Remembers the choices on this page and your agreements.", kept: "Until the policy changes" },
  { name: "Google reCAPTCHA", category: "Necessary", purpose: "Protects sign-in and phone checks from abuse. Set by Google.", kept: "Set by Google" },
  { name: "careconnect-theme, careconnect-sound", category: "Preferences", purpose: "Light or dark theme, and sounds on or off.", kept: "Until changed or cleared" },
  { name: "careconnect-post-draft:*", category: "Preferences", purpose: "An unsent post, so it is not lost.", kept: "Until posted or cleared" },
  { name: "careconnect-recent-searches, careconnect.savedJobSearches", category: "Preferences", purpose: "Recent searches and saved job searches.", kept: "Until cleared" },
  { name: "careconnect-feed-focus, careconnect-tour-v*, careconnect-gifts-seen:*", category: "Preferences", purpose: "Feed layout, and features and treasures you have already seen.", kept: "Until cleared" },
  { name: "careconnect-withdraw-currency, careconnect-fx-ngn", category: "Preferences", purpose: "Your preferred currency and recent exchange rates.", kept: "Up to a day for rates" },
  { name: "Google Maps", category: "Third-party services", purpose: "Suggests addresses as you type a location. Set by Google.", kept: "Set by Google" },
]

export default function CookiePolicyPage() {
  const consent = useCookieConsent()
  const summary = !consent
    ? "You have not made a choice yet."
    : `Preferences ${consent.preferences ? "on" : "off"} · Third-party services ${consent.thirdParty ? "on" : "off"} · chosen ${new Date(consent.decidedAt).toLocaleDateString()}`

  return (
    <LegalPage
      title="Cookie Policy"
      intro={
        <>
          <p>
            CareConnect stores a small amount of information on your device. Necessary storage is always used, because
            the service cannot work without it. Everything else is used only if you allow it, and you can change your
            mind at any time.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#e3f8f8] p-4">
            <p className="text-sm font-semibold text-[#00585b]">{summary}</p>
            <Button type="button" className="rounded-full bg-[#00b4b8] text-white hover:bg-[#00a3a7] hover:opacity-100" onClick={openCookieSettings}>
              Change my choices
            </Button>
          </div>
        </>
      }
      sections={[
        {
          id: "categories",
          title: "What we store",
          body: (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="text-[#8a94a3]">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Name</th>
                    <th className="px-2 py-2 font-semibold">Category</th>
                    <th className="px-2 py-2 font-semibold">Purpose</th>
                    <th className="px-2 py-2 font-semibold">How long</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1f3]">
                  {STORAGE.map((row) => (
                    <tr key={row.name}>
                      <td className="px-2 py-2 font-mono text-[11px] text-[#141922]">{row.name}</td>
                      <td className="px-2 py-2">{row.category}</td>
                      <td className="px-2 py-2">{row.purpose}</td>
                      <td className="px-2 py-2">{row.kept}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ),
        },
        {
          id: "no-tracking",
          title: "Advertising and tracking",
          body: <p>CareConnect does not use advertising cookies or cross-site tracking.</p>,
        },
        {
          id: "change",
          title: "Changing your choices",
          body: (
            <p>
              Use “Change my choices” above, or Settings → Privacy and cookies. Turning Preferences off also clears what
              was saved on this device.
            </p>
          ),
        },
        {
          id: "third-parties",
          title: "Google's cookies",
          body: <ToBeProvided>links to Google's privacy and cookie information for reCAPTCHA and Maps.</ToBeProvided>,
        },
        { id: "contact", title: "Contact", body: <ToBeProvided>who to contact with questions about this policy.</ToBeProvided> },
      ]}
    />
  )
}
