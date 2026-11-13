import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/contexts/AuthContext'

export interface Nota {
  id: string
  usuario_codigo: string
  titulo: string
  conteudo: string
  criado_em: string
  atualizado_em: string
  mes_criacao: number
  ano_criacao: number
}

interface NotasResponse {
  notas: Nota[]
  total: number
  limite: number
}

interface CriarNotaData {
  titulo: string
  conteudo: string
}

interface EditarNotaData {
  id: string
  titulo?: string
  conteudo?: string
}

function getNotasQueryKey(usuario?: string) {
  return ['notas', usuario] as const
}

function useCriarNotaMutation(notasQueryKey: readonly ['notas', string | undefined]) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dados: CriarNotaData) => {
      const response = await fetch('/api/notas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar nota')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notasQueryKey })
    },
  })
}

export function useCriarNota() {
  const { user } = useAuthContext()
  const notasQueryKey = getNotasQueryKey(user?.usuario)
  const criarNota = useCriarNotaMutation(notasQueryKey)

  return {
    criarNota: criarNota.mutateAsync,
    criarNotaMutation: criarNota,
    isCriando: criarNota.isPending,
    erroCriar: criarNota.error ? (criarNota.error as Error).message : null,
  }
}

/**
 * Hook para gerenciar notas do vendedor
 * - Lista notas do mês atual
 * - Criar, editar e deletar notas
 * - Cache automático com React Query
 */
export function useNotas() {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()
  const notasQueryKey = getNotasQueryKey(user?.usuario)

  // Buscar notas do usuário
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<NotasResponse>({
    queryKey: notasQueryKey,
    queryFn: async () => {
      const response = await fetch('/api/notas')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar notas')
      }
      return response.json()
    },
    enabled: !!user?.usuario,
    gcTime: 10 * 60 * 1000,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  })

  // Criar nova nota
  const criarNota = useCriarNotaMutation(notasQueryKey)

  // Editar nota existente
  const editarNota = useMutation({
    mutationFn: async ({ id, ...dados }: EditarNotaData) => {
      const response = await fetch(`/api/notas/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao editar nota')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidar cache para recarregar lista
      queryClient.invalidateQueries({ queryKey: notasQueryKey })
    },
  })

  // Deletar nota
  const deletarNota = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notas/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao deletar nota')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidar cache para recarregar lista
      queryClient.invalidateQueries({ queryKey: notasQueryKey })
    },
  })

  return {
    // Dados
    notas: data?.notas || [],
    total: data?.total || 0,
    limite: data?.limite || 20,

    // Estados
    isLoading,
    error: error ? (error as Error).message : null,

    // Ações (mutations completas para suportar callbacks)
    criarNotaMutation: criarNota,
    editarNotaMutation: editarNota,
    deletarNotaMutation: deletarNota,
    
    // Ações simplificadas (legacy)
    criarNota: criarNota.mutateAsync,
    editarNota: editarNota.mutateAsync,
    deletarNota: deletarNota.mutateAsync,
    refetch,

    // Estados das mutations
    isCriando: criarNota.isPending,
    isEditando: editarNota.isPending,
    isDeletando: deletarNota.isPending,
    
    // Erros das mutations
    erroCriar: criarNota.error ? (criarNota.error as Error).message : null,
    erroEditar: editarNota.error ? (editarNota.error as Error).message : null,
    erroDeletar: deletarNota.error ? (deletarNota.error as Error).message : null,
  }
}
