import { useQuery } from '@tanstack/react-query'

interface VendedorData {
  supervisor: string
  codigoVendedor: number
  nomeVendedor: string
  metaFaturamento: number | null
  realizadoFaturamento: number
  metaCobertura: number | null
  realizadoCobertura: number
  metaSortimento: number | null
  realizadoSortimento: number | null
  percentualMargem: number | null
  metaFaseamento: number | null
  realizadoFaseamento: number | null
  dataInicialFaseamento: number | null
  dataFinalFaseamento: number | null
  metaFaseamentoII: number | null
  realizadoFaseamentoII: number | null
  dataInicialFaseamentoII: number | null
  dataFinalFaseamentoII: number | null
  metaDesconcentracao: number | null
  realizadoDesconcentracao: number | null
  dataInicialDesconcentracao: number | null
  dataFinalDesconcentracao: number | null
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

interface VendedorResponse {
  vendedor: VendedorData
  agregados: DadosAgregados
  sar: DadosSAR
  lastUpdate: number
}

/**
 * Hook para buscar dados de um vendedor específico por código
 * Usado quando supervisor seleciona um vendedor no filtro
 */
export function useDadosVendedorPorCodigo(codigo: number | null) {
  const { data, isLoading, error } = useQuery<VendedorResponse>({
    queryKey: ['vendedor-dados-codigo', codigo],
    queryFn: async () => {
      if (!codigo) {
        throw new Error('Código do vendedor é obrigatório')
      }

      const response = await fetch(`/api/vendedor/dados?codigo=${codigo}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar dados do vendedor')
      }

      return response.json()
    },
    enabled: !!codigo,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnMount: false,
  })

  return {
    vendedor: data?.vendedor ?? null,
    agregados: data?.agregados ?? null,
    sar: data?.sar ?? null,
    isLoading,
    error,
  }
}
