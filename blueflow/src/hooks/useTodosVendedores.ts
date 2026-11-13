import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useFilterStore } from '@/store/filterStore'

interface VendedorSimples {
  codigo: number
  nome: string
}

interface VendedoresResponse {
  vendedores: VendedorSimples[]
  count: number
}

/**
 * Hook para buscar TODOS os vendedores (código e nome)
 * Para uso nos filtros do perfil gerencia e admin
 */
export function useTodosVendedores() {
  const { user } = useAuth()
  const { gerencia } = useFilterStore()

  return useQuery({
    queryKey: ['todos-vendedores', gerencia],
    queryFn: async (): Promise<VendedorSimples[]> => {
      const params = new URLSearchParams()
      if (gerencia) {
        params.set('gerencia', gerencia)
      }

      const response = await fetch(`/api/vendedores/lista?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar lista de vendedores')
      }

      const data: VendedoresResponse = await response.json()
      return data.vendedores
    },
    enabled: user?.perfil === 'gerencia' || user?.perfil === 'admin',
    gcTime: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
  })
}
