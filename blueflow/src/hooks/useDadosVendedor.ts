import { useAuthContext } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLastUpdateStore } from '@/store/lastUpdateStore'

interface VendedorData {
  supervisor: number | null
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

interface UseDadosVendedorOptions {
  enabled?: boolean
}

/**
 * Hook para buscar dados do vendedor logado
 */
export function useDadosVendedor(options: UseDadosVendedorOptions = {}) {
  const { user } = useAuthContext()
  const { setLastUpdate } = useLastUpdateStore()

  const codigo = user?.usuario ? parseInt(user.usuario) : NaN
  const hasCodigoValido = !isNaN(codigo)

  const queryEnabled = options.enabled ?? true

  const { data, isLoading, error, refetch } = useQuery<VendedorResponse>({
    queryKey: ['vendedor-dados', user?.usuario],
    queryFn: async () => {
      if (!user?.usuario || !hasCodigoValido) {
        throw new Error('Usuário não autenticado')
      }

      const response = await fetch(`/api/vendedor/dados?codigo=${codigo}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar dados do vendedor')
      }

      return response.json()
    },
    enabled: queryEnabled && !!user?.usuario && hasCodigoValido,
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
    vendedor: data?.vendedor || null,
    agregados: data?.agregados || null,
    sar: data?.sar || null,
    isLoading,
    error,
    refetch,
  }
}
