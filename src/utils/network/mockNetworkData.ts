/**
 * Local-only mock data for network surfaces with no backend support yet:
 * incoming invitations (no pending-request concept exists in connectionsService)
 * and "people who viewed your profile" (only an aggregate count exists, never a
 * list). Never persisted, never sent to the real connections API.
 */

export type MockPerson = {
  id: string
  name: string
  role: string
  avatarBg: string
}

const AVATAR_BGS = ["bg-[#ffa33d]", "bg-[#6b9cca]", "bg-[#a782d8]", "bg-[#d193ce]", "bg-[#33b6a6]"]

export const MOCK_INVITATIONS: MockPerson[] = [
  { id: "inv-1", name: "Jerome Bell", role: "Registered Nurse | Mental Health Advocate", avatarBg: AVATAR_BGS[0] },
  { id: "inv-2", name: "Dianne Russell", role: "Emergency Physician | Trauma Care Lead", avatarBg: AVATAR_BGS[1] },
  { id: "inv-3", name: "Robert Fox", role: "Clinical Pharmacist | Drug Safety Expert", avatarBg: AVATAR_BGS[2] },
  { id: "inv-4", name: "Cameron Williamson", role: "Oncology Surgeon | Cancer Research Fellow", avatarBg: AVATAR_BGS[3] },
  { id: "inv-5", name: "Ralph Edwards", role: "Pediatrician | Child Wellness Specialist", avatarBg: AVATAR_BGS[4] },
]

export const MOCK_PROFILE_VIEWERS: MockPerson[] = [
  { id: "view-1", name: "Jerome Bell", role: "Registered Nurse | Mental Health Advocate", avatarBg: AVATAR_BGS[0] },
  { id: "view-2", name: "Esther Howard", role: "Doctor", avatarBg: AVATAR_BGS[1] },
  { id: "view-3", name: "Theresa Webb", role: "Counsellor", avatarBg: AVATAR_BGS[2] },
  { id: "view-4", name: "Eleanor Pena", role: "Psychiatrist", avatarBg: AVATAR_BGS[3] },
]
