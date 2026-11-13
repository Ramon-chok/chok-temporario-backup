import { useQuery } from '@tanstack/react-query'

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

/**
 * Hook para buscar dados agregados de um supervisor específico por código
 * Usado quando gerencia/admin seleciona uma equipe no filtro
 */
export function useDadosSupervisorPorCodigo(codigoSupervisor: number | null) {
  const { data, isLoading, error } = useQuery<SupervisorResponse>({
    queryKey: ['supervisor-dados-codigo', codigoSupervisor],
    queryFn: async () => {
      if (!codigoSupervisor) {
        throw new Error('Código do supervisor é obrigatório')
      }

      const response = await fetch(
        `/api/supervisor/dados?codigo=${encodeURIComponent(codigoSupervisor)}`
      )

      if (!response.ok) {
        throw new Error('Erro ao buscar dados do supervisor')
      }

      return response.json()
    },
    enabled: !!codigoSupervisor,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnMount: false,
  })

  return {
    supervisor: data?.supervisor ?? null,
    agregados: data?.agregados ?? null,
    sar: data?.sar ?? null,
    isLoading,
    error,
  }
}
