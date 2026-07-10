import { useEffect, useState } from "react"

export function useDelayedLoading(durationMs = 900) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), durationMs)
    return () => clearTimeout(timeout)
  }, [durationMs])

  return isLoading
}
