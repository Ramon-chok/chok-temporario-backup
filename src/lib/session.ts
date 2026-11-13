import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export interface SessionUser {
  usuario: string
  perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin'
}

const SESSION_COOKIE_NAME = 'blueflow_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12
let warnedSessionSecretFallback = false

function getSessionSecret() {
  const authSessionSecret = process.env.AUTH_SESSION_SECRET
  const serviceRoleSecret = process.env.SUPABASE_SERVICE_ROLE_KEY
  const secret = authSessionSecret || serviceRoleSecret

  if (!secret) {
    throw new Error('Segredo de sessão não configurado (AUTH_SESSION_SECRET)')
  }

  if (!authSessionSecret && process.env.NODE_ENV === 'production' && !warnedSessionSecretFallback) {
    warnedSessionSecretFallback = true
    console.warn(
      '[SESSION] AUTH_SESSION_SECRET ausente em producao. Usando SUPABASE_SERVICE_ROLE_KEY como fallback temporario.'
    )
  }

  return secret
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(payload: string) {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url')
}

export function createSessionToken(user: SessionUser) {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  })

  const encodedPayload = base64UrlEncode(payload)
  const signature = signPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifySessionToken(token: string | null | undefined): SessionUser | null {
  if (!token) return null

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = signPayload(encodedPayload)
  const expectedBuffer = Buffer.from(expectedSignature)
  const actualBuffer = Buffer.from(signature)

  if (expectedBuffer.length !== actualBuffer.length) return null
  if (!timingSafeEqual(expectedBuffer, actualBuffer)) return null

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionUser & { exp?: number }
    if (!payload.usuario || !payload.perfil || typeof payload.exp !== 'number') {
      return null
    }
    if (payload.exp < Date.now()) {
      return null
    }

    return {
      usuario: payload.usuario,
      perfil: payload.perfil,
    }
  } catch {
    return null
  }
}

export async function getSessionUserFromRequest() {
  const cookieStore = await cookies()
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}

export function getSessionCookieOptions(maxAgeSeconds = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

export { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS }