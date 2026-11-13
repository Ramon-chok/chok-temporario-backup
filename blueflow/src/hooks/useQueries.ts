import type { ClienteNaoPositivado, Top20ClientesResponse } from '@/types'

async function apiJsonOrThrow<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (res.ok) {
    return (await res.json()) as T
  }

  let detail = ''
  try {
    const payload = (await res.json()) as { error?: string }
    detail = payload?.error ? String(payload.error) : ''
  } catch {
    detail = ''
  }

  throw new Error(`${fallbackMessage} (${res.status})${detail ? `: ${detail}` : ''}`)
}

export function useCategoriasNaoPositivados(
  perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin' | null,
  usuario: string | null,
  vendedor: string | null,
  equipe: string | null
) {
  return useQuery<string[], Error>({
    queryKey: ['categorias-nao-positivados', perfil, usuario, vendedor, equipe],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (perfil) params.set('perfil', perfil)
      if (usuario) params.set('usuario', usuario)
      if (vendedor) params.set('vendedor', vendedor)
      if (equipe) params.set('equipe', equipe)

      const res = await fetch(`/api/nao-positivados/categorias?${params.toString()}`)
      return apiJsonOrThrow<string[]>(res, 'Erro ao buscar categorias de não positivados')
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  })
}

export function useNaoPositivados(
  categoria: string | null,
  perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin' | null,
  usuario: string | null
) {
  const { seller, equipe, gerencia } = useFilterStore()
  return useQuery<ClienteNaoPositivado[], Error>({
    queryKey: ['nao-positivados', seller, equipe, gerencia, categoria, perfil, usuario],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (seller) params.set('vendedor', seller)
      if (equipe) params.set('equipe', equipe)
      if (gerencia) params.set('gerencia', gerencia)
      if (categoria) params.set('categoria', categoria)
      if (perfil) params.set('perfil', perfil)
      if (usuario) params.set('usuario', usuario)
      const res = await fetch(`/api/nao-positivados/clientes?${params.toString()}`)
      return apiJsonOrThrow<ClienteNaoPositivado[]>(res, 'Erro ao buscar clientes não positivados')
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  })
}

export function useTop20Clientes(
  perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin' | null,
  usuario: string | null
) {
  const { seller, equipe, gerencia } = useFilterStore()

  return useQuery<Top20ClientesResponse, Error>({
    queryKey: ['top-20-clientes', seller, equipe, gerencia, perfil, usuario],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (seller) params.set('vendedor', seller)
      if (equipe) params.set('equipe', equipe)
      if (gerencia) params.set('gerencia', gerencia)
      if (perfil) params.set('perfil', perfil)
      if (usuario) params.set('usuario', usuario)

      const res = await fetch(`/api/top-clientes/clientes?${params.toString()}`)
      return apiJsonOrThrow<Top20ClientesResponse>(res, 'Erro ao buscar Top 20 clientes')
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  })
}

