'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { DataTable } from '@/components/DataTable'
import { CustomSelect } from '@/components/CustomSelect'
import { useAuth } from '@/hooks/useAuth'
import { useTop20Clientes } from '@/hooks/useQueries'
import { useFilterStore } from '@/store/filterStore'
import { useVendedoresSupervisor } from '@/hooks/useVendedoresSupervisor'
import { useTodosVendedores } from '@/hooks/useTodosVendedores'
import { useSupervisores } from '@/hooks/useSupervisores'
import { useGerencias } from '@/hooks/useGerencias'
import { useVendedoresPorEquipe } from '@/hooks/useVendedoresPorEquipe'
import { supervisorEquipeMap } from '@/lib/supervisorEquipeMap'
import type { Top20Cliente } from '@/types'
import { usePageTracking } from '@/hooks/usePageTracking'
import { toast } from 'react-hot-toast'
import {
  buildBulkPdfFileName,
  clearBulkPdfJob,
  getBulkPdfJob,
  getCurrentBulkPdfSeller,
  saveBulkPdfJob,
} from '@/lib/bulk-pdf-export'

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatPercentualCrescimento(value: number) {
  const percentual = Number.isFinite(value) ? value : 0
  const isPositivo = percentual > 0
  const isNegativo = percentual < 0
  const icon = isPositivo ? '↑' : isNegativo ? '↓' : '→'
  const tone = isPositivo
    ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
    : isNegativo
    ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300'
    : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      <span aria-hidden="true">{icon}</span>
      {`${percentual >= 0 ? '+' : ''}${percentual.toFixed(1)}%`}
    </span>
  )
}

function calcularPercentual(totalAtual: number, totalAnterior: number) {
  if (totalAnterior === 0) return totalAtual > 0 ? 1 : 0
  return totalAtual / totalAnterior - 1
}

