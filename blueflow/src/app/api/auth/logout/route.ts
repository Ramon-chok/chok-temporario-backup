import { NextResponse } from 'next/server'
import { getSessionCookieOptions } from '@/lib/session'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('blueflow_session', '', {
    ...getSessionCookieOptions(0),
    maxAge: 0,
  })
  return response
}