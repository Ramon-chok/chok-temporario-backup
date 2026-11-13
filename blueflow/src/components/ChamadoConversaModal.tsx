'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, MessageSquare, Send, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface Chamado {
  id: string
  nome: string
  codigo: string
  descricao: string
  status: string
  data_criacao: string
}

interface ChamadoMensagem {
  id: string
  chamado_id: string
  autor_codigo: string
  autor_perfil: 'admin' | 'gerencia' | 'supervisor' | 'vendedor'
  mensagem: string
  created_at: string
}

export default function ChamadoConversaModal({
  open,
  chamadoId,
  onClose,
}: {
  open: boolean
  chamadoId: string | null
  onClose: () => void
}) {
  const { user } = useAuth()
  const [chamado, setChamado] = useState<Chamado | null>(null)
  const [mensagens, setMensagens] = useState<ChamadoMensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const appendMensagem = useCallback((novaMensagem: ChamadoMensagem) => {
    setMensagens((prev) => {
      if (prev.some((item) => item.id === novaMensagem.id)) {
        return prev
      }

      const next = [...prev, novaMensagem]
      next.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      return next
    })
  }, [])

  const podeResponder = useMemo(() => {
    if (!user || !chamado) return false
    if (user.perfil === 'admin') return true
    return chamado.codigo === user.usuario
  }, [chamado, user])

  const fetchConversa = useCallback(async () => {
    if (!chamadoId) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const [{ data: chamadoData, error: chamadoError }, { data: mensagensData, error: mensagensError }] = await Promise.all([
        supabase
          .from('chamados')
          .select('id, nome, codigo, descricao, status, data_criacao')
          .eq('id', chamadoId)
          .single(),
        supabase
          .from('chamado_mensagens')
          .select('id, chamado_id, autor_codigo, autor_perfil, mensagem, created_at')
          .eq('chamado_id', chamadoId)
          .order('created_at', { ascending: true }),
      ])

      if (chamadoError) {
        setErrorMessage('Nao foi possivel carregar o chamado.')
        return
      }

      if (mensagensError) {
        setErrorMessage(
          'Nao foi possivel carregar as mensagens. Verifique se o SQL da tabela chamado_mensagens foi executado no Supabase.'
        )
      }

      setChamado(chamadoData)
      setMensagens(mensagensData || [])
    } finally {
      setLoading(false)
    }
  }, [chamadoId])

  useEffect(() => {
    if (!open || !chamadoId) return
    void fetchConversa()
  }, [open, chamadoId, fetchConversa])

  useEffect(() => {
    if (!open || !chamadoId) return

    const channel = supabase
      .channel(`chamado-conversa-${chamadoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chamado_mensagens',
          filter: `chamado_id=eq.${chamadoId}`,
        },
        (payload) => {
          const novaMensagem = payload.new as ChamadoMensagem
          appendMensagem(novaMensagem)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [open, chamadoId, appendMensagem])

  async function enviarMensagem() {
    if (!user || !chamado || !novaMensagem.trim() || !podeResponder) return

    setSending(true)
    setErrorMessage(null)

    try {
      const mensagemTexto = novaMensagem.trim()
      const response = await fetch(`/api/chamados/${chamado.id}/mensagens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mensagem: mensagemTexto }),
      })

      if (!response.ok) {
        setErrorMessage(
          'Nao foi possivel enviar a mensagem.'
        )
        return
      }

      const payload = (await response.json()) as { mensagem?: ChamadoMensagem }
      const insertedMensagem = payload.mensagem

      if (insertedMensagem) {
        appendMensagem(insertedMensagem)
      }

      setNovaMensagem('')
    } finally {
      setSending(false)
    }
  }

  if (!open || !chamadoId) return null

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-950 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Conversa do chamado</h2>
            {chamado && <p className="text-sm text-white/60">Chamado de {chamado.nome} · Status: {chamado.status}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white" aria-label="Fechar conversa">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8 text-white/70">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  {errorMessage}
                </div>
              )}

              {chamado && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-200">
                    <MessageSquare size={16} />
                    Mensagem inicial
                  </div>
                  <p className="whitespace-pre-line text-sm text-white/90">{chamado.descricao}</p>
                  <p className="mt-2 text-xs text-white/50">{new Date(chamado.data_criacao).toLocaleString('pt-BR')}</p>
                </div>
              )}

              {mensagens.map((mensagem) => {
                const isAdmin = mensagem.autor_perfil === 'admin'
                const isCurrentUser = mensagem.autor_codigo === user?.usuario

                return (
                  <div
                    key={mensagem.id}
                    className={`rounded-xl border px-4 py-3 ${
                      isCurrentUser
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : isAdmin
                        ? 'border-purple-500/30 bg-purple-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white/90">
                        {isAdmin ? 'Administrador' : mensagem.autor_codigo}
                      </span>
                      <span className="text-xs text-white/50">{new Date(mensagem.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="whitespace-pre-line text-sm text-white/85">{mensagem.mensagem}</p>
                  </div>
                )
              })}
            </>
          )}
        </div>

        <div className="border-t border-white/10 px-6 py-4">
          {!podeResponder ? (
            <p className="text-sm text-white/50">Voce nao tem permissao para responder este chamado.</p>
          ) : chamado?.status === 'encerrado' ? (
            <p className="text-sm text-white/50">Este chamado esta encerrado. Reabra o chamado para continuar a conversa.</p>
          ) : (
            <div className="space-y-3">
              <textarea
                value={novaMensagem}
                onChange={(event) => setNovaMensagem(event.target.value)}
                placeholder="Digite sua resposta..."
                className="min-h-[96px] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-blue-400 focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={enviarMensagem}
                  disabled={!novaMensagem.trim() || sending}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
                  {sending ? 'Enviando...' : 'Enviar mensagem'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
