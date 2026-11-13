import { NextResponse } from 'next/server'
import { getSessionUserFromRequest } from '@/lib/session'

export async function GET() {
  const user = await getSessionUserFromRequest()

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({ user })
}