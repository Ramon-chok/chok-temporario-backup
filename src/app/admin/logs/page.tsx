'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { BarChart3, CalendarRange, Trash2, Users, Eye, Clock3 } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { useAuth } from '@/hooks/useAuth'

type PeriodFilter = 'today' | '7d' | 'this_month' | 'last_month'

interface AnalyticsResponse {
  cards: {
    visitsToday: number
    visitsMonth: number
    uniqueUsersToday: number
    mostVisitedPage: string
  }
  visitsByDay: Array<{ date: string; visitas: number }>
  topPages: Array<{
    pagePath: string
    pageName: string
    visitsToday: number
    visitsMonth: number
    averageDurationSeconds: number
    uniqueUsers: number
    periodVisits: number
  }>
  recentActivity: Array<{
    id: number
    user: string
    pageName: string
    pagePath: string
    createdAt: string
    durationSeconds: number
  }>
}

const PERIOD_OPTIONS: Array<{ value: PeriodFilter; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês anterior' },
]

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return '0s'
  if (seconds < 60) return `${seconds}s`

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

export default function AdminLogsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [period, setPeriod] = useState<PeriodFilter>('today')
  const [isLoading, setIsLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [data, setData] = useState<AnalyticsResponse | null>(null)

  const fetchAnalytics = async () => {
    if (!user?.perfil || !user?.usuario) return

    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        period,
      })

      const response = await fetch(`/api/page-logs?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Não foi possível carregar os logs')
      }

      const json = (await response.json()) as AnalyticsResponse
      setData(json)
    } catch (error) {
      console.error('Erro ao buscar analytics de logs:', error)
      toast.error('Erro ao carregar logs de uso')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return

    if (!user || user.perfil !== 'admin') {
      router.replace('/dashboard')
      return
    }

    void fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, router, period])

  const handleClearLogs = async () => {
    if (!user?.perfil || !user?.usuario) return

    try {
      setIsClearing(true)
      const response = await fetch('/api/page-logs', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Falha ao limpar logs')
      }

      toast.success('Logs zerados com sucesso!')
      setShowConfirmClear(false)
      await fetchAnalytics()
    } catch (error) {
      console.error('Erro ao zerar logs:', error)
      toast.error('Erro ao zerar logs')
    } finally {
      setIsClearing(false)
    }
  }

  const maxVisits = useMemo(() => {
    const values = data?.visitsByDay?.map((item) => item.visitas) || []
    return Math.max(1, ...values)
  }, [data?.visitsByDay])

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-500" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Header
          title="Logs de Uso"
          subtitle="Monitoramento de navegação e atividade dos usuários"
        />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="saas-filter-card rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="saas-filter-title flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <CalendarRange size={16} />
                  Período
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                    className="saas-filter-control saas-filter-select rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#818cf8]/50"
                  >
                    {PERIOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowConfirmClear(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
                  >
                    <Trash2 size={16} />
                    Zerar Logs
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <span>Visitas hoje</span>
                  <Eye size={14} />
                </div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{data?.cards.visitsToday ?? 0}</p>
              </article>

              <article className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <span>Visitas no mês</span>
                  <BarChart3 size={14} />
                </div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{data?.cards.visitsMonth ?? 0}</p>
              </article>

              <article className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <span>Usuários únicos hoje</span>
                  <Users size={14} />
                </div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{data?.cards.uniqueUsersToday ?? 0}</p>
              </article>

              <article className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <span>Página mais acessada</span>
                  <Clock3 size={14} />
                </div>
                <p className="truncate text-base font-semibold text-[var(--foreground)]">{data?.cards.mostVisitedPage ?? '-'}</p>
              </article>
            </section>

            <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 md:p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Visitas por dia (últimos 30 dias)</h2>

              {isLoading ? (
                <div className="h-52 animate-pulse rounded-lg bg-[var(--panel-muted)]" />
              ) : (
                <div className="h-56 overflow-x-auto">
                  <div className="flex h-full min-w-[780px] items-end gap-2">
                    {(data?.visitsByDay || []).map((item) => {
                      const height = `${Math.max(6, (item.visitas / maxVisits) * 100)}%`
                      const dateLabel = new Date(item.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })

                      return (
                        <div key={item.date} className="flex flex-1 min-w-[20px] flex-col items-center justify-end gap-2">
                          <span className="text-[10px] text-[var(--text-muted)]">{item.visitas}</span>
                          <div className="w-full rounded-t bg-[var(--accent)]/70" style={{ height }} />
                          <span className="text-[10px] text-[var(--text-muted)]">{dateLabel}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 md:p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Páginas mais acessadas</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      <th className="px-3 py-2">Página</th>
                      <th className="px-3 py-2">Visitas hoje</th>
                      <th className="px-3 py-2">Visitas no mês</th>
                      <th className="px-3 py-2">Tempo médio</th>
                      <th className="px-3 py-2">Usuários únicos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.topPages || []).map((row) => (
                      <tr key={row.pagePath} className="border-b border-[var(--border)]/70 hover:bg-[var(--panel-muted)]/50">
                        <td className="px-3 py-2 font-medium text-[var(--foreground)]">{row.pageName}</td>
                        <td className="px-3 py-2 text-[var(--text-muted)]">{row.visitsToday}</td>
                        <td className="px-3 py-2 text-[var(--text-muted)]">{row.visitsMonth}</td>
                        <td className="px-3 py-2 text-[var(--text-muted)]">{formatDuration(row.averageDurationSeconds)}</td>
                        <td className="px-3 py-2 text-[var(--text-muted)]">{row.uniqueUsers}</td>
                      </tr>
                    ))}
                    {(data?.topPages?.length || 0) === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-[var(--text-muted)]">
                          Nenhum dado de acesso encontrado para o período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 md:p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Atividade recente (últimas 50 entradas)</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      <th className="px-3 py-2">Usuário</th>
                      <th className="px-3 py-2">Página</th>
                      <th className="px-3 py-2">Horário</th>
                      <th className="px-3 py-2">Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.recentActivity || []).map((row) => (
                      <tr key={row.id} className="border-b border-[var(--border)]/70 hover:bg-[var(--panel-muted)]/50">
                        <td className="px-3 py-2 text-[var(--text-muted)]">{row.user}</td>
                        <td className="px-3 py-2 font-medium text-[var(--foreground)]">{row.pageName}</td>
                        <td className="px-3 py-2 text-[var(--text-muted)]">
                          {new Date(row.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-muted)]">{formatDuration(row.durationSeconds)}</td>
                      </tr>
                    ))}
                    {(data?.recentActivity?.length || 0) === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-[var(--text-muted)]">
                          Nenhuma atividade recente encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>

      {showConfirmClear && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !isClearing && setShowConfirmClear(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-red-500/40 bg-[var(--panel)] p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">Confirmar limpeza total</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Esta ação remove todos os registros da tabela de logs. Não é possível desfazer.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                disabled={isClearing}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--panel-muted)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={isClearing}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                <Trash2 size={14} />
                {isClearing ? 'Limpando...' : 'Zerar Logs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
