'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import * as Sentry from '@sentry/nextjs'
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import FloatingButtons from '@/components/FloatingButtons'
import ModalNota from '@/components/ModalNota'
import ModalCalculadora from '@/components/ModalCalculadora'
import { useCriarNota } from '@/hooks/useNotas'

export function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const [modalNovaNotaAberta, setModalNovaNotaAberta] = useState(false)
  const [modalCalculadoraAberta, setModalCalculadoraAberta] = useState(false)

  useEffect(() => {
    // Initialize Sentry on client side
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        environment: process.env.NODE_ENV,
      })
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SidebarProvider>
          {children}
          <Toaster position="top-right" />
          
          {/* FABs e Modais Globais */}
          {!isLoginPage && (
            <NotasGlobais
              modalNovaNotaAberta={modalNovaNotaAberta}
              setModalNovaNotaAberta={setModalNovaNotaAberta}
              modalCalculadoraAberta={modalCalculadoraAberta}
              setModalCalculadoraAberta={setModalCalculadoraAberta}
            />
          )}

          {/* Botão de Ajuda flutuante removido */}
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Componente separado para ações globais de nota (sem buscar lista inteira)
function NotasGlobais({
  modalNovaNotaAberta,
  setModalNovaNotaAberta,
  modalCalculadoraAberta,
  setModalCalculadoraAberta,
}: {
  modalNovaNotaAberta: boolean
  setModalNovaNotaAberta: (value: boolean) => void
  modalCalculadoraAberta: boolean
  setModalCalculadoraAberta: (value: boolean) => void
}) {
  const { criarNota, isCriando } = useCriarNota()

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message
    return fallback
  }

  const handleCriarNota = async (dados: { titulo: string; conteudo: string }) => {
    try {
      await criarNota(dados)
      setModalNovaNotaAberta(false)
      toast.success('Nota criada com sucesso!', {
        duration: 3000,
        position: 'bottom-center',
      })
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Erro ao criar nota'), {
        duration: 3000,
        position: 'bottom-center',
      })
    }
  }

  return (
    <>
      <FloatingButtons
        onNovaNota={() => setModalNovaNotaAberta(true)}
        onCalculadora={() => setModalCalculadoraAberta(true)}
      />

      <ModalNota
        isOpen={modalNovaNotaAberta}
        onClose={() => setModalNovaNotaAberta(false)}
        onSave={handleCriarNota}
        isSaving={isCriando}
      />

      <ModalCalculadora
        isOpen={modalCalculadoraAberta}
        onClose={() => setModalCalculadoraAberta(false)}
      />
    </>
  )
}
