import { NextRequest, NextResponse } from 'next/server'
import {
  buscarCategoriasPorVendedor,
  buscarCategoriasPorSupervisor,
  buscarCategoriasPorGerencia,
  buscarVendedoresPorSupervisor,
  CategoriaData,
} from '@/lib/excel-service'
import { getSessionUserFromRequest } from '@/lib/session'

export const maxDuration = 45

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const vendedorParam = searchParams.get('vendedor')
    const equipeParam = searchParams.get('equipe')
    const gerencia = searchParams.get('gerencia')

    const vendedor = vendedorParam ? parseInt(vendedorParam, 10) : null
    const equipe = equipeParam ? parseInt(equipeParam, 10) : null

    if (vendedorParam && (vendedor === null || Number.isNaN(vendedor))) {
      return NextResponse.json(
        { error: 'Código do vendedor inválido' },
        { status: 400 }
      )
    }

    if (equipeParam && (equipe === null || Number.isNaN(equipe))) {
      return NextResponse.json(
        { error: 'Código da equipe inválido' },
        { status: 400 }
      )
    }

    let categorias: CategoriaData[] | null = null

    if (sessionUser.perfil === 'vendedor') {
      const codigoUsuario = Number.parseInt(sessionUser.usuario, 10)
      if (!Number.isFinite(codigoUsuario)) {
        return NextResponse.json({ error: 'Usuário inválido para o perfil logado' }, { status: 400 })
      }

      categorias = await buscarCategoriasPorVendedor(codigoUsuario)
    } else if (sessionUser.perfil === 'supervisor') {
      const codigoSupervisor = Number.parseInt(sessionUser.usuario, 10)
      if (!Number.isFinite(codigoSupervisor)) {
        return NextResponse.json({ error: 'Usuário inválido para o perfil logado' }, { status: 400 })
      }

      // Se o supervisor filtrar vendedor, valida se ele pertence à própria equipe.
      if (vendedor !== null) {
        const vendedoresEquipe = await buscarVendedoresPorSupervisor(codigoSupervisor)
        if (!vendedoresEquipe) {
          return NextResponse.json({ error: 'Erro ao validar equipe do supervisor' }, { status: 500 })
        }
        const pertenceEquipe = vendedoresEquipe.some((item) => item.codigo === vendedor)
        if (!pertenceEquipe) {
          return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }
        categorias = await buscarCategoriasPorVendedor(vendedor)
      } else {
        categorias = await buscarCategoriasPorSupervisor(codigoSupervisor)
      }
    } else if (sessionUser.perfil === 'gerencia' || sessionUser.perfil === 'admin') {
      // Prioridade: vendedor > equipe > gerencia > todas
      if (vendedor !== null) {
        categorias = await buscarCategoriasPorVendedor(vendedor)
      } else if (equipe !== null) {
        categorias = await buscarCategoriasPorSupervisor(equipe)
      } else {
        categorias = await buscarCategoriasPorGerencia(gerencia)
      }
    } else {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (!categorias) {
      return NextResponse.json(
        { error: 'Erro ao buscar categorias' },
        { status: 500 }
      )
    }

    return NextResponse.json(categorias, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Accel-Expires': '0',
      },
    })
  } catch (error) {
    console.error('Erro na API de categorias:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar categorias' },
      { status: 500 }
    )
  }
}
