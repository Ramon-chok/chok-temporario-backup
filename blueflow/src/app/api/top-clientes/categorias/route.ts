import { NextResponse } from 'next/server'
import { buscarCategoriasTop20, buscarVendedoresPorSupervisor } from '@/lib/excel-service'
import { getSessionUserFromRequest } from '@/lib/session'

export const maxDuration = 45

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vendedor = searchParams.get('vendedor')
    const equipe = searchParams.get('equipe')
    const gerencia = searchParams.get('gerencia')
    const perfil = sessionUser.perfil
    const codigoUsuario = Number.parseInt(sessionUser.usuario, 10)
    const usuarioNumerico = Number.isFinite(codigoUsuario) ? codigoUsuario : null

    if ((perfil === 'vendedor' || perfil === 'supervisor') && usuarioNumerico === null) {
      return NextResponse.json({ error: 'Usuário inválido para o perfil logado' }, { status: 400 })
    }

    let vendedorEfetivo = vendedor ? Number.parseInt(vendedor, 10) : null
    let equipeEfetiva = equipe ? Number.parseInt(equipe, 10) : null
    let gerenciaEfetiva = gerencia || null

    if (vendedor && (vendedorEfetivo === null || Number.isNaN(vendedorEfetivo))) {
      return NextResponse.json({ error: 'Código do vendedor inválido' }, { status: 400 })
    }

    if (equipe && (equipeEfetiva === null || Number.isNaN(equipeEfetiva))) {
      return NextResponse.json({ error: 'Código da equipe inválido' }, { status: 400 })
    }

    if (perfil === 'vendedor') {
      vendedorEfetivo = usuarioNumerico
      equipeEfetiva = null
      gerenciaEfetiva = null
    }

    if (perfil === 'supervisor') {
      if (usuarioNumerico === null) {
        return NextResponse.json({ error: 'Usuário inválido para o perfil logado' }, { status: 400 })
      }

      const codigoSupervisor = usuarioNumerico
      equipeEfetiva = usuarioNumerico
      gerenciaEfetiva = null

      if (vendedorEfetivo !== null) {
        const vendedoresEquipe = await buscarVendedoresPorSupervisor(codigoSupervisor)
        if (!vendedoresEquipe) {
          return NextResponse.json({ error: 'Erro ao validar equipe do supervisor' }, { status: 500 })
        }
        const pertenceEquipe = vendedoresEquipe.some((item) => item.codigo === vendedorEfetivo)
        if (!pertenceEquipe) {
          return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }
      }
    }

    const categorias = await buscarCategoriasTop20(vendedorEfetivo, equipeEfetiva, gerenciaEfetiva)

    return NextResponse.json(categorias, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('Erro ao buscar categorias do top 20:', error)
    return NextResponse.json({ error: 'Erro interno ao buscar categorias do top 20' }, { status: 500 })
  }
}
