export type PasswordStrength = {
  score: 0 | 1 | 2 | 3
  label: string
  color: string
}

const LEVELS: Omit<PasswordStrength, "score">[] = [
  { label: "Too weak", color: "#d53411" },
  { label: "Weak", color: "#d53411" },
  { label: "Good", color: "#ffb020" },
  { label: "Strong", color: "#10ad58" },
]

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, ...LEVELS[0] }

  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)

  let score = 0
  if (password.length >= 8) score++
  if (score === 1 && password.length >= 10 && hasLower && hasUpper) score++
  if (score === 2 && password.length >= 12 && hasDigit && hasSymbol) score++

  return { score: score as 0 | 1 | 2 | 3, ...LEVELS[score] }
}
