import { useQuery } from '@tanstack/react-query'

interface VendedorEquipe {
  codigo: number
  nome: string
}

interface VendedoresResponse {
  vendedores: VendedorEquipe[]
  count: number
}

/**
 * Hook para buscar vendedores de uma equipe específica por código do supervisor
 * Usado no filtro cascata Equipe -> Vendedor para gerencia/admin
 */
export function useVendedoresPorEquipe(codigoSupervisor: number | null) {
  return useQuery({
    queryKey: ['vendedores-equipe', codigoSupervisor],
    queryFn: async (): Promise<VendedorEquipe[]> => {
      if (!codigoSupervisor) {
        return []
      }

      const response = await fetch(
        `/api/supervisor/vendedores?codigo=${codigoSupervisor}`
      )

      if (!response.ok) {
        throw new Error('Erro ao buscar vendedores da equipe')
      }

      const data: VendedoresResponse = await response.json()
      return data.vendedores
    },
    enabled: !!codigoSupervisor,
    gcTime: 15 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  })
}
