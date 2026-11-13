'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { DataTable } from '@/components/DataTable'
import { KPICard } from '@/components/KPICard'
import { useAuth } from '@/hooks/useAuth'
import { useCategoriasNaoPositivados, useNaoPositivados } from '@/hooks/useQueries'
import { useFilterStore } from '@/store/filterStore'
import { useVendedoresSupervisor } from '@/hooks/useVendedoresSupervisor'
import { useTodosVendedores } from '@/hooks/useTodosVendedores'
import { useSupervisores } from '@/hooks/useSupervisores'
import { useGerencias } from '@/hooks/useGerencias'
import { useVendedoresPorEquipe } from '@/hooks/useVendedoresPorEquipe'
import { supervisorEquipeMap } from '@/lib/supervisorEquipeMap'
import { CheckCircle2, XCircle, Users, TrendingUp } from 'lucide-react'
import { CustomSelect } from '@/components/CustomSelect'
import type { ClienteNaoPositivado } from '@/types'
import { usePageTracking } from '@/hooks/usePageTracking'

export default function NaoPositivadosPage() {
  usePageTracking('Não Positivados')

  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { seller, equipe, gerencia, setSeller, setEquipe, setGerencia, clearFilters } = useFilterStore()
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null)
  const [municipioSelecionado, setMunicipioSelecionado] = useState<string | null>(null)
  const [statusSelecionado, setStatusSelecionado] = useState<string | null>(null) // 'positivado', 'nao_positivado', ou null (todos)
  const [pesquisaCliente, setPesquisaCliente] = useState<string>('')

  const isSupervisor = user?.perfil === 'supervisor'
  const isGerencia = user?.perfil === 'gerencia'
  const isAdmin = user?.perfil === 'admin'

  const vendedoresSupervisorQuery = useVendedoresSupervisor()
  const todosVendedoresQuery = useTodosVendedores()
  const supervisoresQuery = useSupervisores()
  const gerenciasQuery = useGerencias()
  const codigoEquipeSelecionada = equipe ? parseInt(equipe, 10) : null
  const vendedoresPorEquipeQuery = useVendedoresPorEquipe(codigoEquipeSelecionada)

  const {
    data: categorias = [],
    isLoading: loadingCategorias,
    error: categoriasError,
  } = useCategoriasNaoPositivados(
    (user?.perfil as 'vendedor' | 'supervisor' | 'gerencia' | 'admin' | undefined) || null,
    user?.usuario || null,
    seller,
    equipe
  )
  const {
    data: clientes = [],
    isLoading: loadingClientes,
    error: clientesError,
  } = useNaoPositivados(
    categoriaSelecionada,
    (user?.perfil as 'vendedor' | 'supervisor' | 'gerencia' | 'admin' | undefined) || null,
    user?.usuario || null
  )

  const mensagemErro = [clientesError, categoriasError]
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
  ).slice().sort((a, b) => Number(a.codigo) - Number(b.codigo))

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-500"></div>
      </div>
    )
  }

  // Aplicar filtro base (categoria já vem da API, aqui filtramos município)
  const clientesBase = clientes.filter((c: ClienteNaoPositivado) => {
    // Filtro de município
    if (municipioSelecionado && c.municipio !== municipioSelecionado) {
      return false
    }
    return true
  })

  // Aplicar filtro de status e pesquisa na tabela
  const clientesFiltrados = clientesBase.filter((c: ClienteNaoPositivado) => {
    // Pesquisa por código, razão social ou nome fantasia
    if (pesquisaCliente.trim()) {
      const termo = pesquisaCliente.trim().toLowerCase()
      const codigo = c.codigoCliente?.toString().toLowerCase() || ''
      const razaoSocial = (c.nomeCliente || '').toLowerCase()
      const nomeFantasia = (c.nomeFantasia || '').toLowerCase()

      const encontrou =
        codigo.includes(termo) ||
        razaoSocial.includes(termo) ||
        nomeFantasia.includes(termo)

      if (!encontrou) {
        return false
      }
    }
    // Filtro de status
    if (statusSelecionado === 'positivado' && !c.positivado) {
      return false
    }
    if (statusSelecionado === 'nao_positivado' && c.positivado) {
      return false
    }
    return true
  })

  const totalClientes = clientesBase.length
  const positivados = clientesBase.filter((c: ClienteNaoPositivado) => c.positivado).length
  const naoPositivados = totalClientes - positivados
  const percentualPositivacao = totalClientes > 0 ? (positivados / totalClientes) * 100 : 0

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Não positivados"
          subtitle="Acompanhe clientes positivados e não positivados por categoria"
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
          {mensagemErro && (
            <div className="rounded-lg border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {mensagemErro}
            </div>
          )}

          {(isSupervisor || isGerencia || isAdmin) && (
            <div className="saas-filter-card rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 md:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="saas-filter-title text-sm font-semibold uppercase tracking-wide text-gray-400">Filtros</h3>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="saas-filter-button w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[#b480ff]/10 sm:w-auto"
                >
                  Limpar filtros
                </button>
              </div>

              <div className={`grid gap-3 md:gap-4 grid-cols-1 ${isSupervisor ? '' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>

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
              </div>
            </div>
          )}

          {/* Filtros de Categoria, Município e Status */}
          <div className="saas-filter-card rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 md:p-6">
            <h3 className="saas-filter-title mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Filtros de Visualização</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Filtro Categoria */}
              <div>
                <label htmlFor="categoria" className="saas-filter-label mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400">
                  Categoria
                </label>
                <select
                  id="categoria"
                  value={categoriaSelecionada || ''}
                  onChange={(e) => setCategoriaSelecionada(e.target.value || null)}
                  disabled={loadingCategorias}
                  className="saas-filter-control saas-filter-select w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[#b480ff] focus:outline-none focus:ring-2 focus:ring-[#b480ff]/20 disabled:opacity-50"
                >
                  <option value="">Geral (todas)</option>
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              
                </select>
              </div>

              {/* Filtro Status */}
              <div>
                <label htmlFor="status" className="saas-filter-label mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400">
                  Status
                </label>
                <select
                  id="status"
                  value={statusSelecionado || ''}
                  onChange={(e) => setStatusSelecionado(e.target.value || null)}
                  className="saas-filter-control saas-filter-select w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[#b480ff] focus:outline-none focus:ring-2 focus:ring-[#b480ff]/20"
                >
                  <option value="">Todos</option>
                  <option value="positivado">Positivados</option>
                  <option value="nao_positivado">Não Positivados</option>
                </select>
              </div>

              {/* Filtro Pesquisa Cliente */}
              <div>
                <label htmlFor="pesquisaCliente" className="saas-filter-label mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400">
                  Pesquisa Cliente
                </label>
                <input
                  id="pesquisaCliente"
                  type="text"
                  value={pesquisaCliente}
                  onChange={(e) => setPesquisaCliente(e.target.value)}
                  placeholder="Código, Razão Social ou Nome Fantasia"
                  className="saas-filter-control w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[#b480ff] focus:outline-none focus:ring-2 focus:ring-[#b480ff]/20"
                />
              </div>
            </div>

            {/* Botão Limpar Filtros de Visualização */}
            {(categoriaSelecionada || municipioSelecionado || statusSelecionado) && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCategoriaSelecionada(null)
                    setMunicipioSelecionado(null)
                    setStatusSelecionado(null)
                  }}
                  className="saas-filter-button w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[#b480ff]/10 sm:w-auto"
                >
                  Limpar filtros de visualização
                </button>
              </div>
            )}
          </div>

          {/* Cards KPI */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Base Clientes"
              value={totalClientes.toString()}
              icon={<Users size={28} />}
              color="purple"
              isLoading={loadingClientes}
            />
            <KPICard
              title="Positivados"
              value={positivados.toString()}
              icon={<CheckCircle2 size={28} />}
              color="blue"
              isLoading={loadingClientes}
            />
            <KPICard
              title="Não Positivados"
              value={naoPositivados.toString()}
              icon={<XCircle size={28} />}
              color="pink"
              isLoading={loadingClientes}
            />
            <KPICard
              title="% Positivação"
              value={`${percentualPositivacao.toFixed(1)}%`}
              icon={<TrendingUp size={28} />}
              color="purple-light"
              isLoading={loadingClientes}
            />
          </div>

          {/* Tabela de clientes */}
          <div>
            <h2 className="mb-4 text-lg md:text-xl font-bold text-[var(--foreground)]">
              Clientes - {categoriaSelecionada || 'Geral'}
            </h2>
            <DataTable<ClienteNaoPositivado>
              columns={[
                {
                  header: 'Código',
                  accessor: 'codigoCliente',
                },
                {
                  header: 'Razão Social',
                  accessor: 'nomeCliente',
                },
                {
                  header: 'Nome Fantasia',
                  accessor: 'nomeFantasia',
                  format: (value) => (value as string) || '-',
                },
                {
                  header: 'Município',
                  accessor: 'municipio',
                  format: (value) => (value as string) || '-',
                },
                {
                  header: 'Status',
                  accessor: 'positivado',
                  format: (value) =>
                    value ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500">
                        <CheckCircle2 size={14} />
                        Positivado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500">
                        <XCircle size={14} />
                        Não positivado
                      </span>
                    ),
                },
                {
                  header: 'Valor',
                  accessor: 'valor',
                  format: (value, row) => {
                    const val = value as number
                    const positivado = (row as ClienteNaoPositivado)?.positivado
                    if (!positivado) {
                      return (
                        <span className="text-red-500 font-bold text-lg">X</span>
                      )
                    }
                    return `R$ ${val.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  },
                },
              ]}
              data={clientesFiltrados}
              isLoading={loadingClientes}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  </div>
)
}


