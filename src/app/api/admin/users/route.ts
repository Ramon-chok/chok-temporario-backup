import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUserFromRequest } from '@/lib/session'
import { hashPassword } from '@/lib/password'

type PerfilUsuario = 'vendedor' | 'supervisor' | 'gerencia' | 'admin'

const PERFIS_VALIDOS: PerfilUsuario[] = ['vendedor', 'supervisor', 'gerencia', 'admin']

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

export async function GET() {
  try {
    const sessionUser = await requireAdminSession()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, usuario, perfil, created_at')
      .order('usuario', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ usuarios: data ?? [] })
  } catch (error) {
    console.error('Erro ao carregar usuários (admin):', error)
    return NextResponse.json({ error: 'Erro ao carregar usuários' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireAdminSession()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const usuario = String(body?.usuario || '').trim()
    const perfil = String(body?.perfil || '').trim() as PerfilUsuario
    const senha = String(body?.senha || '')

    if (!usuario || !senha || !perfil) {
      return NextResponse.json({ error: 'Usuário, perfil e senha são obrigatórios' }, { status: 400 })
    }

    if (!PERFIS_VALIDOS.includes(perfil)) {
      return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
    }

    if (senha.length < 4) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 4 caracteres' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('usuarios')
      .upsert(
        {
          usuario,
          perfil,
          senha_hash: hashPassword(senha),
        },
        { onConflict: 'usuario' }
      )
      .select('usuario')

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar usuário (admin):', error)
    return NextResponse.json({ error: 'Erro ao salvar usuário' }, { status: 500 })
  }
}