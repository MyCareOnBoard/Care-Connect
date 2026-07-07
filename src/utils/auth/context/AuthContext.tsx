import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { setUser } from "@/utils/auth"
import type { AppDispatch, RootState } from "@/store/redux/store"
import { persistor } from "@/store/redux/store"
import {
  loginWithEmail,
  registerWithEmail,
  sendPasswordResetEmail,
  getIdToken,
  removeUserData,
  type LoginResponse,
} from "../services/authService"
import { logoutUser } from "../store/authSlice"
import type { LoginResult } from "../types/login.types"
import { PageLoader } from "@/components/ui/loader"
import { auth } from "@/lib/firebase";
import { clearAuthCache } from "@/lib/axios";
import type { User } from "../types/user.types"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  signup: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  getToken: (forceRefresh?: boolean) => Promise<string | null>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

/**
 * Hook to access authentication context
 */
export const useAuth = () => useContext(AuthContext)

/**
 * Authentication Provider Component
 * Wraps the app to provide auth state to all components
 * Syncs with Redux for state persistence
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()
  const reduxUser = useSelector((state: RootState) => state.auth?.user)
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      const currentFirebaseUser = await new Promise<import('firebase/auth').User | null>(
        (resolve) => {
          const unsub = auth.onAuthStateChanged((u) => { unsub(); resolve(u); });
        }
      );

      if (reduxUser) {
        if (currentFirebaseUser && currentFirebaseUser.uid === reduxUser.uid) {
          setUserState(reduxUser)
          setIsInitialized(true)
          setLoading(false)
          return
        }
        dispatch(setUser(null))
      }

      if (currentFirebaseUser) {
        setUserState({
          uid: currentFirebaseUser.uid,
          email: currentFirebaseUser.email || '',
          fullName: currentFirebaseUser.displayName || '',
          emailVerified: currentFirebaseUser.emailVerified,
          createdAt: currentFirebaseUser.metadata.creationTime
            ? new Date(currentFirebaseUser.metadata.creationTime)
            : new Date(),
          updatedAt: new Date(),
          photoURL: currentFirebaseUser.photoURL || undefined,
          phoneNumber: currentFirebaseUser.phoneNumber || undefined,
        })
      }

      setIsInitialized(true)
      setLoading(false)
    }

    initAuth()
  }, []) // Only run once on mount

  // Sync local state when Redux state changes (after login/signup)
  useEffect(() => {
    if (isInitialized) {
      setUserState(reduxUser ?? null)
    }
  }, [reduxUser, isInitialized])

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const response: LoginResponse = await loginWithEmail(email, password)

    if (response.status === 'error') {
      console.error('[AuthContext] Login failed:', response.error)
      throw new Error(response.error || "Login failed")
    }

    setUserState(response.user)
    dispatch(setUser(response.user))

    return response
  }

  const signup = async (email: string, password: string, fullName: string) => {
    const response = await registerWithEmail(fullName, email, password)

    if (!response.success || !response.user) {
      console.error('[AuthContext] Signup failed:', response.error)
      throw new Error(response.error || "Registration failed")
    }

    setUserState(response.user)
    dispatch(setUser(response.user))
  }

  const logout = async () => {
    await dispatch(logoutUser())  // Firebase signOut + triggers root reducer reset (clears all RTK Query caches)
    clearAuthCache()
    removeUserData()
    await persistor.purge()       // clears redux-persist localStorage keys (auth)
    setUserState(null)
  }

  const resetPassword = async (email: string) => {
    const response = await sendPasswordResetEmail(email)

    if (!response.success) {
      throw new Error(response.error || "Failed to send reset email")
    }
  }

  const getToken = async (forceRefresh = false) => {
    return await getIdToken(forceRefresh)
  }

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    getToken,
  }

  // Show loader while checking auth state
  if (loading) {
    return <PageLoader text="Checking authentication..." />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
