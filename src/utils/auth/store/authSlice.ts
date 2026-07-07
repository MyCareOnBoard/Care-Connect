/**
 * Auth Redux Slice
 *
 * Manages authentication state in Redux store
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import {
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import type { AuthState, LoginCredentials, SignupCredentials } from '../types'
import { transformFirebaseUser, loginWithEmail } from '@/utils/auth/services/authService'
import { getAuthErrorMessage } from '../helpers/errorMessages'
import type { User } from '../types/user.types'

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

/**
 * Login async thunk
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    const result = await loginWithEmail(credentials.email, credentials.password)
    if (result.status === 'success') {
      return result.user
    }
    return rejectWithValue(result.error || 'Login failed')
  }
)

/**
 * Signup async thunk
 */
export const signupUser = createAsyncThunk(
  'auth/signup',
  async (credentials: SignupCredentials, { rejectWithValue }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      )

      await updateProfile(userCredential.user, {
        displayName: credentials.fullName,
      })

      const user = transformFirebaseUser(userCredential.user)
      user.fullName = credentials.fullName

      return user
    } catch (error: unknown) {
      return rejectWithValue(getAuthErrorMessage(error) || 'Signup failed')
    }
  }
)

/**
 * Logout async thunk
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await signOut(auth)
    } catch (error: unknown) {
      return rejectWithValue(getAuthErrorMessage(error) || 'Logout failed')
    }
  }
)

/**
 * Reset password async thunk
 */
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      await firebaseSendPasswordResetEmail(auth, email)
    } catch (error: unknown) {
      return rejectWithValue(getAuthErrorMessage(error) || 'Password reset failed')
    }
  }
)

/**
 * Check auth state async thunk
 */
export const checkAuthState = createAsyncThunk(
  'auth/checkState',
  async () => {
    return new Promise<User | null>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(
        (firebaseUser: FirebaseUser | null) => {
          unsubscribe()
          if (firebaseUser) {
            resolve(transformFirebaseUser(firebaseUser))
          } else {
            resolve(null)
          }
        },
        () => {
          unsubscribe()
          resolve(null)
        }
      )
    })
  }
)

// Create slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = false
        state.error = (action.payload as string) ?? 'Login failed'
      })

    // Signup
    builder
      .addCase(signupUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false
        state.user = null
        state.isAuthenticated = false
        state.error = null
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Reset password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Check auth state
    builder
      .addCase(checkAuthState.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = !!action.payload
        state.isLoading = false
      })
  },
})

export const { clearError, setUser } = authSlice.actions
export default authSlice.reducer
