function formatTime(hour24: number, minute: number): string {
  const period = hour24 >= 12 ? "Pm" : "Am"
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`
}

export const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, index) =>
  formatTime(Math.floor(index / 2), index % 2 === 0 ? 0 : 30)
)
