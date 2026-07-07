import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/utils/auth'
import { PageLoader } from './ui/loader'
import { auth } from '@/lib/firebase'
import { Routes } from '@/routes/constants'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Requires an active Firebase session.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader text="Checking authentication..." />
  }

  if (!auth.currentUser) {
    return <Navigate to={Routes.auth.login} replace />
  }

  if (!user) {
    return <PageLoader text="Loading your profile..." />
  }

  return <>{children}</>
}
