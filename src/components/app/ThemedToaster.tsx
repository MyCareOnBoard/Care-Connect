import { Toaster } from "sonner"
import { useTheme } from "@/lib/theme"

/** Toasts follow the light/dark switch. */
export function ThemedToaster() {
  const theme = useTheme()
  return <Toaster position="top-right" richColors theme={theme} />
}
