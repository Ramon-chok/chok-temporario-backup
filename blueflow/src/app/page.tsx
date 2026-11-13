'use client'

import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export default function Home() {
  const { user, isLoading } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    }
  }, [user, isLoading, router])

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
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  return null
}
