import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUserFromRequest } from '@/lib/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

function isSchemaNotReadyError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: string }).code) : ''
  return code === '42P01' || code === '42703' || code === 'PGRST204' || code === 'PGRST205'
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSupabaseConfig) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id } = await context.params
    const rowId = Number.parseInt(id, 10)

    if (!Number.isFinite(rowId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const durationSeconds = Number.parseInt(String(body?.durationSeconds ?? '0'), 10)

    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      return NextResponse.json({ error: 'Duração inválida' }, { status: 400 })
    }

    if (sessionUser.perfil !== 'admin') {
      const { data: existingLog, error: existingLogError } = await supabaseAdmin
        .from('page_logs')
        .select('id, user_id')
        .eq('id', rowId)
        .single()

      if (existingLogError || !existingLog) {
        return NextResponse.json({ error: 'Log não encontrado' }, { status: 404 })
      }

      if (existingLog.user_id !== sessionUser.usuario) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
    }

    const { error } = await supabaseAdmin
      .from('page_logs')
      .update({ duration_seconds: durationSeconds })
      .eq('id', rowId)

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json({ success: true, skipped: true })
      }
      console.error('Erro ao atualizar duração do log:', error)
      return NextResponse.json({ error: 'Erro ao atualizar duração' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro no patch de page log:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
