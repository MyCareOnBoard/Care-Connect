export type DaySlot = { enabled: boolean; start: string; end: string }

export type WeeklyAvailability = {
  sunday: DaySlot
  monday: DaySlot
  tuesday: DaySlot
  wednesday: DaySlot
  thursday: DaySlot
  friday: DaySlot
  saturday: DaySlot
  breakTime: DaySlot
}

const OFF: DaySlot = { enabled: false, start: "9:00 Am", end: "5:00 Pm" }
const WORK_DAY: DaySlot = { enabled: true, start: "9:00 Am", end: "5:00 Pm" }

export const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  sunday: OFF,
  monday: WORK_DAY,
  tuesday: WORK_DAY,
  wednesday: WORK_DAY,
  thursday: WORK_DAY,
  friday: WORK_DAY,
  saturday: OFF,
  breakTime: { enabled: true, start: "12:00 Pm", end: "2:00 Pm" },
}

const STORAGE_PREFIX = "careconnect:availability:"

export function getAvailability(uid: string): WeeklyAvailability {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${uid}`)
    return raw ? (JSON.parse(raw) as WeeklyAvailability) : DEFAULT_AVAILABILITY
  } catch {
    return DEFAULT_AVAILABILITY
  }
}

export function saveAvailability(uid: string, value: WeeklyAvailability): void {
  localStorage.setItem(`${STORAGE_PREFIX}${uid}`, JSON.stringify(value))
}
