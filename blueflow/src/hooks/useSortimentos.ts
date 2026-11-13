import { useQuery } from '@tanstack/react-query'

export interface SortimentoRow {
  codigo: string
  descricao: string
  fabricante: string
  [key: string]: unknown
}

async function fetchSortimentos(): Promise<SortimentoRow[]> {
  const res = await fetch('/api/sortimentos', {
    credentials: 'same-origin',
  })

  if (!res.ok) {
    throw new Error('Erro ao carregar sortimentos')
  }

  return (await res.json()) as SortimentoRow[]
}

export function useSortimentos() {
  return useQuery<SortimentoRow[]>({
    queryKey: ['sortimentos-2026'],
    queryFn: fetchSortimentos,
    gcTime: 10 * 60 * 1000,
    staleTime: 1000 * 60 * 10,
    refetchOnMount: false,
  })
}
