import { useQuery } from '@tanstack/react-query'

export function useLinhaGerencia() {
  return useQuery({
    queryKey: ['linha-gerencia'],
    queryFn: async () => {
      const res = await fetch('/api/gerencia/linha')
      if (!res.ok) throw new Error('Erro ao buscar linha gerencia')
      return await res.json()
    },
    gcTime: 10 * 60 * 1000,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
  })
}
