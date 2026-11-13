import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'

interface VendedorEquipe {
  codigo: number
  nome: string
}

interface VendedoresResponse {
  vendedores: VendedorEquipe[]
  count: number
}

/**
 * Hook para buscar vendedores da equipe do supervisor logado
 */
export function useVendedoresSupervisor() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['vendedores-supervisor', user?.usuario],
    queryFn: async (): Promise<VendedorEquipe[]> => {
      if (!user?.usuario) {
        return []
      }

      const response = await fetch(
        `/api/supervisor/vendedores?codigo=${user.usuario}`
      )

      if (!response.ok) {
        throw new Error('Erro ao buscar vendedores do supervisor')
      }

      const data: VendedoresResponse = await response.json()
      return data.vendedores
    },
    enabled: !!user?.usuario && user?.perfil === 'supervisor',
    gcTime: 15 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  })
}
