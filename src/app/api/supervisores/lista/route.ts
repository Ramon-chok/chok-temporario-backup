import { buscarTodosVendedores } from '@/lib/excel-service'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserFromRequest } from '@/lib/session'

function normalizeKey(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * GET /api/supervisores/lista
 * Retorna lista de códigos únicos de supervisores
 * Para uso no filtro Equipe do perfil gerencia e admin
 */
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (sessionUser.perfil !== 'gerencia' && sessionUser.perfil !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    console.log('[API] Buscando lista de supervisores')

    const gerenciaFilter = request.nextUrl.searchParams.get('gerencia')
    const vendedores = await buscarTodosVendedores()

    if (!vendedores) {
      return NextResponse.json(
        { error: 'Erro ao buscar lista de supervisores' },
        { status: 500 }
      )
    }

    const base = gerenciaFilter
      ? vendedores.filter((v) => normalizeKey(v.gerencia) === normalizeKey(gerenciaFilter))
      : vendedores

    const supervisoresSet = new Set<number>()
    base.forEach((v) => {
      if (v.supervisor !== null && !isNaN(v.supervisor)) {
        supervisoresSet.add(v.supervisor)
      }
    })

    const supervisores = Array.from(supervisoresSet).sort((a, b) => a - b)

    if (supervisores.length === 0) {
      console.log('[API] Nenhum supervisor encontrado')
      return NextResponse.json({
        supervisores: [],
        count: 0,
      })
    }

    console.log(`[API] Encontrados ${supervisores.length} supervisores`)

    return NextResponse.json({
      supervisores,
      count: supervisores.length,
    })
  } catch (error) {
    console.error('[API] Erro ao buscar lista de supervisores:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar supervisores' },
      { status: 500 }
    )
  }
}
