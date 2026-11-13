import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'

interface GerenciasResponse {
  gerencias: string[]
  count: number
}

/**
 * Hook para buscar lista de gerências disponíveis na planilha
 */
export function useGerencias() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['gerencias'],
    queryFn: async (): Promise<string[]> => {
      const response = await fetch('/api/gerencias/lista')

      if (!response.ok) {
        throw new Error('Erro ao buscar lista de gerências')
      }

      const data: GerenciasResponse = await response.json()
      return data.gerencias
    },
    enabled: user?.perfil === 'gerencia' || user?.perfil === 'admin',
    gcTime: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
  })
}
