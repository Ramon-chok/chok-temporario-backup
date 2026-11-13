import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUserFromRequest } from '@/lib/session'

// Limite máximo de notas por usuário
const LIMITE_NOTAS = 20

// Limite de caracteres
const LIMITE_TITULO = 100
const LIMITE_CONTEUDO = 500

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/notas
 * Lista todas as notas do usuário autenticado (mês atual)
 */
export async function GET() {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }
    const usuarioCodigo = sessionUser.usuario

    // Buscar notas do usuário (mês atual)
    const mesAtual = new Date().getMonth() + 1
    const anoAtual = new Date().getFullYear()

    const { data: notas, error: notasError } = await supabaseAdmin
      .from('notas_vendedor')
      .select('*')
      .eq('usuario_codigo', usuarioCodigo)
      .eq('mes_criacao', mesAtual)
      .eq('ano_criacao', anoAtual)
      .order('criado_em', { ascending: false })

    if (notasError) {
      console.error('❌ Erro ao buscar notas:', notasError)
      return NextResponse.json(
        { error: 'Erro ao buscar notas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      notas: notas || [],
      total: notas?.length || 0,
      limite: LIMITE_NOTAS,
    })
  } catch (error) {
    console.error('❌ Erro no GET /api/notas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notas
 * Cria uma nova nota
 * Body: { titulo: string, conteudo: string }
 */
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }
    const usuarioCodigo = sessionUser.usuario

    // Validar corpo da requisição
    const body = await request.json()
    const { titulo, conteudo } = body

    if (!titulo || typeof titulo !== 'string' || titulo.trim().length === 0) {
      return NextResponse.json(
        { error: 'Título é obrigatório' },
        { status: 400 }
      )
    }

    if (!conteudo || typeof conteudo !== 'string' || conteudo.trim().length === 0) {
      return NextResponse.json(
        { error: 'Conteúdo é obrigatório' },
        { status: 400 }
      )
    }

    // Validar tamanhos
    if (titulo.length > LIMITE_TITULO) {
      return NextResponse.json(
        { error: `Título deve ter no máximo ${LIMITE_TITULO} caracteres` },
        { status: 400 }
      )
    }

    if (conteudo.length > LIMITE_CONTEUDO) {
      return NextResponse.json(
        { error: `Conteúdo deve ter no máximo ${LIMITE_CONTEUDO} caracteres` },
        { status: 400 }
      )
    }

    // Verificar limite de notas (20 notas por usuário)
    const mesAtual = new Date().getMonth() + 1
    const anoAtual = new Date().getFullYear()

    const { count, error: countError } = await supabaseAdmin
      .from('notas_vendedor')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_codigo', usuarioCodigo)
      .eq('mes_criacao', mesAtual)
      .eq('ano_criacao', anoAtual)

    if (countError) {
      console.error('❌ Erro ao contar notas:', countError)
      return NextResponse.json(
        { error: 'Erro ao verificar limite de notas' },
        { status: 500 }
      )
    }

    if (count !== null && count >= LIMITE_NOTAS) {
      return NextResponse.json(
        { error: `Limite de ${LIMITE_NOTAS} notas atingido` },
        { status: 400 }
      )
    }

    // Criar nota
    const { data: novaNota, error: insertError } = await supabaseAdmin
      .from('notas_vendedor')
      .insert({
        usuario_codigo: usuarioCodigo,
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        mes_criacao: mesAtual,
        ano_criacao: anoAtual,
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Erro ao criar nota:', insertError)
      return NextResponse.json(
        { error: 'Erro ao criar nota' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      nota: novaNota,
      message: 'Nota criada com sucesso',
    }, { status: 201 })
  } catch (error) {
    console.error('❌ Erro no POST /api/notas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
