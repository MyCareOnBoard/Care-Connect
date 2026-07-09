import { Outlet } from "react-router";
import { useEffect } from "react";

export default function AuthLayout() {
  useEffect(() => {
    document.body.classList.add('auth-layout-active')
    return () => document.body.classList.remove('auth-layout-active')
  }, [])

  return (
    <Outlet />
  )
}
