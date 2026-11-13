import { useState, useCallback } from 'react'

export type OperacaoCalculadora = '+' | '-' | '*' | '/' | null

/**
 * Hook para gerenciar estado e lógica da calculadora
 * Calculadora simples com operações básicas (+, -, *, /)
 */
export function useCalculadora() {
  const [displayValue, setDisplayValue] = useState<string>('0')
  const [operador, setOperador] = useState<OperacaoCalculadora>(null)
  const [valorAnterior, setValorAnterior] = useState<number | null>(null)
  const [aguardandoNovoNumero, setAguardandoNovoNumero] = useState<boolean>(false)

  // Executar operação matemática
  function executarCalculo(
    valor1: number,
    valor2: number,
    op: OperacaoCalculadora
  ): number {
    switch (op) {
      case '+':
        return valor1 + valor2
      case '-':
        return valor1 - valor2
      case '*':
        return valor1 * valor2
      case '/':
        if (valor2 === 0) {
          return 0 // Evitar divisão por zero
        }
        return valor1 / valor2
      default:
        return valor2
    }
  }

  // Adicionar dígito ao display
  const adicionarDigito = useCallback((digito: string) => {
    if (aguardandoNovoNumero) {
      setDisplayValue(digito)
      setAguardandoNovoNumero(false)
      return
    }

    // Permitir apenas um ponto decimal
    if (digito === '.' && displayValue.includes('.')) {
      return
    }

    // Se display é "0", substituir, exceto para ponto decimal
    if (displayValue === '0' && digito !== '.') {
      setDisplayValue(digito)
    } else {
      setDisplayValue(displayValue + digito)
    }
  }, [displayValue, aguardandoNovoNumero])

  // Limpar tudo (AC)
  const limpar = useCallback(() => {
    setDisplayValue('0')
    setOperador(null)
    setValorAnterior(null)
    setAguardandoNovoNumero(false)
  }, [])

  // Limpar entrada atual (CE)
  const limparEntrada = useCallback(() => {
    setDisplayValue('0')
  }, [])

  // Alternar sinal (+/-)
  const alternarSinal = useCallback(() => {
    const valor = parseFloat(displayValue)
    setDisplayValue((valor * -1).toString())
  }, [displayValue])

  // Calcular porcentagem
  const calcularPorcentagem = useCallback(() => {
    const valor = parseFloat(displayValue)
    setDisplayValue((valor / 100).toString())
  }, [displayValue])

  // Definir operador (+, -, *, /)
  const definirOperador = useCallback((novoOperador: OperacaoCalculadora) => {
    const valorAtual = parseFloat(displayValue)

    // Se já existe valor anterior e um operador pendente, calcular antes
    if (valorAnterior !== null && operador && !aguardandoNovoNumero) {
      const resultado = executarCalculo(valorAnterior, valorAtual, operador)
      setDisplayValue(resultado.toString())
      setValorAnterior(resultado)
    } else {
      setValorAnterior(valorAtual)
    }

    setOperador(novoOperador)
    setAguardandoNovoNumero(true)
  }, [displayValue, operador, valorAnterior, aguardandoNovoNumero])

  // Calcular resultado (=)
  const calcular = useCallback(() => {
    if (operador === null || valorAnterior === null) {
      return
    }

    const valorAtual = parseFloat(displayValue)
    const resultado = executarCalculo(valorAnterior, valorAtual, operador)

    setDisplayValue(resultado.toString())
    setOperador(null)
    setValorAnterior(null)
    setAguardandoNovoNumero(true)
  }, [displayValue, operador, valorAnterior])

  // Deletar último dígito (backspace)
  const deletarUltimoDigito = useCallback(() => {
    if (displayValue.length === 1) {
      setDisplayValue('0')
    } else {
      setDisplayValue(displayValue.slice(0, -1))
    }
  }, [displayValue])

  return {
    // Estado
    displayValue,
    operador,
    aguardandoNovoNumero,

    // Ações
    adicionarDigito,
    limpar,
    limparEntrada,
    alternarSinal,
    calcularPorcentagem,
    definirOperador,
    calcular,
    deletarUltimoDigito,
  }
}
