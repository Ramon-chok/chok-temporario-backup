import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSessionToken, getSessionCookieOptions, type SessionUser } from '@/lib/session'
import { hashPassword, needsPasswordRehash, verifyPassword } from '@/lib/password'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const usuario = String(body?.usuario || '').trim()
    const senha = String(body?.senha || '')

    if (!usuario || !senha) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('usuario, perfil, senha_hash')
      .eq('usuario', usuario)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 })
    }

    const senhaValida = verifyPassword(senha, data.senha_hash)

    if (!senhaValida) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }

    if (needsPasswordRehash(data.senha_hash)) {
      const { error: updateError } = await supabaseAdmin
        .from('usuarios')
        .update({ senha_hash: hashPassword(senha) })
        .eq('usuario', data.usuario)

      if (updateError) {
        console.error('Erro ao migrar senha legada para hash forte:', updateError)
      }
    }

    const user: SessionUser = {
      usuario: data.usuario,
      perfil: data.perfil,
    }

    const response = NextResponse.json({ user })
    response.cookies.set('blueflow_session', createSessionToken(user), getSessionCookieOptions())
    return response
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json({ error: 'Erro interno ao autenticar' }, { status: 500 })
  }
}