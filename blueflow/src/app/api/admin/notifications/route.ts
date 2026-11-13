import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUserFromRequest } from '@/lib/session'
import { normalizeNotificationMessageInput } from '@/lib/notificationContent'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser || sessionUser.perfil !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as {
      mensagem?: unknown
      destinatarios?: unknown
    } | null
    const mensagem = normalizeNotificationMessageInput(String(body?.mensagem || ''))
    const destinatariosRaw = Array.isArray(body?.destinatarios)
      ? (body.destinatarios as unknown[])
      : []
    const destinatarios = destinatariosRaw
      .map((item) => String(item || '').trim())
      .filter(Boolean)

    if (!mensagem) {
      return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
    }

    if (destinatarios.length === 0) {
      return NextResponse.json({ error: 'Selecione ao menos um usuário' }, { status: 400 })
    }

    const payload = destinatarios.map((usuario) => ({
      user_id: usuario,
      mensagem,
      status: 'nao_lida',
      chamado_id: null,
    }))

    const { error } = await supabaseAdmin.from('notificacoes').insert(payload)
    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, total: destinatarios.length })
  } catch (error) {
    console.error('Erro ao enviar notificações (admin):', error)
    return NextResponse.json({ error: 'Erro ao enviar notificação em massa' }, { status: 500 })
  }
}