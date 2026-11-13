import type { Database } from '@/types/supabase'

export type User = Database['public']['Tables']['usuarios']['Row']
// ped_vda e it_pedv sao nomes legados de tabela para a carga do dados_app.
export type FaturamentoImportRow = Database['public']['Tables']['ped_vda']['Row']
// Alias legado mantido para evitar quebra em imports antigos.
export type Sale = FaturamentoImportRow

export interface KPIs {
  totalRevenue: number
  totalProfit: number
  profitMargin: number
  averageTicket: number
  totalOrders: number
}

export interface TopClient extends Record<string, unknown> {
  clientName: string
  totalPurchases: number
  totalAmount: number
  lastPurchaseDate: string
}

export interface Category extends Record<string, unknown> {
  gerencia: string | null
  equipe: number | null
  codigoVendedor: number
  nomeVendedor: string
  categoria: string
  metaFaturamento: number
  realizadoFaturamento: number
  percentualFaturamento: number
  metaCobertura: number
  realizadoCobertura: number
  percentualCobertura: number
  percentualMargem: number
}

export interface ClienteNaoPositivado extends Record<string, unknown> {
  codigoCliente: number
  nomeCliente: string
  nomeFantasia: string | null
  municipio: string | null
  codigoVendedor: number | null
  nomeVendedor: string | null
  codigoEquipe: number | null
  gerencia: string | null
  valor: number
  positivado: boolean
}

export interface Top20Cliente extends Record<string, unknown> {
  nivel: 'GLOBAL' | 'GERENCIA' | 'EQUIPE' | 'VENDEDOR'
  gerencias: string | null
  equipes: number | null
  codigoVendedor: number | null
  vendedor: string | null
  pasta: string | null
  tipoRegistro: 'CLIENTE' | 'REDE'
  codigoCliente: number | null
  clienteRedes: string
  tri25: number
  tri26: number
  percCrescTri: number
  mai25: number
  mai26: number
  percCrescMes: number
}

export interface Top20MonthLabels {
  mes25: string
  mes26: string
}

export interface Top20ClientesResponse {
  clientes: Top20Cliente[]
  monthLabels: Top20MonthLabels
}

export interface FilterState {
  dateRange: {
    start: string | null
    end: string | null
  }
  seller: string | null
  city: string | null
  equipe: string | null
  gerencia: string | null
  importId: string | null
}
