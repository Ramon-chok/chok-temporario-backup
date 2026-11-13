import { buscarTodosVendedores, VendedorData, agregarDadosSAR, DadosSAR, buscarTotalEmpresaCobertura, buscarLinhaGerencia } from '@/lib/excel-service'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserFromRequest } from '@/lib/session'

interface GerenciaData {
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
  supervisoresCount: number
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

interface GerenciaResponse {
  gerencia: GerenciaData
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

    if (sessionUser.perfil !== 'gerencia' && sessionUser.perfil !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const gerenciaFilter = request.nextUrl.searchParams.get('gerencia')
    console.log('🔍 Buscando dados agregados de gerência', { gerenciaFilter })

    // Buscar dados de todos os vendedores
    const vendedores = await buscarTodosVendedores()
    if (!vendedores || vendedores.length === 0) {
      console.log('❌ Nenhum vendedor encontrado')
      return NextResponse.json(
        { error: 'Nenhum dado disponível' },
        { status: 404 }
      )
    }

    // NOVA LÓGICA: Se não há filtro de gerência, buscar linha "gerencia" para os cards
    let linhaGerencia: VendedorData | null = null
    if (!gerenciaFilter) {
      linhaGerencia = await buscarLinhaGerencia()
    }

    const vendedoresFiltrados = gerenciaFilter
      ? vendedores.filter((v) => v.gerencia === gerenciaFilter)
      : vendedores

    if (vendedoresFiltrados.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado disponível para a gerência selecionada' },
        { status: 404 }
      )
    }

    console.log(`✅ Agregando dados de ${vendedoresFiltrados.length} vendedores`)

    // Para total da empresa (sem filtro), buscar cobertura da última linha da aba "Mês"
    let realizadoCoberturaCustom: number | null = null
    if (gerenciaFilter === null) {
      realizadoCoberturaCustom = await buscarTotalEmpresaCobertura()
      console.log('📊 Total empresa cobertura (da aba Mês):', realizadoCoberturaCustom)
    }

    // Agregar dados de TODOS os vendedores
    let metaFaseamento = 0
    let realizadoFaseamento = 0
    let metaFaseamentoII = 0
    let realizadoFaseamentoII = 0
    let metaDesconcentracao = 0
    let realizadoDesconcentracao = 0
    let metaFaturamento = 0
    let realizadoFaturamento = 0
    let metaCobertura = 0
    let realizadoCobertura = 0
    let metaSortimento = 0
    let realizadoSortimento = 0
    let totalMargem = 0

    // Contar supervisores únicos
    const supervisoresUnicos = new Set<number>()

    vendedoresFiltrados.forEach((v: VendedorData) => {
      metaFaseamento += v.metaFaseamento || 0
      realizadoFaseamento += v.realizadoFaseamento || 0
      metaFaseamentoII += v.metaFaseamentoII || 0
      realizadoFaseamentoII += v.realizadoFaseamentoII || 0
      metaDesconcentracao += v.metaDesconcentracao || 0
      realizadoDesconcentracao += v.realizadoDesconcentracao || 0
      metaFaturamento += v.metaFaturamento || 0
      realizadoFaturamento += v.realizadoFaturamento || 0
      metaCobertura += v.metaCobertura || 0
      realizadoCobertura += v.realizadoCobertura || 0
      metaSortimento += v.metaSortimento || 0
      realizadoSortimento += v.realizadoSortimento || 0
      totalMargem += (v.percentualMargem || 0) * (v.realizadoFaturamento || 1)

      // Adicionar supervisor ao set
      if (v.supervisor) {
        supervisoresUnicos.add(v.supervisor)
      }
    })

    // Usar a primeira data de início e última data de fim encontradas
    const dataInicialFaseamento =
      vendedores.find((v: VendedorData) => v.dataInicialFaseamento)
        ?.dataInicialFaseamento || null
    const dataFinalFaseamento =
      vendedores.find((v: VendedorData) => v.dataFinalFaseamento)
        ?.dataFinalFaseamento || null
    const dataInicialFaseamentoII =
      vendedores.find((v: VendedorData) => v.dataInicialFaseamentoII)
        ?.dataInicialFaseamentoII || null
    const dataFinalFaseamentoII =
      vendedores.find((v: VendedorData) => v.dataFinalFaseamentoII)
        ?.dataFinalFaseamentoII || null
    const dataInicialDesconcentracao =
      vendedores.find((v: VendedorData) => v.dataInicialDesconcentracao)
        ?.dataInicialDesconcentracao || null
    const dataFinalDesconcentracao =
      vendedores.find((v: VendedorData) => v.dataFinalDesconcentracao)
        ?.dataFinalDesconcentracao || null

    const percentualMargemMedio =
      realizadoFaturamento > 0 ? totalMargem / realizadoFaturamento : 0

