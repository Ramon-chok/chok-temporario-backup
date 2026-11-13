"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/Sidebar";
import ChamadoConversaModal from '@/components/ChamadoConversaModal';
import { usePageTracking } from '@/hooks/usePageTracking'

const CHAMADOS_PAGE_SIZE = 20

interface Chamado {
  id: string
  nome: string
  codigo: string
  descricao: string
  status: 'aberto' | 'em andamento' | 'encerrado'
  data_criacao: string
}

export default function ChamadosPage() {
  usePageTracking('Chamados')

  const { user } = useAuth();
  const router = useRouter();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [isLoadingChamados, setIsLoadingChamados] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [activeTab, setActiveTab] = useState<'abertos' | 'encerrados'>('abertos');
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [selectedChamadoId, setSelectedChamadoId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1)
  const [totalChamados, setTotalChamados] = useState(0)

  const fetchChamados = useCallback(async (page = currentPage, tab = activeTab) => {
    setIsLoadingChamados(true)

    try {
      const from = (page - 1) * CHAMADOS_PAGE_SIZE
      const to = from + CHAMADOS_PAGE_SIZE - 1

      let query = supabase
        .from('chamados')
        .select('id, nome, codigo, descricao, status, data_criacao', { count: 'exact' })
        .order('data_criacao', { ascending: false })

      if (tab === 'abertos') {
        query = query.in('status', ['aberto', 'em andamento'])
      } else {
        query = query.eq('status', 'encerrado')
      }

      const { data, count, error } = await query.range(from, to)
      if (error) {
        throw error
      }

      setChamados(data || [])
      setTotalChamados(count || 0)
    } catch (error) {
      console.error('Erro ao buscar chamados:', error)
      setChamados([])
      setTotalChamados(0)
    } finally {
      setIsLoadingChamados(false)
    }
  }, [activeTab, currentPage])

  useEffect(() => {
    if (!user || user.perfil !== "admin") {
      router.replace("/dashboard");
      return;
    }
    setCurrentPage(1)
    setExpandedId(null)
    void fetchChamados(1, activeTab)
  }, [user, router, activeTab, fetchChamados]);

  const totalPages = Math.max(1, Math.ceil(totalChamados / CHAMADOS_PAGE_SIZE))

  const handleStatusChange = async (id: string | number, status: string) => {
    setUpdatingId(id);
    await fetch(`/api/chamados/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    await fetchChamados(currentPage, activeTab)
    setUpdatingId(null);
  };

  const handleDeleteEncerrados = async () => {
    setDeleting(true);
    await fetch('/api/chamados/encerrados', {
      method: 'DELETE',
    });
    setCurrentPage(1)
    await fetchChamados(1, 'encerrados')
    setDeleting(false);
  };

  const handlePreviousPage = async () => {
    if (currentPage <= 1 || isLoadingChamados) return
    const nextPage = currentPage - 1
    setCurrentPage(nextPage)
    setExpandedId(null)
    await fetchChamados(nextPage, activeTab)
  }

  const handleNextPage = async () => {
    if (currentPage >= totalPages || isLoadingChamados) return
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    setExpandedId(null)
    await fetchChamados(nextPage, activeTab)
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Sidebar />
      <div className="flex-1 max-w-4xl mx-auto p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Chamados</h1>
          <p className="text-white/70">Acompanhe e gerencie os chamados de suporte enviados pelos usuários.</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-0"
        >
          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10 bg-white/5 rounded-t-2xl">
            <button
              onClick={() => setActiveTab('abertos')}
              className={`px-6 py-3 font-semibold rounded-t-2xl transition-colors focus:outline-none ${activeTab === 'abertos' ? 'bg-blue-900 text-blue-400' : 'text-white/60 hover:text-white'}`}
            >
              Abertos / Em andamento
            </button>
            <button
              onClick={() => setActiveTab('encerrados')}
              className={`px-6 py-3 font-semibold rounded-t-2xl transition-colors focus:outline-none ${activeTab === 'encerrados' ? 'bg-blue-900 text-blue-400' : 'text-white/60 hover:text-white'}`}
            >
              Encerrados
            </button>
          </div>

          {/* Table */}
          <div className="p-6">
            {isLoadingChamados ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            ) : (
              <div className="saas-section-card">
                <div className="saas-table-shell overflow-hidden">
                  <div className="saas-table-scroll">
                    <table className="saas-table w-full min-w-max text-sm">
                  <thead>
                    <tr>
                      <th className="saas-table-head saas-table-sticky-col">Nome</th>
                      <th className="saas-table-head">Código</th>
                      <th className="saas-table-head">Descrição</th>
                      <th className="saas-table-head">Status</th>
                      <th className="saas-table-head">Data</th>
                      <th className="saas-table-head">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const chamadosFiltrados = chamados
                      if (chamadosFiltrados.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="text-center text-white/60 py-8">Nenhum chamado encontrado.</td>
                          </tr>
                        );
                      }
                      const rows = [];
                      for (const c of chamadosFiltrados) {
                        rows.push(
                          <tr
                            key={c.id || c.data_criacao + c.codigo}
                            className={`saas-table-row cursor-pointer ${expandedId === (c.id || c.data_criacao + c.codigo) ? 'bg-blue-900/30' : ''}`}
                            onClick={() => setExpandedId(expandedId === (c.id || c.data_criacao + c.codigo) ? null : (c.id || c.data_criacao + c.codigo))}
                          >
                            <td className="saas-table-cell saas-table-sticky-col saas-table-cell-primary whitespace-nowrap">{c.nome}</td>
                            <td className="saas-table-cell whitespace-nowrap text-[var(--text-muted)]">{c.codigo}</td>
                            <td className="saas-table-cell max-w-xs truncate text-[var(--text-muted)]" title={c.descricao}>{c.descricao}</td>
                            <td className="saas-table-cell whitespace-nowrap capitalize text-[var(--text-muted)]">{c.status}</td>
                            <td className="saas-table-cell whitespace-nowrap text-[var(--text-muted)]">{c.data_criacao ? new Date(c.data_criacao).toLocaleString('pt-BR') : '-'}</td>
                            <td className="saas-table-cell">
                              {updatingId === (c.id || c.data_criacao + c.codigo) ? (
                                <Loader2 className="w-5 h-5 animate-spin text-blue-400 mx-auto" />
                              ) : (
                                <select
                                  className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-400"
                                  value={c.status}
                                  onChange={e => handleStatusChange(c.id, e.target.value)}
                                  style={{ color: '#fff', backgroundColor: '#1e293b' }}
                                >
                                  <option value="aberto" style={{ color: '#fff', backgroundColor: '#1e293b' }}>Aberto</option>
                                  <option value="em andamento" style={{ color: '#fff', backgroundColor: '#1e293b' }}>Em andamento</option>
                                  <option value="encerrado" style={{ color: '#fff', backgroundColor: '#1e293b' }}>Encerrado</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                        if (expandedId === (c.id || c.data_criacao + c.codigo)) {
                          rows.push(
                            <tr key={c.id + '-expanded'}>
                              <td colSpan={6} className="saas-table-cell bg-blue-900/30 p-4">
                                <div>
                                  <span className="font-semibold">Descrição completa:</span>
                                  <div className="mt-2 whitespace-pre-line text-white/90 text-sm">{c.descricao}</div>
                                  <div className="mt-4 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedChamadoId(c.id);
                                      }}
                                      className="rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-500/20"
                                    >
                                      Ver conversa / responder
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      }
                      return rows;
                    })()}
                  </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {totalChamados > 0 && (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-white/70">
                  Exibindo {chamados.length} de {totalChamados} chamados
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage <= 1 || isLoadingChamados}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-white/80">Página {currentPage} de {totalPages}</span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages || isLoadingChamados}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
            {/* Botão excluir encerrados */}
            {activeTab === 'encerrados' && totalChamados > 0 && (
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleDeleteEncerrados}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Excluir chamados encerrados
                </button>
              </div>
            )}
          </div>
        </motion.div>
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-white/70 hover:text-white transition-colors"
          >
            ← Voltar ao Dashboard
          </button>
        </div>
        <ChamadoConversaModal
          open={!!selectedChamadoId}
          chamadoId={selectedChamadoId}
          onClose={() => setSelectedChamadoId(null)}
        />
      </div>
    </div>
  );
}
