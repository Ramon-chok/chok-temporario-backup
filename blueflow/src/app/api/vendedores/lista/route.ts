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
 * GET /api/vendedores/lista
 * Retorna lista de TODOS os vendedores (código e nome)
 * Para uso nos filtros do perfil gerencia e admin
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

    console.log('[API] Buscando lista de todos os vendedores')

    const gerenciaFiltro = request.nextUrl.searchParams.get('gerencia')
    const vendedoresRaw = await buscarTodosVendedores()

    const vendedoresFiltrados = gerenciaFiltro
      ? (vendedoresRaw || []).filter(
          (v) => normalizeKey(v.gerencia) === normalizeKey(gerenciaFiltro)
        )
      : vendedoresRaw || []

    const vendedores = vendedoresFiltrados
      .map((row) => ({
        codigo: row.codigoVendedor,
        nome: row.nomeVendedor,
      }))
      .filter((v) => v.codigo && v.nome)

    if (!vendedores) {
      return NextResponse.json(
        { error: 'Erro ao buscar lista de vendedores' },
        { status: 500 }
      )
    }

    if (vendedores.length === 0) {
      console.log('[API] Nenhum vendedor encontrado')
      return NextResponse.json({
        vendedores: [],
        count: 0,
      })
    }

    console.log(`[API] Encontrados ${vendedores.length} vendedores`)

    return NextResponse.json({
      vendedores,
      count: vendedores.length,
    })
  } catch (error) {
    console.error('[API] Erro ao buscar lista de vendedores:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar vendedores' },
      { status: 500 }
    )
  }
}
