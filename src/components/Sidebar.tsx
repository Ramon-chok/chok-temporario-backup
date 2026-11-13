'use client'

import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { usePathname, useRouter } from 'next/navigation'
import { useSidebar } from '@/contexts/SidebarContext'
import { LogOut, Home, Settings, StickyNote, UserX, AlertCircle, Trophy, Package, FileDown, Book, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'
import HelpButton from './HelpButton'
import ChamadoModal from './ChamadoModal'

export function Sidebar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { isOpen, setIsOpen } = useSidebar()
  const [isExporting, setIsExporting] = useState(false)

  const handleLogout = () => {
    signOut()
    router.push('/login')
  }

  const handleExportPDF = async () => {
    try {
      setIsExporting(true)

      // Fecha o menu no mobile antes da captura para nao incluir a sidebar no PDF.
      setIsOpen(false)
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve())
        })
      })

      // Dynamic import to avoid SSR issues
      const { exportDashboardToPDF } = await import('../lib/export-pdf')
      await exportDashboardToPDF()
      toast.success('PDF exportado com sucesso!')
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      toast.error('Erro ao exportar PDF: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsExporting(false)
    }
  }

  const menuItems = [
    { label: 'Início', icon: Home, href: '/dashboard' },
    { label: 'Não positivados', icon: UserX, href: '/dashboard/nao-positivados' },
    { label: 'Top 20 Clientes', icon: Trophy, href: '/top-clientes' },
    { label: 'Sortimentos', icon: Package, href: '/sortimentos' },
    // Novo botão Catálogo
    { label: 'Catálogo', icon: Book, external: true, href: 'https://catalogo.chokdistribuidora.com.br/' },
    { label: 'Minhas Notas', icon: StickyNote, href: '/dashboard/notas' },
    { label: 'Exportar PDF', icon: FileDown, action: 'export' },
    ...(user?.perfil === 'admin'
      ? [
          { label: 'Chamados', icon: AlertCircle, href: '/chamados' },
          { label: 'Logs de Uso', icon: BarChart3, href: '/admin/logs' },
          { label: 'Administrador', icon: Settings, href: '/admin' },
        ]
      : []),
  ]

  const [chamadoOpen, setChamadoOpen] = useState(false);

  // Listener global para abrir modal de chamado
  useEffect(() => {
    const handler = () => setChamadoOpen(true);
    window.addEventListener('open-chamado-modal', handler);
    return () => window.removeEventListener('open-chamado-modal', handler);
  }, []);

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="saas-sidebar-overlay fixed inset-0 z-[1200] md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Modal Chamado */}
      <ChamadoModal open={chamadoOpen} onClose={() => setChamadoOpen(false)} />

      {/* Sidebar */}
      <aside
        className={`saas-sidebar fixed left-0 top-0 z-[1300] h-screen w-[84vw] min-w-[240px] max-w-[300px] overflow-hidden transform transition-transform md:w-[clamp(252px,18vw,296px)] md:min-w-[252px] md:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="saas-sidebar-inner hide-scrollbar flex h-full flex-col overflow-y-auto">
          {/* Logo */}
          <div className="saas-sidebar-brand">
            <div className="relative h-8 w-32 flex-shrink-0">
              <Image
                src="/images/logo-escuro.png"
                alt="ChokFlow"
                width={128}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </div>
          </div>

          <div className="saas-sidebar-divider" />

          {/* Menu Items */}
          <nav className="saas-sidebar-nav flex-1">
            {menuItems.map((item) => (
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="saas-sidebar-item"
                >
                  <span className="saas-sidebar-icon-wrap">
                    <item.icon size={18} strokeWidth={2.1} />
                  </span>
                  <span className="saas-sidebar-item-label">{item.label}</span>
                </a>
              ) : (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.action === 'export') {
                      handleExportPDF()
                    } else if (item.href) {
                      router.push(item.href)
                      setIsOpen(false)
                    }
                  }}
                  disabled={item.action === 'export' && isExporting}
                  className={`saas-sidebar-item disabled:cursor-not-allowed disabled:opacity-50 ${
                    item.href && pathname === item.href ? 'saas-sidebar-item-active' : ''
                  }`}
                >
                  <span className="saas-sidebar-icon-wrap">
                    <item.icon size={18} strokeWidth={2.1} />
                  </span>
                  <span className="saas-sidebar-item-label">
                    {item.action === 'export' && isExporting ? 'Exportando...' : item.label}
                  </span>
                </button>
              )
            ))}
          </nav>

          {/* Botão de Ajuda */}
          <HelpButton />

          {/* Sair */}
          <button
            onClick={handleLogout}
            className="saas-sidebar-logout"
          >
            <span className="saas-sidebar-icon-wrap">
              <LogOut size={18} strokeWidth={2.1} />
            </span>
            <span className="saas-sidebar-item-label">Sair</span>
          </button>
        </div>
      </aside>

      {/* Spacer for desktop */}
      <div className="hidden md:block md:w-[clamp(252px,18vw,296px)] md:min-w-[252px]" />
    </>
  )
}
