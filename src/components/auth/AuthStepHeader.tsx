import { AccountControls } from "@/components/app/AccountControls"

export function AuthStepHeader() {
  return (
    <header className="border-b border-[#d9d9d9] px-4 pb-5 pt-3 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-medium leading-none sm:text-[26px]">
            Good morning, Joseph. <span aria-hidden="true">Hi</span>
          </h2>
          <p className="mt-3 text-sm text-[#151922]">We&apos;d have to collect some few information from you</p>
        </div>

        <AccountControls notificationSize="lg" />
      </div>
    </header>
  )
}
