import { Suspense } from "react";
import { Outlet } from "react-router";
import { AppShell } from "@/components/app/AppShell";
import { RouteLoader } from "@/components/ui/loader";

export default function AppLayout() {
  return (
    <AppShell>
      <Suspense fallback={<RouteLoader />}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}
