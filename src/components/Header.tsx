'use client'

import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { useSidebar } from '@/contexts/SidebarContext'
import { UserRound, Menu, X } from 'lucide-react'
import { motion } from 'framer-motion'
import NotificacoesButton from './NotificacoesButton'

interface HeaderProps {
  title?: string
  subtitle?: string
  titleImageSrc?: string
  titleImageAlt?: string
}

export function Header({
  title = 'Dashboard',
  subtitle,
  titleImageSrc,
  titleImageAlt = 'Titulo da pagina',
}: HeaderProps) {
  const { user } = useAuth()
  const { isOpen, toggleOpen } = useSidebar()

  return (
    <header
      className="app-main-header sticky top-0 z-[1100] border-b backdrop-blur-xl"
      style={{
        background: 'var(--topbar-bg-gradient)',
        borderColor: 'var(--topbar-border)',
        boxShadow: 'var(--topbar-shadow)',
      }}
    >
      <div className="relative flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
        {/* Mobile: Hambúrguer + Logo */}
        <div className="flex items-center gap-3 md:hidden">
          {/* Botão Hambúrguer */}
          <button
            onClick={toggleOpen}
            className="flex-shrink-0 rounded-xl border border-white/15 bg-white/10 p-2 text-white shadow-[0_8px_20px_-16px_rgba(2,6,23,0.8)] transition-colors hover:bg-white/15"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo + Foguete no Mobile */}
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={{ y: [0, -4, 0], x: [0, 1, 0], rotate: [-3, 2, -3] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative h-8 w-8 flex-shrink-0"
            >
              <Image
                src="/images/rocket.png"
                alt="Foguete"
                width={32}
                height={32}
                className="h-8 w-8"
                priority
              />
            </motion.div>
            <div className="relative h-6 w-24 flex-shrink-0">
              <Image
                src={'/images/logo-escuro.png'}
                alt="ChokFlow"
                width={96}
                height={24}
                className="h-6 w-auto"
                priority
              />
            </div>
          </div>
        </div>

        {/* Desktop: Título + Subtitle */}
        <div className="hidden flex-1 flex-col md:flex">
          {titleImageSrc ? (
            <div className="relative h-10 w-56">
              <Image
                src={titleImageSrc}
                alt={titleImageAlt}
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          ) : (
            <h1 className="text-[1.55rem] font-semibold tracking-[-0.02em] md:text-[1.95rem]" style={{ color: 'var(--topbar-title)' }}>
              {title}
            </h1>
          )}
          {subtitle && (
            <div className="mt-1.5 flex items-center gap-2.5">
              <p className="text-sm font-medium" style={{ color: 'var(--topbar-subtitle)' }}>{subtitle}</p>
              <motion.div
                animate={{ y: [0, -4, 0], x: [0, 1, 0], rotate: [-3, 2, -3] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative h-4 w-4"
              >
                <Image
                  src="/images/rocket.png"
                  alt="Foguete decolando"
                  width={16}
                  height={16}
                  className="h-4 w-4"
                  priority
                />
              </motion.div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {/* User Info */}
          <div className="hidden items-center gap-2.5 rounded-xl border border-white/10 bg-white/6 px-3.5 py-2 shadow-[0_10px_24px_-20px_rgba(2,6,23,0.9)] sm:flex">
            <motion.div
              animate={{ y: [0, -2, 0], scale: [1, 1.04, 1], rotate: [0, -4, 4, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c63f2c] shadow-[0_10px_20px_-10px_rgba(198,63,44,0.44)]"
            >
              <UserRound size={20} className="text-white" strokeWidth={2.2} />
            </motion.div>
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--topbar-title)' }}>
                {user?.usuario || 'Usuario'}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--topbar-subtitle)' }}>
                {user?.perfil || 'visitante'}
              </p>
            </div>
          </div>

          {/* Theme Toggle removido */}
           {/* Botão de Notificações */}
           <div className="ml-1 md:ml-2">
             {/* Evite SSR issues: só renderize se user existir */}
             {user && (
               <NotificacoesButton />
             )}
           </div>
        </div>
      </div>
    </header>
  )
}
