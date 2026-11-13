import { buscarVendedoresPorSupervisor } from '@/lib/excel-service'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserFromRequest } from '@/lib/session'

/**
 * GET /api/supervisor/vendedores?codigo=X
 * Retorna lista de vendedores da equipe do supervisor
 */
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const codigoParam = searchParams.get('codigo')

    if (!codigoParam) {
      return NextResponse.json(
        { error: 'Código do supervisor é obrigatório' },
        { status: 400 }
      )
    }

    const codigoSupervisor = parseInt(codigoParam, 10)

    if (isNaN(codigoSupervisor)) {
      return NextResponse.json(
        { error: 'Código do supervisor inválido' },
        { status: 400 }
      )
    }

    if (sessionUser.perfil === 'vendedor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (sessionUser.perfil === 'supervisor') {
      const codigoSessao = Number.parseInt(sessionUser.usuario, 10)
      if (!Number.isFinite(codigoSessao) || codigoSessao !== codigoSupervisor) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
    }

    if (sessionUser.perfil !== 'supervisor' && sessionUser.perfil !== 'gerencia' && sessionUser.perfil !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    console.log(`[API] Buscando vendedores do supervisor ${codigoSupervisor}`)

    const vendedores = await buscarVendedoresPorSupervisor(codigoSupervisor)

    if (!vendedores) {
      return NextResponse.json(
        { error: 'Erro ao buscar vendedores do supervisor' },
        { status: 500 }
      )
    }

    if (vendedores.length === 0) {
      console.log(`[API] Nenhum vendedor encontrado para supervisor ${codigoSupervisor}`)
      return NextResponse.json({
        vendedores: [],
        count: 0,
      })
    }

    console.log(`[API] Encontrados ${vendedores.length} vendedores para supervisor ${codigoSupervisor}`)

    return NextResponse.json({
      vendedores,
      count: vendedores.length,
    })
  } catch (error) {
    console.error('[API] Erro ao buscar vendedores do supervisor:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar vendedores' },
      { status: 500 }
    )
  }
}
