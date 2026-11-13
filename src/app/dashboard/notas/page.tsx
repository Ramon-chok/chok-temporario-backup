'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useNotas, Nota } from '@/hooks/useNotas'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import CardNota from '@/components/CardNota'
import ModalNota from '@/components/ModalNota'
import ModalConfirmacaoDelete from '@/components/ModalConfirmacaoDelete'
import ModalVisualizarNota from '@/components/ModalVisualizarNota'
import { ArrowLeft } from 'lucide-react'
import { usePageTracking } from '@/hooks/usePageTracking'

/**
 * Página de visualização de todas as notas do usuário
 * Notas do mês atual com limite de 20
 */
export default function NotasPage() {
  usePageTracking('Minhas Notas')

  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  
  const {
    notas,
    total,
    limite,
    isLoading,
    error,
    criarNota,
    editarNota,
    deletarNota,
    isCriando,
    isEditando,
    isDeletando,
  } = useNotas()

  const [modalNovaNotaAberta, setModalNovaNotaAberta] = useState(false)
  const [notaParaVisualizar, setNotaParaVisualizar] = useState<Nota | null>(null)
  const [notaParaEditar, setNotaParaEditar] = useState<Nota | null>(null)
  const [notaParaDeletar, setNotaParaDeletar] = useState<Nota | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message
    return fallback
  }

  // Redirecionar se não autenticado (usando useEffect)
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Mostrar toast temporário
  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message)
    setToastType(type)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Criar nova nota
  const handleCriarNota = async (dados: { titulo: string; conteudo: string }) => {
    try {
      await criarNota(dados)
      setModalNovaNotaAberta(false)
      showToast('Nota criada com sucesso!', 'success')
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Erro ao criar nota'), 'error')
    }
  }

  // Editar nota existente
  const handleEditarNota = async (dados: { titulo: string; conteudo: string }) => {
    if (!notaParaEditar) return

    try {
      await editarNota({ id: notaParaEditar.id, ...dados })
      setNotaParaEditar(null)
      showToast('Nota atualizada com sucesso!', 'success')
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Erro ao editar nota'), 'error')
    }
  }

  // Deletar nota
  const handleDeletarNota = async () => {
    if (!notaParaDeletar) return

    try {
      await deletarNota(notaParaDeletar.id)
      setNotaParaDeletar(null)
      showToast('Nota deletada com sucesso!', 'success')
    } catch (error: unknown) {
      showToast(getErrorMessage(error, 'Erro ao deletar nota'), 'error')
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar (desktop sempre visível) */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header
          titleImageSrc="/images/logo-minhas%20notas.png"
          titleImageAlt="Minhas Notas"
        />
        
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            {/* Header com Botão Voltar (Mobile) */}
            <div className="mb-6">
              {/* Botão Voltar - Visível apenas no mobile */}
              <button
                onClick={() => router.push('/dashboard')}
                className="md:hidden flex items-center gap-2 text-[var(--text-muted)] hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeft size={20} />
                <span>Voltar</span>
              </button>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Minhas Notas
                  </h1>
                  <p className="text-[var(--text-muted)] mt-1 text-sm md:text-base">
                    {total} de {limite} notas este mês
                  </p>
                </div>
                <button
                  onClick={() => setModalNovaNotaAberta(true)}
                  disabled={total >= limite}
                  className="px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm md:text-base"
                >
                  <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="hidden sm:inline">Nova Nota</span>
                  <span className="sm:hidden">Nova</span>
                </button>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full bg-[var(--panel-muted)] rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    total >= limite
                      ? 'bg-red-500'
                      : total >= limite * 0.8
                      ? 'bg-yellow-500'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500'
                  }`}
                  style={{ width: `${(total / limite) * 100}%` }}
                />
              </div>

              {/* Aviso de Limite */}
              {total >= limite && (
                <div className="mt-4 p-3 md:p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
                  <svg className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="text-red-400 font-medium text-sm md:text-base">Limite de notas atingido</p>
                    <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">
                      Você atingiu o limite de {limite} notas. Delete alguma nota para criar novas.
                    </p>
                  </div>
                </div>
              )}

              {/* Info de Reset Mensal */}
              <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>As notas são resetadas automaticamente no início de cada mês</span>
              </p>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <svg
                    className="animate-spin h-12 w-12 text-purple-500 mx-auto mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <p className="text-[var(--text-muted)]">Carregando notas...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 md:p-6 bg-red-500/10 border border-red-500/50 rounded-lg text-center">
                <svg className="h-12 w-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-400 font-medium">Erro ao carregar notas</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">{error}</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && notas.length === 0 && (
              <div className="text-center py-20">
                <svg
                  className="h-20 w-20 text-[var(--text-muted)] mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg md:text-xl font-semibold text-[var(--text-muted)] mb-2">
                  Nenhuma nota ainda
                </h3>
                <p className="text-sm md:text-base text-[var(--text-muted)] mb-6">
                  Comece criando sua primeira nota do mês!
                </p>
                <button
                  onClick={() => setModalNovaNotaAberta(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  Criar Primeira Nota
                </button>
              </div>
            )}

            {/* Grid de Notas */}
            {!isLoading && !error && notas.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {notas.map((nota) => (
                  <CardNota
                    key={nota.id}
                    nota={nota}
                    onView={(nota) => setNotaParaVisualizar(nota)}
                    onEdit={(nota) => setNotaParaEditar(nota)}
                    onDelete={(nota) => setNotaParaDeletar(nota)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modais */}
      <ModalNota
        isOpen={modalNovaNotaAberta}
        onClose={() => setModalNovaNotaAberta(false)}
        onSave={handleCriarNota}
        isSaving={isCriando}
      />

      <ModalVisualizarNota
        isOpen={!!notaParaVisualizar}
        nota={notaParaVisualizar}
        onClose={() => setNotaParaVisualizar(null)}
      />

      <ModalNota
        isOpen={!!notaParaEditar}
        onClose={() => setNotaParaEditar(null)}
        onSave={handleEditarNota}
        notaParaEditar={notaParaEditar}
        isSaving={isEditando}
      />

      <ModalConfirmacaoDelete
        isOpen={!!notaParaDeletar}
        onClose={() => setNotaParaDeletar(null)}
        onConfirm={handleDeletarNota}
        titulo={notaParaDeletar?.titulo || ''}
        isDeleting={isDeletando}
      />

      {/* Toast de Notificação */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] animate-in slide-in-from-bottom-2 duration-200">
          <div
            className={`px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 ${
              toastType === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toastType === 'success' ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}
