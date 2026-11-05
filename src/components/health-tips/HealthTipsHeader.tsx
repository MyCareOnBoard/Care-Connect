/**
 * The Health Tips page's own header: a centred title on a dark teal gradient, rounded at the
 * bottom. Every other page keeps the plain PageHeader.
 *
 * The title and description are white in light and dark mode alike. They sit on the dark
 * gradient either way, and the dark theme leaves text-white and this gradient alone
 * (scripts/generate-dark-theme.mjs). The background is solid, which also hides the side light
 * streaks (LightStreaks) behind it, so they only show below the header.
 */
export function HealthTipsHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded rounded-b-[28px] border-b border-[#dfe4ea] bg-[linear-gradient(120deg,#0c2a33_0%,#0b5f68_55%,#00a3a7_100%)] px-5 py-10 text-center text-white sm:px-8">
      <div>
        <h1 className="text-4xl font-semibold tracking-normal text-white">{title}</h1>
        <p className="mx-auto mt-2 max-w-2xl text-base leading-6 text-white">{description}</p>
      </div>
    </div>
  )
}
