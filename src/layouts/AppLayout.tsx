import { Suspense } from "react";
import { Outlet } from "react-router";
import { AppShell } from "@/components/app/AppShell";
import { ActiveCallLayer } from "@/components/call/ActiveCallLayer";
import { CallSessionProvider } from "@/components/call/CallSessionProvider";
import { CowryEarnedLayer } from "@/components/cowry/CowryEarnedLayer";
import { RouteLoader } from "@/components/ui/loader";

export default function AppLayout() {
  return (
    // The call lives out here, as a sibling of the Outlet rather than inside it, which is
    // the whole reason it can be minimized: a route change re-renders the Outlet and would
    // unmount anything within it, dropping the session mid-visit.
    <CallSessionProvider>
      <AppShell>
        <Suspense fallback={<RouteLoader />}>
          <Outlet />
        </Suspense>
      </AppShell>
      <ActiveCallLayer />
      {/* Outside the Outlet for the same reason the call is: a route change while Cowries
          are landing must not unmount the animation halfway through. */}
      <CowryEarnedLayer />
    </CallSessionProvider>
  )
}
