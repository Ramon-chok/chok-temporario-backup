'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { KPICard } from '@/components/KPICard'
import {
  useCategories,
} from '@/hooks/useQueries'
import { useFilterStore } from '@/store/filterStore'
import { useDadosVendedor } from '@/hooks/useDadosVendedor'
import { useDadosSupervisor } from '@/hooks/useDadosSupervisor'
import { useDadosGerencia } from '@/hooks/useDadosGerencia'
import { useVendedoresSupervisor } from '@/hooks/useVendedoresSupervisor'
import { useDadosVendedorPorCodigo } from '@/hooks/useDadosVendedorPorCodigo'
import { useTodosVendedores } from '@/hooks/useTodosVendedores'
import { useSupervisores } from '@/hooks/useSupervisores'
import { useGerencias } from '@/hooks/useGerencias'
import { useVendedoresPorEquipe } from '@/hooks/useVendedoresPorEquipe'
import { useDadosSupervisorPorCodigo } from '@/hooks/useDadosSupervisorPorCodigo'
import { TrendingUp, DollarSign, ShoppingCart, Target } from 'lucide-react'
import { CustomSelect } from '@/components/CustomSelect'
import { usePageTracking } from '@/hooks/usePageTracking'
import { supervisorEquipeMap } from '@/lib/supervisorEquipeMap'
import { toast } from 'react-hot-toast'
import {
  buildBulkPdfFileName,
  clearBulkPdfJob,
  getBulkPdfJob,
  getCurrentBulkPdfSeller,
  saveBulkPdfJob,
} from '@/lib/bulk-pdf-export'

