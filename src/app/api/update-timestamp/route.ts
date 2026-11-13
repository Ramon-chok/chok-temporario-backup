import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUserFromRequest } from '@/lib/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser || sessionUser.perfil !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const agora = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('config')
      .upsert({ key: 'ultima_atualizacao', value: agora })

    if (error) throw error

    return NextResponse.json({ success: true, timestamp: agora })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao atualizar timestamp: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
