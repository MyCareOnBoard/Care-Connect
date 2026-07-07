import type { User } from './user.types'

export type LoginResult = { status: 'success'; user: User }

export type LoginErrorResult = {
  status: 'error'
  error: string
}

export type LoginResponse = LoginResult | LoginErrorResult
