'use client'

import { useState } from 'react'
import { Nota } from '@/hooks/useNotas'

interface CardNotaProps {
  nota: Nota
  onView: (nota: Nota) => void
  onEdit: (nota: Nota) => void
  onDelete: (nota: Nota) => void
}

/**
 * Card para exibir uma nota individual
 * Com opções de editar e deletar
 */
export default function CardNota({ nota, onView, onEdit, onDelete }: CardNotaProps) {
  const [expanded, setExpanded] = useState(false)

  // Formatar data
  const formatarData = (dataISO: string) => {
    const data = new Date(dataISO)
    const hoje = new Date()
    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)

    // Resetar horas para comparação
    const dataComparacao = new Date(data.getFullYear(), data.getMonth(), data.getDate())
    const hojeComparacao = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const ontemComparacao = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate())

    if (dataComparacao.getTime() === hojeComparacao.getTime()) {
      return `Hoje às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    } else if (dataComparacao.getTime() === ontemComparacao.getTime()) {
      return `Ontem às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  const dataFormatada = formatarData(nota.atualizado_em)
  const foiEditada = nota.criado_em !== nota.atualizado_em

  return (
    <div
      className="group bg-[var(--panel)] rounded-xl border border-[var(--border)] hover:border-purple-500/50 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
      onClick={() => onView(nota)}
    >
      {/* Header do Card */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {nota.titulo}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{dataFormatada}</span>
              {foiEditada && (
                <>
                  <span>•</span>
                  <span className="text-blue-400">Editada</span>
                </>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(nota)
              }}
              className="p-2 text-[var(--text-muted)] hover:text-blue-400 hover:bg-[var(--panel-muted)] rounded-lg transition-colors"
              aria-label="Editar nota"
              title="Editar"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(nota)
              }}
              className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--panel-muted)] rounded-lg transition-colors"
              aria-label="Deletar nota"
              title="Deletar"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo do Card */}
      <div className="p-4">
        <p
          className={`text-foreground whitespace-pre-wrap break-words ${
            expanded ? '' : 'line-clamp-3'
          }`}
        >
          {nota.conteudo}
        </p>

        {/* Botão Expandir/Recolher (se conteúdo for longo) */}
        {nota.conteudo.length > 150 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="mt-2 text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            {expanded ? (
              <>
                Ver menos
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                Ver mais
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
