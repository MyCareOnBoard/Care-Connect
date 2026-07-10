// import { AccountControls } from "@/components/app/AccountControls"

export function AuthStepHeader() {
  return (
    <header className="border-b border-[#d9d9d9] px-4 py-3 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-medium leading-none sm:text-[22px]">
            Good morning, Joseph. <span aria-hidden="true">👋🏼</span>
          </h2>
          <p className="mt-3 text-sm">We&apos;d have to collect some few information from you</p>
        </div>
        {/* Not needed at this point */}
        {/* <AccountControls notificationSize="md" /> */}
      </div>
    </header>
  )
}
