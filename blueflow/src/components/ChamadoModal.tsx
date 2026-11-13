import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';

export default function ChamadoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!open) {
      setNome('');
      setDescricao('');
      setSucesso(false);
    }
  }, [open]);

  // O campo correto do usuário é 'usuario' (string)
  const codigo = user?.usuario || '';
  const podeEnviar = nome.trim() && codigo && descricao.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviar) return;
    setEnviando(true);
    try {
      const response = await fetch('/api/chamados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome,
          descricao,
        }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({} as { error?: string }));
        alert('Erro ao enviar chamado: ' + (json.error || 'falha inesperada'));
        return;
      }

      setSucesso(true);
    } finally {
      setEnviando(false);
    }
  }

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative mx-4 md:mx-0">
        <button
          className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-2xl md:text-3xl"
          onClick={onClose}
          aria-label="Fechar"
          style={{ lineHeight: '1', fontSize: '2rem', fontWeight: 'bold' }}
        >
          ❎
        </button>
        <h2 className="text-xl font-bold mb-4 text-blue-600">Abrir chamado</h2>
        {sucesso ? (
          <div className="text-black font-semibold text-center py-8">Chamado enviado com sucesso!</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400 text-gray-700"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                value={codigo}
                disabled
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do chamado <span className="text-red-500">*</span></label>
              <textarea
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400 min-h-[80px] text-gray-700"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded disabled:opacity-60"
              disabled={!podeEnviar || enviando}
            >
              {enviando ? 'Enviando...' : 'Enviar chamado'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
