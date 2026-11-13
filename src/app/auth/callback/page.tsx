'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase/client'
import { usePageTracking } from '@/hooks/usePageTracking'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { theme } = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  usePageTracking('Auth Callback')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // O Supabase lida automaticamente com a URL de callback (#access_token=...)
        // Apenas precisamos aguardar um pouco para a sessão ser estabelecida
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const { data } = await supabase.auth.getSession()

        if (data?.session) {
          // Redirecionado para dashboard com sucesso
          router.push('/dashboard')
        } else {
          setError('Erro ao processar link de login')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao autenticar'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    handleCallback()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="relative h-12 w-40">
              <Image
                src={theme === 'dark' ? '/images/logo-escuro.png' : '/images/logo-claro.png'}
                alt="ChokFlow"
                height={48}
                width={160}
                priority
                className="h-12 w-auto"
              />
            </div>
          </div>
          <p className="text-gray-500">Autenticando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="text-xl font-bold text-red-600">Erro na Autenticação</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Voltar para Login
          </a>
        </div>
      </div>
    )
  }

  return null
}
