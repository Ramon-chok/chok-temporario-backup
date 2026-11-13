'use client'

import { useEffect } from 'react'
import { useCalculadora } from '@/hooks/useCalculadora'

interface ModalCalculadoraProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal com calculadora funcional
 * Operações básicas: +, -, *, /
 * Design inspirado em calculadora iOS
 */
export default function ModalCalculadora({ isOpen, onClose }: ModalCalculadoraProps) {
  const {
    displayValue,
    operador,
    adicionarDigito,
    limpar,
    calcularPorcentagem,
    definirOperador,
    calcular,
    deletarUltimoDigito,
  } = useCalculadora()

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Suporte a teclado
  useEffect(() => {
    if (!isOpen) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        adicionarDigito(e.key)
      } else if (e.key === '.') {
        adicionarDigito('.')
      } else if (e.key === '+') {
        definirOperador('+')
      } else if (e.key === '-') {
        definirOperador('-')
      } else if (e.key === '*') {
        definirOperador('*')
      } else if (e.key === '/') {
        e.preventDefault()
        definirOperador('/')
      } else if (e.key === 'Enter' || e.key === '=') {
        calcular()
      } else if (e.key === 'Backspace') {
        deletarUltimoDigito()
      } else if (e.key === 'c' || e.key === 'C') {
        limpar()
      } else if (e.key === '%') {
        calcularPorcentagem()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, adicionarDigito, definirOperador, calcular, limpar, calcularPorcentagem, deletarUltimoDigito])

  if (!isOpen) return null

  // Estilo de botão
  const buttonClass = (type: 'numero' | 'operacao' | 'especial' | 'igual') => {
    const base = 'h-16 rounded-xl font-semibold text-xl transition-all active:scale-95 shadow-lg'
    const types = {
      numero: 'bg-[var(--panel-muted)] hover:brightness-95 text-foreground',
      operacao: 'bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white',
      especial: 'bg-[var(--panel)] hover:brightness-95 text-foreground',
      igual: 'bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white',
    }
    return `${base} ${types[type]}`
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-[var(--panel)] rounded-2xl shadow-2xl border border-[var(--border)] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Calculadora
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-foreground transition-colors"
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

        {/* Display */}
        <div className="p-6 bg-[var(--panel-muted)]/70">
          <div className="text-right">
            {operador && (
              <div className="text-sm text-[var(--text-muted)] mb-1">
                {operador}
              </div>
            )}
            <div className="text-4xl font-bold text-foreground break-all">
              {displayValue}
            </div>
          </div>
        </div>

        {/* Teclado */}
        <div className="p-4 grid grid-cols-4 gap-3">
          {/* Linha 1: ⌫, AC, %, ÷ */}
<button onClick={deletarUltimoDigito} className={buttonClass('especial')} aria-label="Apagar último dígito">
  ⌫
</button>
<button onClick={limpar} className={buttonClass('especial')}>
  AC
</button>
<button onClick={calcularPorcentagem} className={buttonClass('especial')}>
  %
</button>
<button onClick={() => definirOperador('/')} className={buttonClass('operacao')}>
  ÷
</button>

          {/* Linha 2: 7, 8, 9, × */}
          <button onClick={() => adicionarDigito('7')} className={buttonClass('numero')}>
            7
          </button>
          <button onClick={() => adicionarDigito('8')} className={buttonClass('numero')}>
            8
          </button>
          <button onClick={() => adicionarDigito('9')} className={buttonClass('numero')}>
            9
          </button>
          <button onClick={() => definirOperador('*')} className={buttonClass('operacao')}>
            ×
          </button>

          {/* Linha 3: 4, 5, 6, - */}
          <button onClick={() => adicionarDigito('4')} className={buttonClass('numero')}>
            4
          </button>
          <button onClick={() => adicionarDigito('5')} className={buttonClass('numero')}>
            5
          </button>
          <button onClick={() => adicionarDigito('6')} className={buttonClass('numero')}>
            6
          </button>
          <button onClick={() => definirOperador('-')} className={buttonClass('operacao')}>
            -
          </button>

          {/* Linha 4: 1, 2, 3, + */}
          <button onClick={() => adicionarDigito('1')} className={buttonClass('numero')}>
            1
          </button>
          <button onClick={() => adicionarDigito('2')} className={buttonClass('numero')}>
            2
          </button>
          <button onClick={() => adicionarDigito('3')} className={buttonClass('numero')}>
            3
          </button>
          <button onClick={() => definirOperador('+')} className={buttonClass('operacao')}>
            +
          </button>

          {/* Linha 5: 0 (span 2), ., = */}
          <button onClick={() => adicionarDigito('0')} className={`${buttonClass('numero')} col-span-2`}>
            0
          </button>
          <button onClick={() => adicionarDigito('.')} className={buttonClass('numero')}>
            .
          </button>
          <button onClick={calcular} className={buttonClass('igual')}>
            =
          </button>
        </div>

        {/* Dica de Atalhos */}
        <div className="px-4 pb-4 text-center text-xs text-[var(--text-muted)]">
          Use o teclado para cálculos rápidos • ESC para fechar
        </div>
      </div>
    </div>
  )
}
