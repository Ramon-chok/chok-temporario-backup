import { type NextRequest, NextResponse } from 'next/server'

type SessionUser = {
  usuario: string
  perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin'
  exp: number
}

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  return secret || null
}

function base64UrlToBytes(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4))
  const decoded = atob(base64 + pad)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i)
  }
  return bytes
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

async function signPayload(encodedPayload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload))
  return bytesToBase64Url(new Uint8Array(signature))
}

async function verifySessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null
  const secret = getSessionSecret()
  if (!secret) return null

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = await signPayload(encodedPayload, secret)
  if (!safeEqual(expectedSignature, signature)) return null

  try {
    const payloadText = new TextDecoder().decode(base64UrlToBytes(encodedPayload))
    const payload = JSON.parse(payloadText) as SessionUser

    if (!payload.usuario || !payload.perfil || typeof payload.exp !== 'number') {
      return null
    }

    if (payload.exp < Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const search = request.nextUrl.search

  // Rotas públicas que não requerem autenticação
  const publicRoutes = ['/login', '/auth/callback', '/']
  const isPublicRoute = publicRoutes.includes(pathname)

  const session = await verifySessionToken(request.cookies.get('blueflow_session')?.value)

  // Se ja estiver autenticado, evita voltar para login.
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Se nao tiver sessao valida em rota protegida, redireciona para login.
  if (!session && !isPublicRoute) {
    const next = `${pathname}${search}`
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, request.url))
  }

  // Rotas administrativas exigem perfil admin.
  if (pathname.startsWith('/admin') && session && session.perfil !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isPublicRoute) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Corresponde a todos os caminhos de requisição, exceto aqueles que começam com:
     * - api (rotas da API)
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico (favicon)
     * - public (pasta pública)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
