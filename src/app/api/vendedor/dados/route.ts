import { NextRequest, NextResponse } from 'next/server'
import { buscarDadosVendedor, buscarVendedoresPorSupervisor, calcularDadosAgregados, calcularDadosSAR } from '@/lib/excel-service'
import { createClient } from '@supabase/supabase-js'
import { getSessionUserFromRequest } from '@/lib/session'

// Cliente Supabase com privilégios admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Pegar código do vendedor da query
    const codigoVendedor = request.nextUrl.searchParams.get('codigo')

    if (!codigoVendedor) {
      return NextResponse.json(
        { error: 'Código do vendedor não fornecido' },
        { status: 400 }
      )
    }

    const codigo = parseInt(codigoVendedor, 10)
    if (isNaN(codigo)) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      )
    }

    if (sessionUser.perfil === 'vendedor') {
      const codigoSessao = Number.parseInt(sessionUser.usuario, 10)
      if (!Number.isFinite(codigoSessao) || codigoSessao !== codigo) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
    }

    if (sessionUser.perfil === 'supervisor') {
      const codigoSupervisor = Number.parseInt(sessionUser.usuario, 10)
      if (!Number.isFinite(codigoSupervisor)) {
        return NextResponse.json({ error: 'Usuário inválido para o perfil logado' }, { status: 400 })
      }

      const vendedoresEquipe = await buscarVendedoresPorSupervisor(codigoSupervisor)
      if (!vendedoresEquipe) {
        return NextResponse.json({ error: 'Erro ao validar equipe do supervisor' }, { status: 500 })
      }
      const pertenceEquipe = vendedoresEquipe.some((vendedor) => vendedor.codigo === codigo)
      if (!pertenceEquipe) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
    }

    if (sessionUser.perfil !== 'vendedor' && sessionUser.perfil !== 'supervisor' && sessionUser.perfil !== 'gerencia' && sessionUser.perfil !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar dados na Excel
    const dadosVendedor = await buscarDadosVendedor(codigo)

    if (!dadosVendedor) {
      return NextResponse.json(
        { error: 'Vendedor não encontrado' },
        { status: 404 }
      )
    }

    // Log para debug
    console.log(`[API] Dados do vendedor ${codigo}:`, {
      nome: dadosVendedor.nomeVendedor,
      metaFaseamento: dadosVendedor.metaFaseamento,
      realizadoFaseamento: dadosVendedor.realizadoFaseamento
    })

    // Calcular agregados
    const dadosAgregados = calcularDadosAgregados(dadosVendedor)
    
    // Calcular dados SAR
    const dadosSAR = calcularDadosSAR(dadosVendedor)

    // Buscar timestamp do último upload dos metadados do Storage
    let lastUpdate = Date.now() // Fallback
    try {
      const { data: files } = await supabaseAdmin.storage
        .from('excel-files')
        .list('', {
          search: 'dados_app.xlsx'
        })

      if (files && files.length > 0) {
        const file = files[0]
        // Pegar timestamp customizado dos metadados ou usar created_at
        if (file.metadata && file.metadata.uploadedAt) {
          lastUpdate = parseInt(file.metadata.uploadedAt)
        } else if (file.created_at) {
          lastUpdate = new Date(file.created_at).getTime()
        }
      }
    } catch (error) {
      console.error('Erro ao buscar timestamp do Supabase Storage:', error)
      // lastUpdate já tem o fallback
    }

    return NextResponse.json({
      vendedor: dadosVendedor,
      agregados: dadosAgregados,
      sar: dadosSAR,
      lastUpdate: lastUpdate
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Accel-Expires': '0'
      }
    })
  } catch (error) {
    console.error('Erro na API:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados do vendedor' },
      { status: 500 }
    )
  }
}
