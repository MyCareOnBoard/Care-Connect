import { createContext, useContext, useState, type ReactNode } from "react"

export type JoinType = "individual" | "company" | ""

interface SignupWizardState {
  fullName: string
  email: string
  joinType: JoinType
  organizationName: string
  organizationType: string
  organizationInterests: string[]
  profession: string
  certifications: string[]
}

interface SignupWizardContextType extends SignupWizardState {
  setFullName: (value: string) => void
  setEmail: (value: string) => void
  setJoinType: (value: JoinType) => void
  setOrganizationName: (value: string) => void
  setOrganizationType: (value: string) => void
  setOrganizationInterests: (value: string[]) => void
  setProfession: (value: string) => void
  setCertifications: (value: string[]) => void
  reset: () => void
}

const initialState: SignupWizardState = {
  fullName: "",
  email: "",
  joinType: "",
  organizationName: "",
  organizationType: "",
  organizationInterests: [],
  profession: "",
  certifications: [],
}

const SignupWizardContext = createContext<SignupWizardContextType>({} as SignupWizardContextType)

/**
 * Hook to access/update in-progress signup wizard state across steps.
 * Not persisted — a page refresh mid-wizard restarts collection.
 */
export const useSignupWizard = () => useContext(SignupWizardContext)

export function SignupWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SignupWizardState>(initialState)

  const value: SignupWizardContextType = {
    ...state,
    setFullName: (fullName) => setState((s) => ({ ...s, fullName })),
    setEmail: (email) => setState((s) => ({ ...s, email })),
    setJoinType: (joinType) => setState((s) => ({ ...s, joinType })),
    setOrganizationName: (organizationName) => setState((s) => ({ ...s, organizationName })),
    setOrganizationType: (organizationType) => setState((s) => ({ ...s, organizationType })),
    setOrganizationInterests: (organizationInterests) =>
      setState((s) => ({ ...s, organizationInterests })),
    setProfession: (profession) => setState((s) => ({ ...s, profession })),
    setCertifications: (certifications) => setState((s) => ({ ...s, certifications })),
    reset: () => setState(initialState),
  }

  return <SignupWizardContext.Provider value={value}>{children}</SignupWizardContext.Provider>
}
