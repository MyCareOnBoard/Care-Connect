import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TIME_OPTIONS } from "@/utils/professional/timeOptions"
import type { DaySlot, WeeklyAvailability } from "@/utils/professional/availabilityStore"

const ROWS: Array<{ key: keyof WeeklyAvailability; label: string }> = [
  { key: "sunday", label: "Sunday" },
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "breakTime", label: "Break time" },
]

type AvailabilityEditorProps = {
  value: WeeklyAvailability
  onChange: (next: WeeklyAvailability) => void
}

export function AvailabilityEditor({ value, onChange }: AvailabilityEditorProps) {
  const updateSlot = (key: keyof WeeklyAvailability, patch: Partial<DaySlot>) => {
    onChange({ ...value, [key]: { ...value[key], ...patch } })
  }

  return (
    <div className="divide-y divide-[#eef1f3]">
      {ROWS.map(({ key, label }) => {
        const slot = value[key]
        return (
          <div key={key} className="flex flex-wrap items-center gap-4 py-4">
            <div className="flex w-40 shrink-0 items-center gap-3">
              <Switch checked={slot.enabled} onCheckedChange={(enabled) => updateSlot(key, { enabled })} />
              <span className="text-sm font-semibold text-[#151922]">{label}</span>
            </div>

            {slot.enabled ? (
              <div className="flex items-center gap-2">
                <Select value={slot.start} onValueChange={(start) => updateSlot(key, { start })}>
                  <SelectTrigger size="sm" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-[#8a8f98]">-</span>
                <Select value={slot.end} onValueChange={(end) => updateSlot(key, { end })}>
                  <SelectTrigger size="sm" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span className="text-sm text-[#8a8f98]">Unavailable</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
