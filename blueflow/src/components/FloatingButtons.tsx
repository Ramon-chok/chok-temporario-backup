
'use client'

import { useState } from 'react'


interface FloatingButtonsProps {
  onNovaNota: () => void
  onCalculadora: () => void
}

/**
 * Floating Action Buttons (FABs)
 * Dois botões fixos na parte inferior direita:
 * - Nota: Abre modal para criar nova nota
 * - Calculadora: Abre modal da calculadora
 */
export default function FloatingButtons({ onNovaNota, onCalculadora }: FloatingButtonsProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
      {/* Botão Principal (Expandir/Recolher) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="group relative h-14 w-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600/50 to-blue-600/50 blur-md group-hover:blur-lg transition-all" />
        <div className="relative flex items-center justify-center">
          {expanded ? (
            <svg className="h-6 w-6 text-white transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-white transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </div>
      </button>

      {/* Menu Expandido */}
      {expanded && (
        <div className="flex flex-col-reverse gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* FAB Calculadora */}
          <button
            onClick={() => {
              onCalculadora();
              setExpanded(false);
            }}
            className="group relative h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
            aria-label="Abrir calculadora"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/50 to-cyan-600/50 blur-md group-hover:blur-lg transition-all" />
            <div className="relative flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="absolute right-full mr-3 whitespace-nowrap rounded-lg bg-[var(--panel)] border border-[var(--border)] px-3 py-1.5 text-sm text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">Calculadora</span>
          </button>

          {/* FAB Nova Nota */}
          <button
            onClick={() => {
              onNovaNota();
              setExpanded(false);
            }}
            className="group relative h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
            aria-label="Nova nota"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/50 to-pink-600/50 blur-md group-hover:blur-lg transition-all" />
            <div className="relative flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="absolute right-full mr-3 whitespace-nowrap rounded-lg bg-[var(--panel)] border border-[var(--border)] px-3 py-1.5 text-sm text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">Nova Nota</span>
          </button>
        </div>
      )}
    </div>
  );
}
