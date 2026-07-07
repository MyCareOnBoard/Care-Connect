/**
 * Auth Selectors
 *
 * Redux selectors for accessing auth state
 */

import type { RootState } from '@/store/redux/store'

export const selectUser = (state: RootState) => state.auth?.user ?? null

export const selectIsAuthenticated = (state: RootState) => state.auth?.isAuthenticated ?? false

export const selectIsLoading = (state: RootState) => state.auth?.isLoading ?? false

export const selectError = (state: RootState) => state.auth?.error ?? null
