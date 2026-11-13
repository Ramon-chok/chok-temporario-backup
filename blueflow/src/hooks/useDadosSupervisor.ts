import { useAuthContext } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLastUpdateStore } from '@/store/lastUpdateStore'

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

interface SupervisorResponse {
  supervisor: SupervisorData
  agregados: DadosAgregados
  sar: DadosSAR
  lastUpdate: number
}

interface UseDadosSupervisorOptions {
  enabled?: boolean
}

/**
 * Hook para buscar dados agregados do supervisor logado
 */
export function useDadosSupervisor(options: UseDadosSupervisorOptions = {}) {
  const { user } = useAuthContext()
  const { setLastUpdate } = useLastUpdateStore()

  const codigoSupervisor = user?.usuario

  const queryEnabled = options.enabled ?? true

  const { data, isLoading, error, refetch } = useQuery<SupervisorResponse>({
    queryKey: ['supervisor-dados', codigoSupervisor],
    queryFn: async () => {
      if (!codigoSupervisor) {
        throw new Error('Usuário não autenticado')
      }

      const response = await fetch(
        `/api/supervisor/dados?codigo=${encodeURIComponent(codigoSupervisor)}`
      )

      if (!response.ok) {
        throw new Error('Erro ao buscar dados do supervisor')
      }

      return response.json()
    },
    enabled: queryEnabled && !!codigoSupervisor,
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
    supervisor: data?.supervisor,
    agregados: data?.agregados,
    sar: data?.sar,
    isLoading,
    error,
    refetch,
  }
}
