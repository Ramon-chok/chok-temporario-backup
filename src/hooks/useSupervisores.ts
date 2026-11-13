import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useFilterStore } from '@/store/filterStore'

interface SupervisoresResponse {
  supervisores: number[]
  count: number
}

/**
 * Hook para buscar lista de supervisores (códigos únicos)
 * Para uso no filtro Equipe do perfil gerencia e admin
 */
export function useSupervisores() {
  const { user } = useAuth()
  const { gerencia } = useFilterStore()

  return useQuery({
    queryKey: ['supervisores', gerencia],
    queryFn: async (): Promise<number[]> => {
      const params = new URLSearchParams()
      if (gerencia) params.set('gerencia', gerencia)

      const response = await fetch(`/api/supervisores/lista?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar lista de supervisores')
      }

      const data: SupervisoresResponse = await response.json()
      return data.supervisores
    },
    enabled: user?.perfil === 'gerencia' || user?.perfil === 'admin',
    gcTime: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
  })
}
