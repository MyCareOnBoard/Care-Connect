import { Outlet } from "react-router";

/**
 * Shell for authenticated pages. Add a header/sidebar here as the app grows.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  )
}
