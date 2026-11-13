'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const SESSION_STORAGE_KEY = 'blueflow_tracking_session_id'

function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getSessionId() {
  if (typeof window === 'undefined') return generateSessionId()

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing

  const created = generateSessionId()
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, created)
  return created
}

export function usePageTracking(pageName: string) {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const logIdRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)

  useEffect(() => {
    if (!pathname || isLoading) return
    if (!user?.usuario) return
    if (user.perfil === 'admin') return

    startedAtRef.current = Date.now()
    let isMounted = true
    logIdRef.current = null

    const payload = {
      userId: user.usuario,
      userEmail: null,
      pagePath: pathname,
      pageName,
      sessionId: getSessionId(),
    }

    void fetch('/api/page-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok || !isMounted) return
        const data = (await res.json()) as { id?: number }
        if (typeof data.id === 'number') {
          logIdRef.current = data.id
        }
      })
      .catch(() => {
        // Tracking nunca deve quebrar a UI.
      })

    return () => {
      isMounted = false
      const logId = logIdRef.current
      if (!logId) return

      const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
      const body = JSON.stringify({ durationSeconds: elapsed })

      // keepalive ajuda a enviar o update mesmo durante navegação/fechamento de aba.
      void fetch(`/api/page-logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {
        // Tracking nunca deve quebrar a UI.
      })
    }
  }, [pathname, pageName, isLoading, user?.usuario, user?.perfil])
}
