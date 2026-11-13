import {
  buscarClientesNaoPositivados,
  buscarVendedoresPorSupervisor,
  ClienteNaoPositivadoData,
} from '@/lib/excel-service'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserFromRequest } from '@/lib/session'

export const maxDuration = 45

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const vendedorParam = request.nextUrl.searchParams.get('vendedor')
    const equipeParam = request.nextUrl.searchParams.get('equipe')
    const gerenciaParam = request.nextUrl.searchParams.get('gerencia')
    const categoriaParam = request.nextUrl.searchParams.get('categoria')

    let vendedor = vendedorParam ? parseInt(vendedorParam, 10) : null
    let equipe = equipeParam ? parseInt(equipeParam, 10) : null
    let gerencia = gerenciaParam || null
    const categoria = categoriaParam || null

    if (vendedorParam && (vendedor === null || Number.isNaN(vendedor))) {
      return NextResponse.json({ error: 'Código do vendedor inválido' }, { status: 400 })
    }

    if (equipeParam && (equipe === null || Number.isNaN(equipe))) {
      return NextResponse.json({ error: 'Código da equipe inválido' }, { status: 400 })
    }

    const perfil = sessionUser.perfil
    const codigoUsuario = Number.parseInt(sessionUser.usuario, 10)
    const usuarioNumerico = Number.isFinite(codigoUsuario) ? codigoUsuario : null

    if ((perfil === 'vendedor' || perfil === 'supervisor') && usuarioNumerico === null) {
      return NextResponse.json({ error: 'Usuário inválido para o perfil logado' }, { status: 400 })
    }

    if (perfil === 'vendedor') {
      vendedor = usuarioNumerico
      equipe = null
      gerencia = null
    } else if (perfil === 'supervisor') {
      if (usuarioNumerico === null) {
        return NextResponse.json({ error: 'Usuário inválido para o perfil logado' }, { status: 400 })
      }

      const codigoSupervisor = usuarioNumerico
      equipe = usuarioNumerico
      gerencia = null

      if (vendedor !== null) {
        const vendedoresEquipe = await buscarVendedoresPorSupervisor(codigoSupervisor)
        if (!vendedoresEquipe) {
          return NextResponse.json({ error: 'Erro ao validar equipe do supervisor' }, { status: 500 })
        }
        const pertenceEquipe = vendedoresEquipe.some((item) => item.codigo === vendedor)
        if (!pertenceEquipe) {
          return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }
      }
    } else if (perfil !== 'gerencia' && perfil !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    console.log('🔍 Buscando clientes não positivados', {
      vendedor,
      equipe,
      gerencia,
      categoria,
    })

    const clientes = await buscarClientesNaoPositivados(vendedor, equipe, gerencia, categoria, null)

    // Determinar se precisa agregar por cliente (supervisor/gerencia/admin sem filtro de vendedor)
    const precisaAgregar = vendedor === null

    let clientesFinais: ClienteNaoPositivadoData[]

    if (precisaAgregar) {
      // Agregar por código de cliente (soma valores de múltiplos vendedores)
      const agregadoMap = new Map<number, ClienteNaoPositivadoData>()

      for (const cliente of clientes) {
        const key = cliente.codigoCliente
        const atual = agregadoMap.get(key)

        if (!atual) {
          agregadoMap.set(key, { ...cliente })
        } else {
          // Soma valores
          atual.valor += cliente.valor
        }
      }

      clientesFinais = Array.from(agregadoMap.values())
    } else {
      clientesFinais = clientes
    }

    // Ordenar: não positivados primeiro, depois por nome
    clientesFinais.sort((a, b) => {
      const aPos = a.valor > 0 ? 1 : 0
      const bPos = b.valor > 0 ? 1 : 0
      if (aPos !== bPos) return aPos - bPos
      return a.nomeCliente.localeCompare(b.nomeCliente, 'pt-BR')
    })

    console.log(`✅ ${clientesFinais.length} clientes retornados`)

    return NextResponse.json(clientesFinais, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Erro ao buscar lista não positivados:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar clientes' },
      { status: 500 }
    )
  }
}
