import { Outlet } from "react-router";
import { AppShell } from "@/components/app/AppShell";

export default function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
