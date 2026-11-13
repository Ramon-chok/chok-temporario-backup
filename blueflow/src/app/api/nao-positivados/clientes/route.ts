import { NextResponse } from 'next/server'
import { buscarClientesNaoPositivados, buscarVendedoresPorSupervisor } from '@/lib/excel-service'
import { getSessionUserFromRequest } from '@/lib/session'

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
    const categoria = searchParams.get('categoria')
    const perfil = sessionUser.perfil

    const codigoUsuario = parseInt(sessionUser.usuario, 10)
    const usuarioNumerico = !isNaN(codigoUsuario) ? codigoUsuario : null

    if ((perfil === 'vendedor' || perfil === 'supervisor') && usuarioNumerico === null) {
      return NextResponse.json({ error: 'Usuário inválido para o perfil logado' }, { status: 400 })
    }

    let vendedorEfetivo = vendedor ? parseInt(vendedor, 10) : null
    let equipeEfetiva = equipe ? parseInt(equipe, 10) : null
    const gerenciaEfetiva = gerencia || null

    if (vendedor && (vendedorEfetivo === null || Number.isNaN(vendedorEfetivo))) {
      return NextResponse.json({ error: 'Código do vendedor inválido' }, { status: 400 })
    }

    if (equipe && (equipeEfetiva === null || Number.isNaN(equipeEfetiva))) {
      return NextResponse.json({ error: 'Código da equipe inválido' }, { status: 400 })
    }

    if (perfil === 'vendedor') {
      vendedorEfetivo = usuarioNumerico
      equipeEfetiva = null
    }

    if (perfil === 'supervisor') {
      if (usuarioNumerico === null) {
        return NextResponse.json({ error: 'Usuário inválido para o perfil logado' }, { status: 400 })
      }

      const codigoSupervisor = usuarioNumerico
      equipeEfetiva = usuarioNumerico

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

    let clientes = await buscarClientesNaoPositivados(
      vendedorEfetivo,
      equipeEfetiva,
      gerenciaEfetiva,
      categoria || null,
      perfil
    )

    // Consolidar status e deduplicar clientes para todos os filtros
    const unique = new Map()
    for (const c of clientes) {
      if (!unique.has(c.codigoCliente)) {
        unique.set(c.codigoCliente, {
          ...c,
          nomeVendedor: c.nomeVendedor || null,
          positivado: c.valor > 0,
        })
      } else {
        const prev = unique.get(c.codigoCliente)
        unique.set(c.codigoCliente, {
          ...prev,
          valor: c.valor,
          positivado: c.valor > 0,
        })
      }
    }
    clientes = Array.from(unique.values())

    return NextResponse.json(clientes)
  } catch (error) {
    console.error('Erro ao buscar clientes não positivados:', error)
    return NextResponse.json({ error: 'Erro interno ao buscar clientes não positivados' }, { status: 500 })
  }
}
