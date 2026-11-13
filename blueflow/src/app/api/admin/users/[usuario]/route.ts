import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUserFromRequest } from '@/lib/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireAdminSession() {
  const sessionUser = await getSessionUserFromRequest()
  if (!sessionUser || sessionUser.perfil !== 'admin') {
    return null
  }
  return sessionUser
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ usuario: string }> }
) {
  try {
    const sessionUser = await requireAdminSession()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { usuario } = await context.params
    const usuarioNormalizado = decodeURIComponent(usuario || '').trim()

    if (!usuarioNormalizado) {
      return NextResponse.json({ error: 'Usuário inválido' }, { status: 400 })
    }

    if (usuarioNormalizado === 'admin') {
      return NextResponse.json({ error: 'Não é possível deletar o usuário admin' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('usuario', usuarioNormalizado)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar usuário (admin):', error)
    return NextResponse.json({ error: 'Erro ao deletar usuário' }, { status: 500 })
  }
}