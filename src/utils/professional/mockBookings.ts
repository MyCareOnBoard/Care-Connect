export type ProfessionalBooking = {
  id: string
  clientName: string
  serviceTitle: string
  when: string
  avatarBg: string
}

export const upcomingBookings: ProfessionalBooking[] = [
  { id: "pb-1", clientName: "Esther Howard", serviceTitle: "Therapy", when: "Tomorrow 2:00pm", avatarBg: "bg-[#e7b8c9]" },
  { id: "pb-2", clientName: "Guy Hawkins", serviceTitle: "Home visit", when: "15 May 2026, 9:30am", avatarBg: "bg-[#6b9cca]" },
  { id: "pb-3", clientName: "Annette Black", serviceTitle: "Marriage counseling", when: "24 May 2026, 8:30am", avatarBg: "bg-[#87c9a8]" },
]

export const previousBookings: ProfessionalBooking[] = [
  { id: "pb-4", clientName: "Jerome Bell", serviceTitle: "Wound care", when: "2 May 2026, 11:00am", avatarBg: "bg-[#f5a623]" },
  { id: "pb-5", clientName: "Darrell Steward", serviceTitle: "Physical therapy", when: "28 Apr 2026, 3:30pm", avatarBg: "bg-[#c99b9b]" },
]
