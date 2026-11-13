"use client";
import { useAuthContext } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLastUpdateStore } from '@/store/lastUpdateStore'
import { useFilterStore } from '@/store/filterStore'

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

interface DadosSAR {
  positivacaoDiaria: {
    visitas: number
    positivacao: number
    percentual: number
  }
  positivacaoAcumulada: {
    visitas: number
    positivacao: number
    percentual: number
  }
  foraDeRotaDiario: {
    visitas: number
    foraDeRota: number
    percentual: number
  }
  foraDeRotaAcumulado: {
    visitas: number
    foraDeRota: number
    percentual: number
  }
}

interface GerenciaResponse {
  gerencia: GerenciaData
  agregados: DadosAgregados
  sar: DadosSAR
  lastUpdate: number
}

interface UseDadosGerenciaOptions {
  enabled?: boolean
}

/**
 * Hook para buscar dados agregados de TODA a empresa (perfil gerência)
 */
export function useDadosGerencia(options: UseDadosGerenciaOptions = {}) {
  const { user } = useAuthContext()
  const { setLastUpdate } = useLastUpdateStore()
  const { gerencia } = useFilterStore()

  const queryEnabled = options.enabled ?? true

  const { data, isLoading, error, refetch } = useQuery<GerenciaResponse>({
    queryKey: ['gerencia-dados', gerencia],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (gerencia) params.set('gerencia', gerencia)

      const response = await fetch(`/api/gerencia/dados?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar dados da gerência')
      }

      return response.json()
    },
    enabled: queryEnabled && (user?.perfil === 'gerencia' || user?.perfil === 'admin'),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnMount: false,
  })

  // Atualizar timestamp quando dados são carregados com sucesso
  useEffect(() => {
    if (data && !isLoading && !error && data.lastUpdate) {
      setLastUpdate(data.lastUpdate)
    }
  }, [data, isLoading, error, setLastUpdate])

  return {
    gerencia: data?.gerencia,
    agregados: data?.agregados,
    sar: data?.sar,
    isLoading,
    error,
    refetch,
  }
}
