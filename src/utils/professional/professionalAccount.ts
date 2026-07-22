const STORAGE_KEY = "careconnect:professional-accounts"

function readAccounts(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

/**
 * Marks a uid as a "professional" (agency team member) account. There is no backend
 * field for this yet — the professional signup path is invite-link-only and this is
 * the local record of having completed it, mirroring the mock/local state already used
 * for team members and bookings elsewhere in the app.
 */
export function markProfessionalAccount(uid: string): void {
  const accounts = readAccounts()
  if (!accounts.includes(uid)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...accounts, uid]))
  }
}

export function isProfessionalAccount(uid: string | null | undefined): boolean {
  if (!uid) return false
  return readAccounts().includes(uid)
}
