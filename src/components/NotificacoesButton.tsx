import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { BellIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { BellRing, Clock3, Dot, MessageCircleMore, RefreshCcw } from 'lucide-react';
import ChamadoConversaModal from './ChamadoConversaModal';
import { notificationHasRichContent, sanitizeNotificationHtml } from '../lib/notificationContent';

interface Notificacao {
  id: string;
  mensagem: string;
  status: string;
  created_at: string;
  chamado_id: string | null;
}

const NOTIFICACOES_PAGE_SIZE = 20;

function mergeNotificacoes(prev: Notificacao[], next: Notificacao[]) {
  const ids = new Set(prev.map((item) => item.id));
  const novos = next.filter((item) => !ids.has(item.id));
  return [...prev, ...novos];
}

function formatarHorario(dataIso: string) {
  const data = new Date(dataIso);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', ' •');
}

function getNotificacaoMeta(mensagem: string) {
  if (notificationHasRichContent(mensagem)) {
    return {
      titulo: 'Notificação',
      detalhe: sanitizeNotificationHtml(mensagem),
      icone: BellRing,
      richContent: true,
    };
  }

  if (mensagem.startsWith('Novo chamado aberto:')) {
    return {
      titulo: 'Novo chamado',
      detalhe: mensagem.replace('Novo chamado aberto:', '').trim(),
      icone: BellRing,
      richContent: false,
    };
  }

  if (mensagem.startsWith('Nova mensagem no chamado:')) {
    return {
      titulo: 'Nova mensagem',
      detalhe: mensagem.replace('Nova mensagem no chamado:', '').trim(),
      icone: MessageCircleMore,
      richContent: false,
    };
  }

  if (mensagem.startsWith('Resposta recebida no chamado de')) {
    return {
      titulo: 'Resposta recebida',
      detalhe: mensagem.replace('Resposta recebida no chamado de', '').trim(),
      icone: MessageCircleMore,
      richContent: false,
    };
  }

  if (mensagem.startsWith('Status do chamado alterado para:')) {
    return {
      titulo: 'Atualização de status',
      detalhe: mensagem.replace('Status do chamado alterado para:', '').trim(),
      icone: RefreshCcw,
      richContent: false,
    };
  }

  return {
    titulo: 'Notificação',
    detalhe: mensagem,
    icone: BellRing,
    richContent: false,
  };
}

export default function NotificacoesButton() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedChamadoId, setSelectedChamadoId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);

  const fetchNotificacoes = useCallback(async ({
    pageToLoad = 1,
    reset = true,
    includeCount = true,
  }: {
    pageToLoad?: number;
    reset?: boolean;
    includeCount?: boolean;
  } = {}) => {
    if (!user?.usuario) return;

    const from = (pageToLoad - 1) * NOTIFICACOES_PAGE_SIZE;
    const to = from + NOTIFICACOES_PAGE_SIZE - 1;

    setIsLoadingList(true);
    try {
      const listPromise = supabase
        .from('notificacoes')
        .select('id, mensagem, status, created_at, chamado_id')
        .eq('user_id', user.usuario)
        .order('created_at', { ascending: false })
        .range(from, to);

      const unreadPromise = includeCount
        ? supabase
            .from('notificacoes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.usuario)
            .eq('status', 'nao_lida')
        : Promise.resolve({ count: null, error: null } as { count: number | null; error: null });

      const [{ data, error }, { count, error: countError }] = await Promise.all([
        listPromise,
        unreadPromise,
      ]);

      if (error || countError) {
        return;
      }

      const lista = data || [];
      if (includeCount) {
        setUnreadCount(count || 0);
      }

      if (reset) {
        setNotificacoes(lista);
        setPage(pageToLoad);
      } else {
        setNotificacoes((prev) => mergeNotificacoes(prev, lista));
        setPage(pageToLoad);
      }

      setHasMore(lista.length === NOTIFICACOES_PAGE_SIZE);
    } finally {
      setIsLoadingList(false);
    }
  }, [user?.usuario]);

  useEffect(() => {
    if (!user?.usuario) return;
    void fetchNotificacoes({ pageToLoad: 1, reset: true, includeCount: true });
  }, [user?.usuario, fetchNotificacoes]);

  useEffect(() => {
    if (!user?.usuario) return;

    const channel = supabase
      .channel(`notificacoes-${user.usuario}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `user_id=eq.${user.usuario}`,
        },
        () => {
          void fetchNotificacoes({ pageToLoad: 1, reset: true, includeCount: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.usuario, fetchNotificacoes]);

  async function marcarComoLida(id: string) {
    await fetch(`/api/notificacoes/${id}/lida`, {
      method: 'PATCH',
    });

    setNotificacoes((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: 'lida' }
          : item
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function abrirConversa(notificacao: Notificacao) {
    if (!notificacao.chamado_id) return;
    if (notificacao.status === 'nao_lida') {
      await marcarComoLida(notificacao.id);
    }
    setSelectedChamadoId(notificacao.chamado_id);
    setOpen(false);
  }

  async function carregarMaisNotificacoes() {
    if (!hasMore || isLoadingList || !user?.usuario) return;
    const nextPage = page + 1;
    await fetchNotificacoes({ pageToLoad: nextPage, reset: false, includeCount: false });
  }

  return (
    <div className="relative">
      <button
        className={`relative p-2 rounded-full ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
        onClick={() => setOpen(!open)}
        aria-label="Notificações"
      >
        <BellIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-[#3b82f6] px-1.5 py-0.5 text-center text-[10px] font-semibold text-white shadow-lg shadow-[#3b82f6]/30">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className={`absolute right-0 mt-2.5 w-[19rem] sm:w-[20.5rem] max-w-[calc(100vw-0.75rem)] overflow-hidden rounded-[1.25rem] border shadow-2xl backdrop-blur-xl z-50 ${theme === 'dark' ? 'border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(17,24,39,0.98))] shadow-black/40' : 'border-blue-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-slate-200/80'}`}>
          <div className={`flex items-center justify-between border-b px-3.5 py-2.5 ${theme === 'dark' ? 'border-slate-700/80' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${theme === 'dark' ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                <BellRing className="h-4 w-4" />
              </div>
              <div>
                <p className={`text-[13px] font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Notificações</p>
                <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{unreadCount > 0 ? `${unreadCount} pendente${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}</p>
              </div>
            </div>
            <div className={`flex items-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              <Dot className="h-4 w-4" />
              <Dot className="-ml-1.5 h-4 w-4" />
            </div>
          </div>

          <div className="max-h-[21rem] overflow-y-auto p-2">
          {notificacoes.length === 0 ? (
            <div className={`flex flex-col items-center justify-center rounded-xl border px-4 py-6 text-center ${theme === 'dark' ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}>
              <BellRing className={`mb-2 h-6 w-6 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-300'}`} />
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Nenhuma notificação</p>
              <p className="mt-1 text-[11px]">Quando houver novidades, elas aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notificacoes.map((n) => {
                const meta = getNotificacaoMeta(n.mensagem);
                const Icone = meta.icone;

                return (
                  <div
                    key={n.id}
                    className={`overflow-hidden rounded-[1rem] border transition-colors ${theme === 'dark' ? 'border-slate-700/80 bg-[linear-gradient(180deg,rgba(23,33,60,0.96),rgba(17,24,39,0.98))]' : 'border-blue-100 bg-[linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))]'} ${n.status === 'nao_lida' ? (theme === 'dark' ? 'shadow-[0_0_0_1px_rgba(59,130,246,0.2)]' : 'shadow-[0_0_0_1px_rgba(59,130,246,0.18)]') : ''}`}
                  >
                    <div className={`flex items-center justify-between border-b px-3.5 py-2.5 ${theme === 'dark' ? 'border-slate-700/70' : 'border-slate-200'}`}>
                      <div className="flex items-center gap-2.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${n.status === 'nao_lida' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.55)]' : theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`} />
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme === 'dark' ? 'bg-blue-500/12 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                          <Icone className="h-4 w-4" />
                        </div>
                        <p className={`text-[15px] font-semibold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>{meta.titulo}</p>
                      </div>
                      <div className={`flex items-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Dot className="h-4 w-4" />
                        <Dot className="-ml-1.5 h-4 w-4" />
                      </div>
                    </div>

                    <div className="px-3.5 py-3.5">
                      {meta.richContent ? (
                        <div
                          className={`text-[15px] leading-relaxed ${theme === 'dark' ? 'text-white' : 'text-slate-900'} [&_img]:mt-3 [&_img]:max-h-56 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:border ${theme === 'dark' ? '[&_img]:border-slate-700/80' : '[&_img]:border-slate-200'} [&_p]:mb-2 [&_p:last-child]:mb-0 [&_div]:mb-2 [&_div:last-child]:mb-0`}
                          dangerouslySetInnerHTML={{ __html: meta.detalhe }}
                        />
                      ) : (
                        <p className={`text-[17px] font-semibold leading-snug ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{meta.detalhe}</p>
                      )}

                      <div className={`mt-2.5 flex items-center gap-1.5 text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Clock3 className="h-3 w-3" />
                        <span>{formatarHorario(n.created_at)}</span>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between gap-2">
                        {n.status === 'nao_lida' ? (
                          <button
                            className={`text-[11px] sm:text-xs font-medium transition-colors ${theme === 'dark' ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`}
                            onClick={() => marcarComoLida(n.id)}
                          >
                            Marcar como lida
                          </button>
                        ) : (
                          <span className={`text-[11px] sm:text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Lida</span>
                        )}

                        {n.chamado_id && (
                          <button
                            className={`min-w-24 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${theme === 'dark' ? 'border-blue-500/70 bg-blue-500/10 text-slate-100 hover:bg-blue-500/18' : 'border-blue-500/70 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                            onClick={() => abrirConversa(n)}
                          >
                            Abrir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(hasMore || isLoadingList) && (
                <div className="pt-1 pb-0.5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      void carregarMaisNotificacoes();
                    }}
                    disabled={!hasMore || isLoadingList}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] sm:text-xs font-semibold transition-colors ${theme === 'dark' ? 'border-slate-600 text-slate-200 hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLoadingList ? 'Carregando...' : 'Carregar mais'}
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      )}
      <ChamadoConversaModal
        open={!!selectedChamadoId}
        chamadoId={selectedChamadoId}
        onClose={() => setSelectedChamadoId(null)}
      />
    </div>
  );
}
