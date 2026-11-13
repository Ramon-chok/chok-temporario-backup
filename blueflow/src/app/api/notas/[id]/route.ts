import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUserFromRequest } from '@/lib/session'

// Limite de caracteres
const LIMITE_TITULO = 100
const LIMITE_CONTEUDO = 500

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * PATCH /api/notas/[id]
 * Atualiza uma nota existente
 * Body: { titulo?: string, conteudo?: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { id } = await params

    const usuarioCodigo = sessionUser.usuario

    // Validar corpo da requisição
    const body = await request.json()
    const { titulo, conteudo } = body

    // Pelo menos um campo deve ser informado
    if (!titulo && !conteudo) {
      return NextResponse.json(
        { error: 'Informe pelo menos um campo para atualizar (titulo ou conteudo)' },
        { status: 400 }
      )
    }

    // Montar objeto de atualização
    const updates: Partial<{ titulo: string; conteudo: string }> = {}

    if (titulo !== undefined) {
      if (typeof titulo !== 'string' || titulo.trim().length === 0) {
        return NextResponse.json(
          { error: 'Título inválido' },
          { status: 400 }
        )
      }
      if (titulo.length > LIMITE_TITULO) {
        return NextResponse.json(
          { error: `Título deve ter no máximo ${LIMITE_TITULO} caracteres` },
          { status: 400 }
        )
      }
      updates.titulo = titulo.trim()
    }

    if (conteudo !== undefined) {
      if (typeof conteudo !== 'string' || conteudo.trim().length === 0) {
        return NextResponse.json(
          { error: 'Conteúdo inválido' },
          { status: 400 }
        )
      }
      if (conteudo.length > LIMITE_CONTEUDO) {
        return NextResponse.json(
          { error: `Conteúdo deve ter no máximo ${LIMITE_CONTEUDO} caracteres` },
          { status: 400 }
        )
      }
      updates.conteudo = conteudo.trim()
    }

    // Verificar se nota existe e pertence ao usuário
    const { data: notaExistente, error: checkError } = await supabaseAdmin
      .from('notas_vendedor')
      .select('id, usuario_codigo')
      .eq('id', id)
      .single()

    if (checkError || !notaExistente) {
      return NextResponse.json(
        { error: 'Nota não encontrada' },
        { status: 404 }
      )
    }

    if (notaExistente.usuario_codigo !== usuarioCodigo) {
      return NextResponse.json(
        { error: 'Você não tem permissão para editar esta nota' },
        { status: 403 }
      )
    }

    // Atualizar nota
    const { data: notaAtualizada, error: updateError } = await supabaseAdmin
      .from('notas_vendedor')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Erro ao atualizar nota:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar nota' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      nota: notaAtualizada,
      message: 'Nota atualizada com sucesso',
    })
  } catch (error) {
    console.error('❌ Erro no PATCH /api/notas/[id]:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notas/[id]
 * Deleta uma nota
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { id } = await params

    const usuarioCodigo = sessionUser.usuario

    // Verificar se nota existe e pertence ao usuário
    const { data: notaExistente, error: checkError } = await supabaseAdmin
      .from('notas_vendedor')
      .select('id, usuario_codigo')
      .eq('id', id)
      .single()

    if (checkError || !notaExistente) {
      return NextResponse.json(
        { error: 'Nota não encontrada' },
        { status: 404 }
      )
    }

    if (notaExistente.usuario_codigo !== usuarioCodigo) {
      return NextResponse.json(
        { error: 'Você não tem permissão para deletar esta nota' },
        { status: 403 }
      )
    }

    // Deletar nota
    const { error: deleteError } = await supabaseAdmin
      .from('notas_vendedor')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('❌ Erro ao deletar nota:', deleteError)
      return NextResponse.json(
        { error: 'Erro ao deletar nota' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Nota deletada com sucesso',
    })
  } catch (error) {
    console.error('❌ Erro no DELETE /api/notas/[id]:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
