'use client'

import { useEffect } from 'react'
import { Nota } from '@/hooks/useNotas'

interface ModalVisualizarNotaProps {
  isOpen: boolean
  nota: Nota | null
  onClose: () => void
}

/**
 * Modal para leitura completa de uma nota
 */
export default function ModalVisualizarNota({
  isOpen,
  nota,
  onClose,
}: ModalVisualizarNotaProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen || !nota) return null

  const data = new Date(nota.atualizado_em)
  const dataFormatada = data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[var(--border)]">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-foreground truncate">{nota.titulo}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">Atualizada em {dataFormatada}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <p className="text-base leading-7 text-foreground whitespace-pre-wrap break-words">
            {nota.conteudo}
          </p>
        </div>

        <div className="flex justify-end p-6 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[var(--panel-muted)] hover:brightness-95 text-foreground font-medium rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
