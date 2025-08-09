export interface User {
  id: string
  email: string
  taxCode: string
  businessName: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  taxCode: string
  businessName: string
}
