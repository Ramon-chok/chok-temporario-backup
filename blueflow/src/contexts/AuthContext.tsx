'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface User {
  usuario: string
  perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin'
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signIn: (usuario: string, senha: string) => Promise<{ error: string | null }>
  signInDemo: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ativo = true

    const carregarSessao = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!ativo) {
          return
        }

        if (response.ok) {
          const data = (await response.json()) as { user?: User | null }
          setUser(data.user ?? null)
          if (data.user) {
            localStorage.setItem('blueflow_user', JSON.stringify(data.user))
          } else {
            localStorage.removeItem('blueflow_user')
          }
        } else {
          setUser(null)
          localStorage.removeItem('blueflow_user')
        }

        setIsLoading(false)
      } catch {
        if (ativo) {
          setUser(null)
          setIsLoading(false)
          localStorage.removeItem('blueflow_user')
        }
      }
    }

    void carregarSessao()

    return () => {
      ativo = false
    }
  }, [])

  const signIn = async (usuario: string, senha: string) => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usuario, senha }),
      })

      const payload = (await response.json()) as { user?: User; error?: string }

      if (!response.ok || !payload.user) {
        return { error: payload.error || 'Erro ao fazer login' }
      }

      const userData: User = payload.user

      setUser(userData)
      localStorage.setItem('blueflow_user', JSON.stringify(userData))

      return { error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login'
      return { error: message }
    } finally {
      setIsLoading(false)
    }
  }

  const signInDemo = () => {
    const userData: User = {
      usuario: 'demo',
      perfil: 'gerencia',
    }

    setUser(userData)
    localStorage.setItem('blueflow_user', JSON.stringify(userData))
  }

  const signOut = () => {
    setUser(null)
    localStorage.removeItem('blueflow_user')
    void fetch('/api/auth/logout', { method: 'POST' })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signInDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext deve ser usado dentro de AuthProvider')
  }
  return context
}
