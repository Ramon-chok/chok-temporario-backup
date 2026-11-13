'use client'

import { useEffect } from 'react'

interface ModalConfirmacaoDeleteProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  titulo: string
  isDeleting?: boolean
}

/**
 * Modal de confirmação para deletar nota
 * Evita exclusões acidentais
 */
export default function ModalConfirmacaoDelete({
  isOpen,
  onClose,
  onConfirm,
  titulo,
  isDeleting = false,
}: ModalConfirmacaoDeleteProps) {
  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, isDeleting, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={!isDeleting ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[var(--panel)] rounded-2xl shadow-2xl border border-[var(--border)] animate-in zoom-in-95 duration-200">
        {/* Ícone de Aviso */}
        <div className="flex justify-center pt-6">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 text-center">
          <h3 className="text-xl font-bold text-foreground mb-2">
            Deletar Nota?
          </h3>
          <p className="text-[var(--text-muted)] mb-4">
            Tem certeza que deseja deletar a nota:
          </p>
          <p className="text-foreground font-medium bg-[var(--panel-muted)] rounded-lg px-4 py-2 border border-[var(--border)] line-clamp-2">
            &quot;{titulo}&quot;
          </p>
          <p className="text-sm text-red-400 mt-4">
            Esta ação não pode ser desfeita.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-6 py-2.5 bg-[var(--panel-muted)] hover:brightness-95 text-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isDeleting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
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
                Deletando...
              </span>
            ) : (
              'Sim, Deletar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