export default function TopClientesPage() {
  usePageTracking('Top 20 Clientes')
  const bulkStepRef = useRef<string | null>(null)

  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const { seller, equipe, gerencia, setSeller, setEquipe, setGerencia, clearFilters } = useFilterStore()

  const isVendedor = user?.perfil === 'vendedor'
  const isSupervisor = user?.perfil === 'supervisor'
  const isGerencia = user?.perfil === 'gerencia'
  const isAdmin = user?.perfil === 'admin'

  const vendedoresSupervisorQuery = useVendedoresSupervisor()
  const todosVendedoresQuery = useTodosVendedores()
  const supervisoresQuery = useSupervisores()
  const gerenciasQuery = useGerencias()
  const codigoEquipeSelecionada = equipe ? Number.parseInt(equipe, 10) : null
  const vendedoresPorEquipeQuery = useVendedoresPorEquipe(codigoEquipeSelecionada)

  const {
    data: top20Response,
    isLoading: loadingClientes,
    error: clientesError,
  } = useTop20Clientes(
    (user?.perfil as 'vendedor' | 'supervisor' | 'gerencia' | 'admin' | undefined) || null,
    user?.usuario || null
  )

  const clientes = useMemo(() => top20Response?.clientes || [], [top20Response])
  const monthLabels = useMemo(
    () => top20Response?.monthLabels || { mes25: 'jul/25', mes26: 'jul/26' },
    [top20Response]
  )

  const mensagemErro = [clientesError]
    .map((err) => (err ? err.message : null))
    .filter(Boolean)
    .join(' | ')

  const vendedoresSupervisor = vendedoresSupervisorQuery.data || []
  const todosVendedores = todosVendedoresQuery.data || []
  const supervisores = supervisoresQuery.data || []
  const gerencias = gerenciasQuery.data || []
  const vendedoresPorEquipe = vendedoresPorEquipeQuery.data || []

  const opcoesVendedor = (isSupervisor
    ? vendedoresSupervisor
    : equipe
    ? vendedoresPorEquipe
    : todosVendedores
  )
    .slice()
    .sort((a, b) => Number(a.codigo) - Number(b.codigo))

  const opcoesEquipe = supervisores
    .map((item) => ({
      value: String(item),
      label: supervisorEquipeMap[item] || String(item),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

  const opcoesGerencia = gerencias
    .map((codigoGerencia) => ({ value: String(codigoGerencia), label: String(codigoGerencia) }))
    .filter((item) => item.label !== 'GERÊNCIA CHOK INTERNA')
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

  const clientesFormatados = useMemo<Top20Cliente[]>(() => {
    return clientes.map((cliente) => ({
      ...cliente,
      percCrescTri: (cliente.percCrescTri || 0) * 100,
      percCrescMes: (cliente.percCrescMes || 0) * 100,
    }))
  }, [clientes])

  const totalLinha = useMemo<Top20Cliente | null>(() => {
    if (clientesFormatados.length === 0) return null

    const totalTri25 = clientesFormatados.reduce((acc, cliente) => acc + (cliente.tri25 || 0), 0)
    const totalTri26 = clientesFormatados.reduce((acc, cliente) => acc + (cliente.tri26 || 0), 0)
    const totalMai25 = clientesFormatados.reduce((acc, cliente) => acc + (cliente.mai25 || 0), 0)
    const totalMai26 = clientesFormatados.reduce((acc, cliente) => acc + (cliente.mai26 || 0), 0)

    return {
      nivel: 'GLOBAL',
      gerencias: null,
      equipes: null,
      codigoVendedor: null,
      vendedor: null,
      pasta: null,
      tipoRegistro: 'CLIENTE',
      codigoCliente: null,
      clienteRedes: '',
      tri25: totalTri25,
      tri26: totalTri26,
      percCrescTri: calcularPercentual(totalTri26, totalTri25) * 100,
      mai25: totalMai25,
      mai26: totalMai26,
      percCrescMes: calcularPercentual(totalMai26, totalMai25) * 100,
    }
  }, [clientesFormatados])

  const columns = useMemo(() => {
    const baseColumns = [
      {
        header: 'Cod Cliente',
        accessor: 'codigoCliente',
        format: (value: unknown, row?: Top20Cliente) =>
          (row as Top20Cliente | undefined)?.tipoRegistro === 'REDE'
            ? '-'
            : value
            ? String(value)
            : '-',
      },
      {
        header: 'Cliente/Redes',
        accessor: 'clienteRedes',
      },
    ]

    const quarterColumns = [
      {
        header: 'Trimestre 25',
        accessor: 'tri25',
        format: (value: unknown) => formatCurrency((value as number) || 0),
      },
      {
        header: 'Trimestre 26',
        accessor: 'tri26',
        format: (value: unknown) => formatCurrency((value as number) || 0),
      },
      {
        header: '% Cresc',
        accessor: 'percCrescTri',
        format: (value: unknown) => formatPercentualCrescimento((value as number) || 0),
      },
    ]

    const monthColumns = [
      {
        header: monthLabels.mes25,
        accessor: 'mai25',
        format: (value: unknown) => formatCurrency((value as number) || 0),
      },
      {
        header: monthLabels.mes26,
        accessor: 'mai26',
        format: (value: unknown) => formatCurrency((value as number) || 0),
      },
      {
        header: '% Cresc',
        accessor: 'percCrescMes',
        format: (value: unknown) => formatPercentualCrescimento((value as number) || 0),
      },
    ]

    return isGerencia || isAdmin
      ? [...baseColumns, ...quarterColumns, ...monthColumns]
      : [...baseColumns, ...monthColumns]
  }, [isAdmin, isGerencia, monthLabels.mes25, monthLabels.mes26])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!isAdmin || authLoading || !user) {
      return
    }

    const job = getBulkPdfJob()
    if (!job || job.currentPage !== 'top-clientes') {
      return
    }

    const sellerAtual = getCurrentBulkPdfSeller(job)
    if (!sellerAtual) {
      return
    }

    if (equipe || gerencia || seller !== sellerAtual.codigo) {
      if (equipe) setEquipe(null)
      if (gerencia) setGerencia(null)
      if (seller !== sellerAtual.codigo) setSeller(sellerAtual.codigo)
      return
    }

    if (loadingClientes) {
      return
    }

    const stepKey = `top-clientes-${job.currentIndex}`
    if (bulkStepRef.current === stepKey) {
      return
    }
    bulkStepRef.current = stepKey

    const indiceAtual = job.currentIndex
    const proximoIndice = indiceAtual + 1
    const total = job.sellers.length

    const exportar = async () => {
      const loadingToast = toast.loading(`Exportando top 20 ${proximoIndice}/${total}: ${sellerAtual.nome}`)

      try {
        const { exportDashboardToPDF } = await import('@/lib/export-pdf')
        await exportDashboardToPDF({
          reportTitle: `Top 20 Clientes - ${sellerAtual.codigo} - ${sellerAtual.nome}`,
          fileName: buildBulkPdfFileName('top-20-clientes', sellerAtual),
        })

        if (proximoIndice >= total) {
          clearBulkPdfJob()
          toast.success(`Exportacao em massa finalizada (${total} vendedor(es)).`, { id: loadingToast })
          router.push('/admin')
          return
        }

        saveBulkPdfJob({
          ...job,
          currentIndex: proximoIndice,
          currentPage: 'dashboard',
        })

        toast.success(`Top 20 concluido para ${sellerAtual.nome}.`, { id: loadingToast })
        router.push('/dashboard')
      } catch (error) {
        console.error('Erro no passo de exportacao do top 20:', error)
        clearBulkPdfJob()
        toast.error('Erro ao exportar top 20 em massa', { id: loadingToast })
      }
    }

    void exportar()
  }, [
    authLoading,
    equipe,
    gerencia,
    isAdmin,
    loadingClientes,
    router,
    seller,
    setEquipe,
    setGerencia,
    setSeller,
    user,
  ])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Top 20 Clientes" subtitle="Acompanhe os Top 20 clientes, disponível também por categorias!" />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {mensagemErro && (
              <div className="rounded-lg border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {mensagemErro}
              </div>
            )}

            <div className="saas-filter-card rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 md:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="saas-filter-title text-sm font-semibold uppercase tracking-wide text-gray-400">Filtros</h3>
                <button
                  type="button"
                  onClick={() => {
                    clearFilters()
                  }}
                  className="saas-filter-button w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[#b480ff]/10 sm:w-auto"
                >
                  Limpar filtros
                </button>
              </div>

              <div
                className={`grid gap-3 md:gap-4 grid-cols-1 ${
                  isVendedor ? '' : isSupervisor ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'
                }`}
              >
                {(isSupervisor || isGerencia || isAdmin) && (
                  <div>
                    <label className="saas-filter-label text-xs font-medium uppercase tracking-wide text-gray-400">Vendedor</label>
                    <CustomSelect
                      value={seller || ''}
                      onChange={(val) => setSeller(val || null)}
                      options={[
                        {
                          value: '',
                          label: isSupervisor
                            ? 'Toda a equipe'
                            : equipe
                            ? 'Todos da equipe'
                            : gerencia
                            ? 'Todos da gerência'
                            : 'Todos os vendedores',
                        },
                        ...opcoesVendedor.map((item) => ({
                          value: String(item.codigo),
                          label: `${item.codigo} - ${item.nome}`,
                        })),
                      ]}
                      placeholder="Selecione"
                    />
                  </div>
                )}

                {(isGerencia || isAdmin) && (
                  <div>
                    <label className="saas-filter-label text-xs font-medium uppercase tracking-wide text-gray-400">Equipe</label>
                    <CustomSelect
                      value={equipe || ''}
                      onChange={(val) => {
                        setEquipe(val || null)
                        setSeller(null)
                      }}
                      options={[
                        { value: '', label: 'Todas as equipes' },
                        ...opcoesEquipe,
                      ]}
                      placeholder="Selecione"
                    />
                  </div>
                )}

                {(isGerencia || isAdmin) && (
                  <div>
                    <label className="saas-filter-label text-xs font-medium uppercase tracking-wide text-gray-400">Gerência</label>
                    <CustomSelect
                      value={gerencia || ''}
                      onChange={(val) => {
                        setGerencia(val || null)
                        setEquipe(null)
                        setSeller(null)
                      }}
                      options={[
                        { value: '', label: 'Todas as gerências' },
                        ...opcoesGerencia,
                      ]}
                      placeholder="Selecione"
                    />
                  </div>
                )}

              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg md:text-xl font-bold text-[var(--foreground)]">Top 20 Clientes</h2>
              <DataTable<Top20Cliente>
                columns={columns}
                data={clientesFormatados}
                isLoading={loadingClientes}
                totalRow={totalLinha}
                showPercentBars={false}
              />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  )
}
