import { buscarTodosVendedores, VendedorData, agregarDadosSAR, DadosSAR } from '@/lib/excel-service'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserFromRequest } from '@/lib/session'

interface SupervisorData {
  codigoSupervisor: number
  metaFaseamento: number | null
  realizadoFaseamento: number
  dataInicialFaseamento: number | null
  dataFinalFaseamento: number | null
  metaFaseamentoII: number | null
  realizadoFaseamentoII: number
  dataInicialFaseamentoII: number | null
  dataFinalFaseamentoII: number | null
  metaDesconcentracao: number | null
  realizadoDesconcentracao: number
  dataInicialDesconcentracao: number | null
  dataFinalDesconcentracao: number | null
  metaFaturamento: number | null
  realizadoFaturamento: number
  metaCobertura: number | null
  realizadoCobertura: number
  metaSortimento: number | null
  realizadoSortimento: number
  percentualMargem: number
  vendedoresCount: number
}

interface DadosAgregados {
  faturamento: {
    meta: number
    realizado: number
    percentual: number
  }
  cobertura: {
    meta: number
    realizado: number
    percentual: number
  }
  sortimento: {
    meta: number | null
    realizado: number
    percentual: number
  }
  margem: {
    percentual: number
  }
}

interface SupervisorResponse {
  supervisor: SupervisorData
  agregados: DadosAgregados
  sar: DadosSAR
  lastUpdate: number
}

export const maxDuration = 45

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
        { error: 'Código do supervisor não informado' },
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

    // Debug logging
    console.log('🔍 Buscando dados para supervisor código:', codigoSupervisor)

    // Buscar linha TOTAL da equipe (linha amarela)
    const { buscarLinhaTotalEquipe } = await import('@/lib/excel-service')
    const linhaTotal = await buscarLinhaTotalEquipe(codigoSupervisor)

    if (!linhaTotal) {
      return NextResponse.json(
        { error: 'Linha TOTAL da equipe não encontrada' },
        { status: 404 }
      )
    }

    const vendedores = (await buscarTodosVendedores()) || []
    const vendedoresEquipe = vendedores.filter((v: VendedorData) => v.supervisor === codigoSupervisor)

    const supervisorData: SupervisorData = {
      codigoSupervisor,
      metaFaseamento: linhaTotal.metaFaseamento || null,
      realizadoFaseamento: linhaTotal.realizadoFaseamento || 0,
      dataInicialFaseamento: linhaTotal.dataInicialFaseamento || null,
      dataFinalFaseamento: linhaTotal.dataFinalFaseamento || null,
      metaFaseamentoII: linhaTotal.metaFaseamentoII || null,
      realizadoFaseamentoII: linhaTotal.realizadoFaseamentoII || 0,
      dataInicialFaseamentoII: linhaTotal.dataInicialFaseamentoII || null,
      dataFinalFaseamentoII: linhaTotal.dataFinalFaseamentoII || null,
      metaDesconcentracao: linhaTotal.metaDesconcentracao || null,
      realizadoDesconcentracao: linhaTotal.realizadoDesconcentracao || 0,
      dataInicialDesconcentracao: linhaTotal.dataInicialDesconcentracao || null,
      dataFinalDesconcentracao: linhaTotal.dataFinalDesconcentracao || null,
      metaFaturamento: linhaTotal.metaFaturamento || null,
      realizadoFaturamento: linhaTotal.realizadoFaturamento || 0,
      metaCobertura: linhaTotal.metaCobertura || null,
      realizadoCobertura: linhaTotal.realizadoCobertura || 0,
      metaSortimento: linhaTotal.metaSortimento || null,
      realizadoSortimento: linhaTotal.realizadoSortimento || 0,
      percentualMargem: linhaTotal.percentualMargem || 0,
      vendedoresCount: vendedoresEquipe.length,
    }

    const agregados: DadosAgregados = {
      faturamento: {
        meta: linhaTotal.metaFaturamento ?? 0,
        realizado: linhaTotal.realizadoFaturamento ?? 0,
        percentual:
          (linhaTotal.metaFaturamento ?? 0) > 0
            ? Math.round((linhaTotal.realizadoFaturamento ?? 0) / (linhaTotal.metaFaturamento ?? 1) * 1000) / 10
            : 0,
      },
      cobertura: {
        meta: linhaTotal.metaCobertura ?? 0,
        realizado: linhaTotal.realizadoCobertura ?? 0,
        percentual:
          (linhaTotal.metaCobertura ?? 0) > 0
            ? Math.round((linhaTotal.realizadoCobertura ?? 0) / (linhaTotal.metaCobertura ?? 1) * 1000) / 10
            : 0,
      },
      sortimento: {
        meta: linhaTotal.metaSortimento ?? 0,
        realizado: linhaTotal.realizadoSortimento ?? 0,
        percentual:
          (linhaTotal.metaSortimento ?? 0) > 0
            ? Math.round((linhaTotal.realizadoSortimento ?? 0) / (linhaTotal.metaSortimento ?? 1) * 1000) / 10
            : 0,
      },
      margem: {
        percentual: linhaTotal.percentualMargem || 0,
      },
    }

    // Agregar SAR real dos vendedores da equipe
    const dadosSAR = agregarDadosSAR(vendedoresEquipe)

    const response: SupervisorResponse = {
      supervisor: supervisorData,
      agregados,
      sar: dadosSAR,
      lastUpdate: Date.now(),
    }

    // Headers para evitar cache
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Erro ao buscar dados do supervisor:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados do supervisor' },
      { status: 500}
    )
  }
}

export const runtime = 'nodejs'