    // Se linhaGerencia existir, sobrescrever os campos dos cards com ela
    const gerenciaData: GerenciaData = linhaGerencia
      ? {
          metaFaseamento: linhaGerencia.metaFaseamento ?? null,
          realizadoFaseamento: linhaGerencia.realizadoFaseamento ?? 0,
          dataInicialFaseamento: linhaGerencia.dataInicialFaseamento ?? null,
          dataFinalFaseamento: linhaGerencia.dataFinalFaseamento ?? null,
          metaFaseamentoII: linhaGerencia.metaFaseamentoII ?? null,
          realizadoFaseamentoII: linhaGerencia.realizadoFaseamentoII ?? 0,
          dataInicialFaseamentoII: linhaGerencia.dataInicialFaseamentoII ?? null,
          dataFinalFaseamentoII: linhaGerencia.dataFinalFaseamentoII ?? null,
          metaDesconcentracao: linhaGerencia.metaDesconcentracao ?? null,
          realizadoDesconcentracao: linhaGerencia.realizadoDesconcentracao ?? 0,
          dataInicialDesconcentracao: linhaGerencia.dataInicialDesconcentracao ?? null,
          dataFinalDesconcentracao: linhaGerencia.dataFinalDesconcentracao ?? null,
          metaFaturamento: linhaGerencia.metaFaturamento ?? null,
          realizadoFaturamento: linhaGerencia.realizadoFaturamento ?? 0,
          metaCobertura: linhaGerencia.metaCobertura ?? null,
          realizadoCobertura: linhaGerencia.realizadoCobertura ?? 0,
          metaSortimento: linhaGerencia.metaSortimento ?? null,
          realizadoSortimento: linhaGerencia.realizadoSortimento ?? 0,
          percentualMargem: linhaGerencia.percentualMargem ?? 0,
          vendedoresCount: vendedoresFiltrados.length,
          supervisoresCount: supervisoresUnicos.size,
        }
      : {
          metaFaseamento: metaFaseamento || null,
          realizadoFaseamento: realizadoFaseamento || 0,
          dataInicialFaseamento,
          dataFinalFaseamento,
          metaFaseamentoII: metaFaseamentoII || null,
          realizadoFaseamentoII: realizadoFaseamentoII || 0,
          dataInicialFaseamentoII,
          dataFinalFaseamentoII,
          metaDesconcentracao: metaDesconcentracao || null,
          realizadoDesconcentracao: realizadoDesconcentracao || 0,
          dataInicialDesconcentracao,
          dataFinalDesconcentracao,
          metaFaturamento: metaFaturamento || null,
          realizadoFaturamento: realizadoFaturamento || 0,
          metaCobertura: metaCobertura || null,
          realizadoCobertura: gerenciaFilter === null ? (realizadoCoberturaCustom || 0) : (realizadoCobertura || 0),
          metaSortimento: metaSortimento || null,
          realizadoSortimento: realizadoSortimento || 0,
          percentualMargem: percentualMargemMedio || 0,
          vendedoresCount: vendedoresFiltrados.length,
          supervisoresCount: supervisoresUnicos.size,
        }

    // No total da empresa, manter a meta real da base e usar o realizado customizado quando existir
    const metaCoberturaParaAgregados = metaCobertura
    const realizadoCoberturaParaAgregados = gerenciaFilter === null
      ? (realizadoCoberturaCustom ?? realizadoCobertura)
      : realizadoCobertura

    // Se linhaGerencia existir, sobrescrever agregados dos cards com ela
    const agregados: DadosAgregados = linhaGerencia
      ? {
          faturamento: {
            meta: linhaGerencia.metaFaturamento ?? 0,
            realizado: linhaGerencia.realizadoFaturamento ?? 0,
            percentual:
              linhaGerencia.metaFaturamento && linhaGerencia.metaFaturamento > 0
                ? Math.round((linhaGerencia.realizadoFaturamento / linhaGerencia.metaFaturamento) * 1000) / 10
                : 0,
          },
          cobertura: {
            meta: linhaGerencia.metaCobertura ?? 0,
            realizado: linhaGerencia.realizadoCobertura ?? 0,
            percentual:
              linhaGerencia.metaCobertura && linhaGerencia.metaCobertura > 0
                ? Math.round((linhaGerencia.realizadoCobertura / linhaGerencia.metaCobertura) * 1000) / 10
                : 0,
          },
          sortimento: {
            meta: linhaGerencia.metaSortimento ?? 0,
            realizado: linhaGerencia.realizadoSortimento ?? 0,
            percentual:
              linhaGerencia.metaSortimento && linhaGerencia.metaSortimento > 0 && linhaGerencia.realizadoSortimento != null
                ? Math.round(((linhaGerencia.realizadoSortimento ?? 0) / linhaGerencia.metaSortimento) * 1000) / 10
                : 0,
          },
          margem: {
            percentual: linhaGerencia.percentualMargem ?? 0,
          },
        }
      : {
          faturamento: {
            meta: metaFaturamento || 0,
            realizado: realizadoFaturamento || 0,
            percentual:
              metaFaturamento > 0
                ? Math.round((realizadoFaturamento / metaFaturamento) * 1000) / 10
                : 0,
          },
          cobertura: {
            meta: metaCoberturaParaAgregados || 0,
            realizado: realizadoCoberturaParaAgregados || 0,
            percentual:
              metaCoberturaParaAgregados > 0
                ? Math.round((realizadoCoberturaParaAgregados / metaCoberturaParaAgregados) * 1000) / 10
                : 0,
          },
          sortimento: {
            meta: metaSortimento || 0,
            realizado: realizadoSortimento || 0,
            percentual:
              metaSortimento > 0
                ? Math.round((realizadoSortimento / metaSortimento) * 1000) / 10
                : 0,
          },
          margem: {
            percentual: percentualMargemMedio,
          },
        }

    // Calcular dados SAR agregados
    const dadosSAR = agregarDadosSAR(vendedoresFiltrados)

    const response: GerenciaResponse = {
      gerencia: gerenciaData,
      agregados,
      sar: dadosSAR,
      lastUpdate: Date.now(),
    }

    console.log('📊 Dados gerência agregados:', {
      vendedores: vendedoresFiltrados.length,
      supervisores: supervisoresUnicos.size,
      faturamento: realizadoFaturamento,
      cobertura: realizadoCobertura,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Erro ao buscar dados da gerência:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar dados' },
      { status: 500 }
    )
  }
}
