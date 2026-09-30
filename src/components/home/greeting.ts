/** "Good morning" / "Good afternoon" / "Good evening", by the viewer's own clock. */
export function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}