export function useTop20Categorias(
  perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin' | null,
  usuario: string | null
) {
  const { seller, equipe, gerencia } = useFilterStore()

  return useQuery<string[], Error>({
    queryKey: ['top-20-categorias', seller, equipe, gerencia, perfil, usuario],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (seller) params.set('vendedor', seller)
      if (equipe) params.set('equipe', equipe)
      if (gerencia) params.set('gerencia', gerencia)
      if (perfil) params.set('perfil', perfil)
      if (usuario) params.set('usuario', usuario)

      const res = await fetch(`/api/top-clientes/categorias?${params.toString()}`)
      return apiJsonOrThrow<string[]>(res, 'Erro ao buscar categorias do Top 20')
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
  })
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type {
  KPIs,
  TopClient,
  Category,
} from '@/types'
import { useFilterStore } from '@/store/filterStore'
import { useAuth } from './useAuth'

function toNumericQueryParam(value: string | null | undefined) {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? String(parsed) : null
}

export function useKPIs() {
  const { dateRange } = useFilterStore()
  const { user } = useAuth()

  return useQuery({
    queryKey: ['kpis', dateRange, user?.usuario],
    queryFn: async (): Promise<KPIs> => {
      // Filtro por usuário para vendedor
      let vendedorCodigoFiltro: string | null = null
      if (user?.perfil === 'vendedor') {
        vendedorCodigoFiltro = user.usuario
      }

      // cd_vend_filter e o nome legado esperado pela assinatura atual da RPC.
      const { data, error } = await supabase.rpc('get_kpis', {
        start_date: dateRange.start || null,
        end_date: dateRange.end || null,
        cd_vend_filter: vendedorCodigoFiltro,
      })

      if (error) throw error
      return (Array.isArray(data) && data.length > 0 ? data[0] : data) as KPIs
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    retry: 1,
  })
}

export function useTopClients() {
  const { dateRange } = useFilterStore()
  const { user } = useAuth()

  return useQuery({
    queryKey: ['topClients', dateRange, user?.usuario],
    queryFn: async (): Promise<TopClient[]> => {
      // Filtro por usuário para vendedor
      let vendedorCodigoFiltro: string | null = null
      if (user?.perfil === 'vendedor') {
        vendedorCodigoFiltro = user.usuario
      }

      // cd_vend_filter e o nome legado esperado pela assinatura atual da RPC.
      const { data, error } = await supabase.rpc('get_top_clients', {
        start_date: dateRange.start || null,
        end_date: dateRange.end || null,
        cd_vend_filter: vendedorCodigoFiltro,
      })

      if (error) throw error
      return data as TopClient[]
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    retry: 1,
  })
}

export function useCategories() {
  const { seller, equipe, gerencia } = useFilterStore()
  const { user } = useAuth()
  const shouldAggregateByCategory =
    user?.perfil === 'supervisor' || user?.perfil === 'gerencia' || user?.perfil === 'admin'
  return useQuery<Category[], Error>({
    queryKey: ['categories', seller, equipe, gerencia, user?.usuario, user?.perfil],
    queryFn: async () => {
      try {
        const params = new URLSearchParams()
        if (user?.perfil === 'vendedor') {
          const vendedorCodigo = toNumericQueryParam(user.usuario)
          if (vendedorCodigo) {
            params.set('vendedor', vendedorCodigo)
          }
        } else if (user?.perfil === 'supervisor') {
          if (seller) {
            params.set('vendedor', seller)
          } else {
            const equipeCodigo = toNumericQueryParam(equipe) || toNumericQueryParam(user?.usuario)
            if (equipeCodigo) {
              params.set('equipe', equipeCodigo)
            }
          }
        } else if (user?.perfil === 'gerencia' || user?.perfil === 'admin') {
          if (seller) {
            params.set('vendedor', seller)
          } else if (equipe) {
            params.set('equipe', equipe)
          } else if (gerencia) {
            params.set('gerencia', gerencia)
          }
        }
        const response = await fetch(`/api/categorias/lista?${params.toString()}`, {
          credentials: 'same-origin',
        })
        if (!response.ok) {
          let detail = ''
          try {
            detail = await response.text()
          } catch {
            detail = ''
          }
          throw new Error(`Erro ao buscar categorias (${response.status})${detail ? `: ${detail}` : ''}`)
        }
        const data: Category[] = await response.json()
        let normalizedCategories: Category[] = []
        if (shouldAggregateByCategory) {
          const map = new Map<string, Category>()
          for (const cat of data) {
            const key = (cat.categoria || '').trim().toUpperCase()
            const realizadoAtual = cat.realizadoFaturamento || 0
            const margemAtual = (cat.percentualMargem || 0) * 100
            if (!map.has(key)) {
              map.set(key, {
                ...cat,
                percentualMargem: margemAtual,
              })
            } else {
              const current = map.get(key)!
              current.metaFaturamento += cat.metaFaturamento || 0
              current.realizadoFaturamento += cat.realizadoFaturamento || 0
              current.metaCobertura += cat.metaCobertura || 0
              current.realizadoCobertura += cat.realizadoCobertura || 0
              const realizadoTotal = current.realizadoFaturamento
              current.percentualMargem =
                realizadoTotal > 0
                  ? ((current.percentualMargem * (realizadoTotal - realizadoAtual)) + (margemAtual * realizadoAtual)) / realizadoTotal
                  : 0
            }
          }
          normalizedCategories = Array.from(map.values()).map((cat) => {
            cat.codigoVendedor = 0
            cat.nomeVendedor = 'TOTAL'
            return cat
          })
        } else {
          normalizedCategories = data
        }
        const categoriesWithPercentages: Category[] = normalizedCategories.map((cat: Category) => ({
          ...cat,
          percentualFaturamento:
            cat.metaFaturamento > 0
              ? Math.round((cat.realizadoFaturamento / cat.metaFaturamento) * 1000) / 10
              : 0,
          percentualCobertura:
            cat.metaCobertura > 0
              ? Math.round((cat.realizadoCobertura / cat.metaCobertura) * 1000) / 10
              : 0,
          percentualMargem: shouldAggregateByCategory
            ? Math.round((cat.percentualMargem || 0) * 10) / 10
            : (cat.percentualMargem || 0) * 100,
        }))
        categoriesWithPercentages.sort((a, b) => 
          (a.categoria || '').localeCompare(b.categoria || '', 'pt-BR')
        )
        return categoriesWithPercentages
      } catch (err) {
        console.warn('Erro ao buscar categorias:', err)
        throw err
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
    retry: 1,
  })
}

export function useVendedoresDadosApp() {
  const { user } = useAuth()

  return useQuery<{ cd_vend: string; nm_vend: string }[], Error>({
    queryKey: ['vendedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ped_vda')
        .select('cd_vend, nm_vend')
        .not('cd_vend', 'is', null)
        .order('nm_vend')
      if (error) throw error
      return data as { cd_vend: string; nm_vend: string }[]
    },
    enabled: !!user && user.perfil !== 'vendedor',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    retry: 1,
  })
}

// Alias legado para evitar quebra imediata nos imports existentes.
export function useVendedores() {
  return useVendedoresDadosApp()
}
