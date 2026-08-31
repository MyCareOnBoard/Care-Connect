import { createContext, useContext, useState, type ReactNode } from "react"

export type JoinType = "individual" | "company" | ""

interface SignupWizardState {
  fullName: string
  email: string
  phone: string
  joinType: JoinType
  organizationName: string
  organizationType: string
  organizationInterests: string[]
  profession: string
  certifications: string[]
  /** True when this signup started from an agency team-invite link — adds the Availability step. */
  isProfessional: boolean
  /** Team-invite token from the invite link; consumed at the end of onboarding to join the roster. */
  inviteToken: string
}

interface SignupWizardContextType extends SignupWizardState {
  setFullName: (value: string) => void
  setEmail: (value: string) => void
  setPhone: (value: string) => void
  setJoinType: (value: JoinType) => void
  setOrganizationName: (value: string) => void
  setOrganizationType: (value: string) => void
  setOrganizationInterests: (value: string[]) => void
  setProfession: (value: string) => void
  setCertifications: (value: string[]) => void
  setIsProfessional: (value: boolean) => void
  setInviteToken: (value: string) => void
  reset: () => void
}

const initialState: SignupWizardState = {
  fullName: "",
  email: "",
  phone: "",
  joinType: "",
  organizationName: "",
  organizationType: "",
  organizationInterests: [],
  profession: "",
  certifications: [],
  isProfessional: false,
  inviteToken: "",
}

const SignupWizardContext = createContext<SignupWizardContextType>({} as SignupWizardContextType)

/**
 * Hook to access/update in-progress signup wizard state across steps.
 *
 * Persisted to sessionStorage. This used to be memory-only, which quietly broke
 * team-invite signups: a refresh mid-wizard dropped `inviteToken` and
 * `isProfessional`, so the invitee was routed down the ordinary individual path,
 * never saw the Availability step, and `acceptInvite` was never called — they
 * got an account but were never attached to the agency's roster, while the
 * agency still saw them as pending. It looked like a successful signup.
 *
 * sessionStorage rather than localStorage: an in-progress signup is tab-scoped,
 * and an invite token should not outlive the tab.
 */
export const useSignupWizard = () => useContext(SignupWizardContext)

const STORAGE_KEY = "careconnect_signup_wizard"

function readPersisted(): SignupWizardState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    // Merge over the defaults so a stored blob from an older shape cannot leave
    // a field undefined.
    return { ...initialState, ...(JSON.parse(raw) as Partial<SignupWizardState>) }
  } catch {
    // Private mode, disabled storage, or malformed JSON — start clean.
    return initialState
  }
}

function writePersisted(state: SignupWizardState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable: the wizard still works within a single page load.
  }
}

export function clearSignupWizardStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing to clear */
  }
}

export function SignupWizardProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: read once on mount rather than on every render.
  const [state, setState] = useState<SignupWizardState>(readPersisted)

  /**
   * One write path, so no setter can forget to persist.
   *
   * The write sits inside the updater deliberately: it needs the merged result,
   * and reading `state` from the closure instead would drop a field whenever two
   * setters are batched in the same tick (the invite landing calls six in a row).
   * Persisting here is idempotent — it stores exactly the value being returned —
   * so a double-invoked updater under StrictMode is harmless.
   */
  const update = (patch: Partial<SignupWizardState>) =>
    setState((current) => {
      const next = { ...current, ...patch }
      writePersisted(next)
      return next
    })

  const value: SignupWizardContextType = {
    ...state,
    setFullName: (fullName) => update({ fullName }),
    setEmail: (email) => update({ email }),
    setPhone: (phone) => update({ phone }),
    setJoinType: (joinType) => update({ joinType }),
    setOrganizationName: (organizationName) => update({ organizationName }),
    setOrganizationType: (organizationType) => update({ organizationType }),
    setOrganizationInterests: (organizationInterests) => update({ organizationInterests }),
    setProfession: (profession) => update({ profession }),
    setCertifications: (certifications) => update({ certifications }),
    setIsProfessional: (isProfessional) => update({ isProfessional }),
    setInviteToken: (inviteToken) => update({ inviteToken }),
    reset: () => {
      clearSignupWizardStorage()
      setState(initialState)
    },
  }

  return <SignupWizardContext.Provider value={value}>{children}</SignupWizardContext.Provider>
}
