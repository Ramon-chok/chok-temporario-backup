'use client'

import { useState, useEffect } from 'react'
import { Nota } from '@/hooks/useNotas'

interface ModalNotaProps {
  isOpen: boolean
  onClose: () => void
  onSave: (dados: { titulo: string; conteudo: string }) => void
  notaParaEditar?: Nota | null
  isSaving?: boolean
}

const LIMITE_TITULO = 100
const LIMITE_CONTEUDO = 500

/**
 * Modal para criar ou editar nota
 * Se notaParaEditar for fornecida, funciona como edição
 * Senão, funciona como criação
 */
export default function ModalNota({
  isOpen,
  onClose,
  onSave,
  notaParaEditar = null,
  isSaving = false,
}: ModalNotaProps) {
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [erroTitulo, setErroTitulo] = useState('')
  const [erroConteudo, setErroConteudo] = useState('')

  const isEdicao = !!notaParaEditar

  // Preencher campos ao editar
  useEffect(() => {
    if (notaParaEditar) {
      setTitulo(notaParaEditar.titulo)
      setConteudo(notaParaEditar.conteudo)
    } else {
      setTitulo('')
      setConteudo('')
    }
    setErroTitulo('')
    setErroConteudo('')
  }, [notaParaEditar, isOpen])

  // Validar e salvar
  const handleSave = () => {
    let hasError = false

    // Validar título
    if (!titulo.trim()) {
      setErroTitulo('Título é obrigatório')
      hasError = true
    } else if (titulo.length > LIMITE_TITULO) {
      setErroTitulo(`Máximo ${LIMITE_TITULO} caracteres`)
      hasError = true
    } else {
      setErroTitulo('')
    }

    // Validar conteúdo
    if (!conteudo.trim()) {
      setErroConteudo('Conteúdo é obrigatório')
      hasError = true
    } else if (conteudo.length > LIMITE_CONTEUDO) {
      setErroConteudo(`Máximo ${LIMITE_CONTEUDO} caracteres`)
      hasError = true
    } else {
      setErroConteudo('')
    }

    if (hasError) return

    onSave({ titulo: titulo.trim(), conteudo: conteudo.trim() })
  }

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, isSaving, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={!isSaving ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[var(--panel)] rounded-2xl shadow-2xl border border-[var(--border)] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {isEdicao ? 'Editar Nota' : 'Nova Nota'}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {isEdicao ? 'Modifique sua nota abaixo' : 'Crie uma nota rápida'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-[var(--text-muted)] hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Fechar"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Campo Título */}
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-foreground mb-2">
              Título
            </label>
            <input
              id="titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Reunião importante"
              maxLength={LIMITE_TITULO}
              disabled={isSaving}
              className={`w-full px-4 py-3 bg-[var(--panel-muted)] border rounded-lg text-foreground placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                erroTitulo
                  ? 'border-red-500 focus:ring-red-500/50'
                  : 'border-[var(--border)] focus:ring-purple-500/50'
              }`}
            />
            <div className="flex items-center justify-between mt-1">
              {erroTitulo ? (
                <span className="text-xs text-red-400">{erroTitulo}</span>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">Campo obrigatório</span>
              )}
              <span className={`text-xs ${titulo.length > LIMITE_TITULO * 0.9 ? 'text-yellow-500' : 'text-[var(--text-muted)]'}`}>
                {titulo.length}/{LIMITE_TITULO}
              </span>
            </div>
          </div>

          {/* Campo Conteúdo */}
          <div>
            <label htmlFor="conteudo" className="block text-sm font-medium text-foreground mb-2">
              Conteúdo
            </label>
            <textarea
              id="conteudo"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Escreva sua nota aqui..."
              maxLength={LIMITE_CONTEUDO}
              rows={6}
              disabled={isSaving}
              className={`w-full px-4 py-3 bg-[var(--panel-muted)] border rounded-lg text-foreground placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
                erroConteudo
                  ? 'border-red-500 focus:ring-red-500/50'
                  : 'border-[var(--border)] focus:ring-purple-500/50'
              }`}
            />
            <div className="flex items-center justify-between mt-1">
              {erroConteudo ? (
                <span className="text-xs text-red-400">{erroConteudo}</span>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">Campo obrigatório</span>
              )}
              <span className={`text-xs ${conteudo.length > LIMITE_CONTEUDO * 0.9 ? 'text-yellow-500' : 'text-[var(--text-muted)]'}`}>
                {conteudo.length}/{LIMITE_CONTEUDO}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 text-[var(--text-muted)] hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
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
                Salvando...
              </span>
            ) : (
              isEdicao ? 'Salvar Alterações' : 'Criar Nota'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