export default function DashboardPage() {
  usePageTracking('Dashboard')
  const bulkStepRef = useRef<string | null>(null)

  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null)
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const {
    seller,
    equipe,
    gerencia,
    setSeller,
    setEquipe,
    setGerencia,
    clearFilters,
  } = useFilterStore()

  const categoriesQuery = useCategories()
  const vendedoresSupervisorQuery = useVendedoresSupervisor()
  const todosVendedoresQuery = useTodosVendedores()
  const gerenciasQuery = useGerencias()
  const supervisoresQuery = useSupervisores()

  const isVendedor = user?.perfil === 'vendedor'
  const isSupervisor = user?.perfil === 'supervisor'
  const isGerencia = user?.perfil === 'gerencia'
  const isAdmin = user?.perfil === 'admin'
  
  // Hook para buscar vendedores da equipe selecionada (filtro cascata)
  const codigoEquipeSelecionada = equipe ? parseInt(equipe) : null
  const vendedoresPorEquipeQuery = useVendedoresPorEquipe(codigoEquipeSelecionada)
  
  const { vendedor, agregados, sar, isLoading: dadosVendedorLoading } = useDadosVendedor({ enabled: isVendedor })
  const { supervisor, agregados: agregadosSupervisor, sar: sarSupervisor, isLoading: dadosSupervisorLoading } = useDadosSupervisor({
    enabled: isSupervisor && !seller,
  })
  const { gerencia: gerenciaData, agregados: agregadosGerencia, sar: sarGerencia, isLoading: dadosGerenciaLoading } = useDadosGerencia({
    enabled: (isGerencia || isAdmin) && !seller && !equipe,
  })
  
  // Hook para buscar vendedor individual quando há seleção no filtro
  // Funciona para: supervisor (filtrado da equipe) ou gerencia/admin (qualquer vendedor)
  const codigoVendedorFiltrado = (isSupervisor || isGerencia || isAdmin) && seller ? parseInt(seller) : null
  const { 
    vendedor: vendedorFiltrado, 
    agregados: agregadosVendedorFiltrado,
    sar: sarVendedorFiltrado,
    isLoading: dadosVendedorFiltradoLoading 
  } = useDadosVendedorPorCodigo(codigoVendedorFiltrado)

  // Hook para buscar dados de equipe selecionada (gerencia/admin)
  const codigoEquipeFiltrada = (isGerencia || isAdmin) && !seller && equipe ? parseInt(equipe) : null
  const {
    supervisor: supervisorFiltrado,
    agregados: agregadosSupervisorFiltrado,
    sar: sarSupervisorFiltrado,
    isLoading: dadosSupervisorFiltradoLoading
  } = useDadosSupervisorPorCodigo(codigoEquipeFiltrada)

  const gerenciaDataFiltrada = gerenciaData

  const dadosLoading = isVendedor 
    ? dadosVendedorLoading 
    : isSupervisor 
    ? (seller ? dadosVendedorFiltradoLoading : dadosSupervisorLoading)
    : (isGerencia || isAdmin)
    ? (seller ? dadosVendedorFiltradoLoading : equipe ? dadosSupervisorFiltradoLoading : dadosGerenciaLoading)
    : false

  // Helper functions para obter dados baseado no perfil
  const getDadosPerfil = () => {
    if (isVendedor) return vendedor
    if (isSupervisor) {
      if (seller && vendedorFiltrado) return vendedorFiltrado
      return supervisor
    }
    if (isGerencia || isAdmin) {
      if (seller && vendedorFiltrado) return vendedorFiltrado
      if (equipe && supervisorFiltrado) return supervisorFiltrado
      if (gerencia && gerenciaDataFiltrada) return gerenciaDataFiltrada
      return gerenciaData
    }
    return null
  }

  const getAgregadosPerfil = () => {
    if (isVendedor) return agregados
    if (isSupervisor) {
      if (seller && agregadosVendedorFiltrado) return agregadosVendedorFiltrado
      return agregadosSupervisor
    }
    if (isGerencia || isAdmin) {
      if (seller && agregadosVendedorFiltrado) return agregadosVendedorFiltrado
      if (equipe && agregadosSupervisorFiltrado) return agregadosSupervisorFiltrado
      return agregadosGerencia
    }
    return null
  }

  const getSARPerfil = () => {
    if (isVendedor) return sar
    if (isSupervisor) {
      if (seller && sarVendedorFiltrado) return sarVendedorFiltrado
      return sarSupervisor
    }
    if (isGerencia || isAdmin) {
      if (seller && sarVendedorFiltrado) return sarVendedorFiltrado
      if (equipe && sarSupervisorFiltrado) return sarSupervisorFiltrado
      return sarGerencia
    }
    return null
  }

  const dadosPerfil = getDadosPerfil()
  const agregadosPerfil = getAgregadosPerfil()
  const sarPerfil = getSARPerfil()

  const isLoading =
    (categoriesQuery && 'isLoading' in categoriesQuery ? categoriesQuery.isLoading : false) ||
    dadosLoading

  const categories = categoriesQuery && 'data' in categoriesQuery ? categoriesQuery.data ?? [] : []
  const vendedoresSupervisor = vendedoresSupervisorQuery.data || []
  const todosVendedores = todosVendedoresQuery.data || []
  const gerencias = gerenciasQuery.data || []
  const supervisores = supervisoresQuery.data || []
  const vendedoresPorEquipe = vendedoresPorEquipeQuery.data || []

  const vendedoresSupervisorOrdenados = vendedoresSupervisor.slice().sort((a, b) => Number(a.codigo) - Number(b.codigo))
  const todosVendedoresOrdenados = todosVendedores.slice().sort((a, b) => Number(a.codigo) - Number(b.codigo))
  const vendedoresPorEquipeOrdenados = vendedoresPorEquipe.slice().sort((a, b) => Number(a.codigo) - Number(b.codigo))
  const opcoesEquipe = supervisores
    .map((codigoSupervisor) => ({
      value: String(codigoSupervisor),
      label: supervisorEquipeMap[codigoSupervisor] || String(codigoSupervisor),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  const opcoesGerencia = gerencias
    .map((codigoGerencia) => ({ value: String(codigoGerencia), label: String(codigoGerencia) }))
    .filter((item) => item.label !== 'GERÊNCIA CHOK INTERNA')
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

  // (Removido) Permitir múltiplos filtros combinados para admin e gerência

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
  }, [user, authLoading, router])

  useEffect(() => {
    let ativo = true

    const buscarUltimaAtualizacao = async () => {
      try {
        const response = await fetch('/api/config/ultima-atualizacao', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Falha ao buscar última atualização')
        }

        const payload = (await response.json()) as { texto?: string | null }

        if (ativo) {
          setUltimaAtualizacao(payload.texto ?? null)
        }
      } catch (error) {
        console.error('Erro ao buscar ultima_atualizacao via API:', error)
      }
    }

    buscarUltimaAtualizacao()

    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (!isAdmin || authLoading || !user) {
      return
    }

    const job = getBulkPdfJob()
    if (!job || job.currentPage !== 'dashboard') {
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

    if (isLoading) {
      return
    }

    const stepKey = `dashboard-${job.currentIndex}`
    if (bulkStepRef.current === stepKey) {
      return
    }
    bulkStepRef.current = stepKey

    const proximoIndice = job.currentIndex + 1
    const total = job.sellers.length

    const exportar = async () => {
      const loadingToast = toast.loading(`Exportando dashboard ${proximoIndice}/${total}: ${sellerAtual.nome}`)

      try {
        const { exportDashboardToPDF } = await import('@/lib/export-pdf')
        await exportDashboardToPDF({
          reportTitle: `Dashboard - ${sellerAtual.codigo} - ${sellerAtual.nome}`,
          fileName: buildBulkPdfFileName('dashboard', sellerAtual),
        })

        saveBulkPdfJob({
          ...job,
          currentPage: 'top-clientes',
        })

        toast.success(`Dashboard concluido para ${sellerAtual.nome}.`, { id: loadingToast })

        router.push('/top-clientes')
      } catch (error) {
        console.error('Erro no passo de exportacao do dashboard:', error)
        clearBulkPdfJob()
        toast.error('Erro ao exportar dashboard em massa', { id: loadingToast })
      }
    }

    void exportar()
  }, [
    authLoading,
    equipe,
    gerencia,
    isAdmin,
    isLoading,
    router,
    seller,
    setEquipe,
    setGerencia,
    setSeller,
    user,
  ])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--border)] border-t-[#b480ff]" />
          </div>
          <p className="text-[var(--text-muted)]">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[var(--background)]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header 
          title="Boas vindas," 
          subtitle={
            user?.perfil === 'vendedor' 
              ? user?.usuario 
              : user?.perfil === 'admin' 
              ? 'Administrador' 
              : 'Comandante'
          } 
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Filters Card - Only for supervisor, gerencia and admin */}
            {user?.perfil !== 'vendedor' && (
              <div className="saas-filter-card rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 md:p-6">
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="saas-filter-title text-sm font-semibold uppercase tracking-wide text-gray-400">
                    Filtros
                  </h3>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="saas-filter-button w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[#b480ff]/10 sm:w-auto"
                  >
                    Limpar filtros
                  </button>
                </div>

                {/* Filter Inputs */}
                <div className={`grid gap-3 md:gap-4 grid-cols-1 ${isSupervisor ? '' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                  <div>
                    <label className="saas-filter-label text-xs font-medium text-gray-400 uppercase tracking-wide">Vendedor</label>
                    <CustomSelect
                      value={seller ?? ''}
                      onChange={(val) => setSeller(val === '' ? null : val)}
                      options={
                        isSupervisor
                          ? [
                              { value: '', label: 'Toda a equipe' },
                              ...vendedoresSupervisorOrdenados.map((v) => ({ value: String(v.codigo), label: `${v.codigo} - ${v.nome}` })),
                            ]
                          : (isGerencia || isAdmin)
                          ? [
                              {
                                value: '',
                                label: equipe
                                  ? 'Todos da equipe'
                                  : gerencia
                                  ? 'Todos da gerência'
                                  : 'Todos os vendedores',
                              },
                              ...(
                                equipe
                                  ? vendedoresPorEquipeOrdenados.map((v) => ({ value: String(v.codigo), label: `${v.codigo} - ${v.nome}` }))
                                  : todosVendedoresOrdenados.map((v) => ({ value: String(v.codigo), label: `${v.codigo} - ${v.nome}` }))
                              ),
                            ]
                          : [{ value: '', label: 'Todos os vendedores' }]
                      }
                      placeholder="Selecione"
                    />
                  </div>

                  {!isSupervisor && (
                    <>
                      <div>
                        <label className="saas-filter-label text-xs font-medium text-gray-400 uppercase tracking-wide">Equipe</label>
                        <CustomSelect
                          value={equipe ?? ''}
                          onChange={(val) => {
                            setEquipe(val === '' ? null : val)
                            setSeller(null)
                          }}
                          options={[
                            { value: '', label: 'Todas as equipes' },
                            ...opcoesEquipe,
                          ]}
                          placeholder="Selecione"
                        />
                      </div>

                      <div>
                        <label className="saas-filter-label text-xs font-medium text-gray-400 uppercase tracking-wide">Gerência</label>
                        <CustomSelect
                          value={gerencia ?? ''}
                          onChange={(val) => {
                            setGerencia(val === '' ? null : val)
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
                    </>
                  )}
                </div>
              </div>
            )}

            {/* KPIs */}
            <div>
              <h2 className="mb-4 text-lg md:text-xl font-bold text-[var(--foreground)]">
                Indicadores Principais
              </h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col">
                  <KPICard
                    title="Faturamento"
                    value={`R$ ${(agregadosPerfil?.faturamento.realizado ?? 0).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                    })}`}
                    icon={<TrendingUp size={28} />}
                    color="purple"
                    isLoading={isLoading}
                    meta={`R$ ${(agregadosPerfil?.faturamento.meta ?? 0).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                    })}`}
                    realizado={`R$ ${(agregadosPerfil?.faturamento.realizado ?? 0).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                    })}`}
                    percentage={agregadosPerfil?.faturamento.percentual ?? 0}
                  />
                  <div className="mt-1.5 h-4 px-1 md:mt-2 md:h-5">
                    {ultimaAtualizacao && (
                      <p className="text-[11px] leading-4 text-[#F4F6F8]/80 md:text-xs">
                        {ultimaAtualizacao}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <KPICard
                    title="Cobertura"
                    value={`${agregadosPerfil?.cobertura.realizado ?? 0} clientes`}
                    icon={<Target size={28} />}
                    color="blue"
                    isLoading={isLoading}
                    meta={`${agregadosPerfil?.cobertura.meta ?? 0} clientes`}
                    realizado={`${agregadosPerfil?.cobertura.realizado ?? 0} clientes`}
                    percentage={agregadosPerfil?.cobertura.percentual ?? 0}
                  />
                  <div className="mt-1.5 h-4 px-1 md:mt-2 md:h-5" />
                </div>
                <div className="flex flex-col">
                  <KPICard
                    title="Sortimento"
                    value={`R$ ${(agregadosPerfil?.sortimento.realizado ?? 0).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                    })}`}
                    icon={<ShoppingCart size={28} />}
                    color="purple-light"
                    isLoading={isLoading}
                    meta={`R$ ${(agregadosPerfil?.sortimento.meta ?? 0).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                    })}`}
                    realizado={`R$ ${(agregadosPerfil?.sortimento.realizado ?? 0).toLocaleString('pt-BR', {
                      maximumFractionDigits: 2,
                    })}`}
                    percentage={agregadosPerfil?.sortimento.percentual ?? 0}
                  />
                  <div className="mt-1.5 h-4 px-1 md:mt-2 md:h-5" />
                </div>
                <div className="flex flex-col">
                  <KPICard
                    title="%Margem"
                    value={`${((agregadosPerfil?.margem.percentual ?? 0) * 100).toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}%`}
                    icon={<DollarSign size={28} />}
                    color="blue"
                    isLoading={isLoading}
                  />
                  <div className="mt-1.5 h-4 px-1 md:mt-2 md:h-5" />
                </div>
              </div>
            </div>

            {/* Metas Table */}
            <div className="saas-section-card">
              <h2 className="saas-section-title px-1">Metas</h2>
              <div className="saas-table-shell overflow-hidden">
                <div className="saas-table-scroll">
                <table className="saas-table w-full min-w-max">
                  <thead>
                    <tr>
                      <th className="saas-table-head saas-table-sticky-col">Tipo de meta</th>
                      <th className="saas-table-head">Meta</th>
                      <th className="saas-table-head">Realizado</th>
                      <th className="saas-table-head">%</th>
                      <th className="saas-table-head">Data Início</th>
                      <th className="saas-table-head">Data Fim</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="saas-table-row">
                      <td className="saas-table-cell saas-table-sticky-col saas-table-cell-primary whitespace-nowrap">Faseamento</td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-16 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          `R$ ${(dadosPerfil?.metaFaseamento ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                      </td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-16 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          `R$ ${(dadosPerfil?.realizadoFaseamento ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                      </td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-12 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.metaFaseamento && dadosPerfil?.metaFaseamento > 0 ? (
                            <div className="flex items-center gap-2">
                              {(() => {
                                const percent = Math.round(((dadosPerfil?.realizadoFaseamento ?? 0) / dadosPerfil?.metaFaseamento) * 1000) / 10;
                                let color = "text-red-700";
                                if (percent >= 100) color = "text-green-700";
                                else if (percent >= 70) color = "text-yellow-600";
                                return (
                                  <>
                                    <div className="min-w-[60px] max-w-[120px] h-4 rounded-full bg-green-500/20 relative overflow-hidden" style={{ background: 'linear-gradient(90deg, #b480ff33 0%, #fff0 100%)' }}>
                                      <div className="absolute left-0 top-0 h-full rounded-full bg-[var(--progress-bar)] transition-all duration-300" style={{ width: `${Math.min(percent, 100)}%` }} />
                                    </div>
                                    <span className={`font-semibold text-xs ${color}`}>{percent.toFixed(1)}%</span>
                                  </>
                                );
                              })()}
                            </div>
                          ) : '—'
                        )}
                      </td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-16 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.dataInicialFaseamento ? new Date(new Date(1900, 0, 1).getTime() + (dadosPerfil?.dataInicialFaseamento - 2) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR') : '—'
                        )}
                      </td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-16 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.dataFinalFaseamento ? new Date(new Date(1900, 0, 1).getTime() + (dadosPerfil?.dataFinalFaseamento - 2) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR') : '—'
                        )}
                      </td>
                    </tr>
                    <tr className="saas-table-row">
                      <td className="saas-table-cell saas-table-sticky-col saas-table-cell-primary whitespace-nowrap">Faseamento II</td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-16 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.metaFaseamentoII !== null && dadosPerfil?.metaFaseamentoII !== undefined
                            ? `R$ ${(dadosPerfil?.metaFaseamentoII ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'
                        )}
                      </td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-16 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.realizadoFaseamentoII !== null && dadosPerfil?.realizadoFaseamentoII !== undefined
                            ? `R$ ${(dadosPerfil?.realizadoFaseamentoII ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'
                        )}
                      </td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-12 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.metaFaseamentoII && dadosPerfil?.metaFaseamentoII > 0 ? (
                            <div className="flex items-center gap-2">
                              {(() => {
                                const percent = Math.round(((dadosPerfil?.realizadoFaseamentoII ?? 0) / dadosPerfil?.metaFaseamentoII) * 1000) / 10;
                                let color = "text-red-700";
                                if (percent >= 100) color = "text-green-700";
                                else if (percent >= 70) color = "text-yellow-600";
                                return (
                                  <>
                                    <div className="min-w-[60px] max-w-[120px] h-4 rounded-full bg-green-500/20 relative overflow-hidden" style={{ background: 'linear-gradient(90deg, #b480ff33 0%, #fff0 100%)' }}>
                                      <div className="absolute left-0 top-0 h-full rounded-full bg-[var(--progress-bar)] transition-all duration-300" style={{ width: `${Math.min(percent, 100)}%` }} />
                                    </div>
                                    <span className={`font-semibold text-xs ${color}`}>{percent.toFixed(1)}%</span>
                                  </>
                                );
                              })()}
                            </div>
                          ) : '—'
                        )}
                      </td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-16 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.dataInicialFaseamentoII ? new Date(new Date(1900, 0, 1).getTime() + (dadosPerfil?.dataInicialFaseamentoII - 2) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR') : '—'
                        )}
                      </td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-16 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.dataFinalFaseamentoII ? new Date(new Date(1900, 0, 1).getTime() + (dadosPerfil?.dataFinalFaseamentoII - 2) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR') : '—'
                        )}
                      </td>
                    </tr>
                    <tr className="saas-table-row">
                      <td className="saas-table-cell saas-table-sticky-col saas-table-cell-primary whitespace-nowrap">Desconcentração</td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-20 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.metaDesconcentracao !== null && dadosPerfil?.metaDesconcentracao !== undefined
                            ? `R$ ${(dadosPerfil?.metaDesconcentracao ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'
                        )}
                      </td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-20 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.realizadoDesconcentracao !== null && dadosPerfil?.realizadoDesconcentracao !== undefined
                            ? `R$ ${(dadosPerfil?.realizadoDesconcentracao ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'
                        )}
                      </td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-16 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.metaDesconcentracao && dadosPerfil?.metaDesconcentracao > 0 ? (
                            <div className="flex items-center gap-2">
                              {(() => {
                                const percent = Math.round(((dadosPerfil?.realizadoDesconcentracao ?? 0) / dadosPerfil?.metaDesconcentracao) * 1000) / 10;
                                let color = "text-red-700";
                                if (percent >= 100) color = "text-green-700";
                                else if (percent >= 70) color = "text-yellow-600";
                                return (
                                  <>
                                    <div className="min-w-[60px] max-w-[120px] h-4 rounded-full bg-green-500/20 relative overflow-hidden" style={{ background: 'linear-gradient(90deg, #b480ff33 0%, #fff0 100%)' }}>
                                      <div className="absolute left-0 top-0 h-full rounded-full bg-[var(--progress-bar)] transition-all duration-300" style={{ width: `${Math.min(percent, 100)}%` }} />
                                    </div>
                                    <span className={`font-semibold text-xs ${color}`}>{percent.toFixed(1)}%</span>
                                  </>
                                );
                              })()}
                            </div>
                          ) : '—'
                        )}
                      </td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-16 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.dataInicialDesconcentracao ? new Date(new Date(1900, 0, 1).getTime() + (dadosPerfil?.dataInicialDesconcentracao - 2) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR') : '—'
                        )}
                      </td>
                      <td className="saas-table-cell whitespace-nowrap">
                        {isLoading ? (
                          <span className="h-4 w-16 animate-pulse rounded bg-[var(--panel-muted)]" />
                        ) : (
                          dadosPerfil?.dataFinalDesconcentracao ? new Date(new Date(1900, 0, 1).getTime() + (dadosPerfil?.dataFinalDesconcentracao - 2) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR') : '—'
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            </div>

            {/* SAR Table */}
            <div className="saas-section-card">
              <h2 className="saas-section-title px-1">SAR</h2>
              <div className="saas-table-shell overflow-hidden">
                <div className="saas-table-scroll">
                <table className="saas-table w-full min-w-max">
                  <thead>
                    <tr>
                      <th className="saas-table-head saas-table-sticky-col">SAR</th>
                      <th className="saas-table-head">Visitas</th>
                      <th className="saas-table-head">Positivação</th>
                      <th className="saas-table-head">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[{
                      label: 'Positivação Diária',
                      data: sarPerfil?.positivacaoDiaria
                    }, {
                      label: 'Positivação Acumulada',
                      data: sarPerfil?.positivacaoAcumulada
                    }, {
                      label: 'Fora de rota Diário',
                      data: sarPerfil?.foraDeRotaDiario
                    }, {
                      label: 'Fora de rota Acumulado',
                      data: sarPerfil?.foraDeRotaAcumulado
                    }].map((item, idx) => (
                      <tr
                        key={item.label}
                        className="saas-table-row"
                      >
                        <td className="saas-table-cell saas-table-sticky-col saas-table-cell-primary whitespace-nowrap">{item.label}</td>
                        <td className="saas-table-cell whitespace-nowrap">{item.data?.visitas ?? '—'}</td>
                        <td className="saas-table-cell whitespace-nowrap">
                          {item.data ? ('positivacao' in item.data ? item.data.positivacao : item.data.foraDeRota) : '—'}
                        </td>
                        <td className="saas-table-cell whitespace-nowrap">
                          {item.data?.percentual !== undefined ? (
                            <div className="flex items-center gap-2">
                              <div className="min-w-[60px] max-w-[120px] h-4 rounded-full bg-green-500/20 text-green-700 relative overflow-hidden" style={{ background: 'linear-gradient(90deg, #b480ff33 0%, #fff0 100%)' }}>
                                <div className="absolute left-0 top-0 h-full rounded-full bg-[var(--progress-bar)] transition-all duration-300" style={{ width: `${Math.min(item.data.percentual, 100)}%` }} />
                              </div>
                              {(() => {
                                const val = item.data.percentual;
                                // Primeiras duas linhas: >=60% verde, <60% vermelho
                                if (idx < 2) {
                                  return (
                                    <span className={`font-semibold text-xs ${val >= 60 ? 'text-green-700' : 'text-red-600'}`}>{val.toFixed(1)}%</span>
                                  );
                                }
                                // Últimas duas linhas: <=15% verde, >15% vermelho
                                else {
                                  return (
                                    <span className={`font-semibold text-xs ${val <= 15 ? 'text-green-700' : 'text-red-600'}`}>{val.toFixed(1)}%</span>
                                  );
                                }
                              })()}
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>

            {/* Categories Table */}
            <div className="saas-section-card">
              <h2 className="saas-section-title px-1">Categorias</h2>
              <div className="saas-table-shell overflow-hidden">
                <div className="saas-table-scroll">
                <table className="saas-table w-full min-w-max">
                  <thead>
                    <tr>
                      {[
                        'Categorias',
                        'Meta R$',
                        'Realizado',
                        '% R$',
                        'Meta Cob.',
                        'Real. Cob.',
                        '% Cob.',
                        '% Margem'
                      ].map((header) => (
                        <th
                          key={header}
                          className={`saas-table-head ${header === 'Categorias' ? 'saas-table-sticky-col' : ''}`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="saas-table-cell text-center">
                          <span className="h-4 w-16 animate-pulse rounded bg-[var(--panel-muted)] inline-block" />
                        </td>
                      </tr>
                    ) : categoriesQuery.error ? (
                      <tr>
                        <td colSpan={8} className="saas-table-cell text-center text-red-500">
                          Erro ao carregar categorias. Clique em Limpar filtros e tente novamente.
                        </td>
                      </tr>
                    ) : categories.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="saas-table-cell text-center text-[var(--foreground)]">Nenhuma categoria encontrada</td>
                      </tr>
                    ) : (
                      categories.map((cat) => (
                        <tr
                          key={cat.categoria}
                          className="saas-table-row"
                        >
                          <td className="saas-table-cell saas-table-sticky-col saas-table-cell-primary whitespace-nowrap">{cat.categoria}</td>
                          <td className="saas-table-cell whitespace-nowrap">{`R$ ${(cat.metaFaturamento ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`}</td>
                          <td className="saas-table-cell whitespace-nowrap">{`R$ ${(cat.realizadoFaturamento ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`}</td>
                          <td className="saas-table-cell whitespace-nowrap">
                            {(() => {
                              const percent = cat.percentualFaturamento ?? 0;
                              let color = "text-red-700";
                              if (percent >= 100) color = "text-green-700";
                              else if (percent >= 70) color = "text-yellow-600";
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="min-w-[60px] max-w-[120px] h-4 rounded-full bg-green-500/20 relative overflow-hidden" style={{ background: 'linear-gradient(90deg, #b480ff33 0%, #fff0 100%)' }}>
                                    <div className="absolute left-0 top-0 h-full rounded-full bg-[var(--progress-bar)] transition-all duration-300" style={{ width: `${Math.min(percent, 100)}%` }} />
                                  </div>
                                  <span className={`font-semibold text-xs ${color}`}>{percent.toFixed(1)}%</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="saas-table-cell whitespace-nowrap">{`${(cat.metaCobertura ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}</td>
                          <td className="saas-table-cell whitespace-nowrap">{`${(cat.realizadoCobertura ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}</td>
                          <td className="saas-table-cell whitespace-nowrap">
                            {(() => {
                              const percent = cat.percentualCobertura ?? 0;
                              let color = "text-red-700";
                              if (percent >= 100) color = "text-green-700";
                              else if (percent >= 70) color = "text-yellow-600";
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="min-w-[60px] max-w-[120px] h-4 rounded-full bg-green-500/20 relative overflow-hidden" style={{ background: 'linear-gradient(90deg, #b480ff33 0%, #fff0 100%)' }}>
                                    <div className="absolute left-0 top-0 h-full rounded-full bg-[var(--progress-bar)] transition-all duration-300" style={{ width: `${Math.min(percent, 100)}%` }} />
                                  </div>
                                  <span className={`font-semibold text-xs ${color}`}>{percent.toFixed(1)}%</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="saas-table-cell whitespace-nowrap">{`${(cat.percentualMargem ?? 0).toFixed(1)}%`}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}
