'use client'

import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Sidebar } from '@/components/Sidebar'
import { RefreshCw, Download, Upload, Database, AlertCircle, Users, Trash2, CheckCircle2, BellRing, Send, FileDown } from 'lucide-react'
import { normalizeNotificationMessageInput, sanitizeNotificationHtml } from '@/lib/notificationContent'
import { useLastUpdateStore } from '@/store/lastUpdateStore'
import { usePageTracking } from '@/hooks/usePageTracking'
import { clearBulkPdfJob, saveBulkPdfJob } from '@/lib/bulk-pdf-export'

interface Usuario {
  id?: string
  usuario: string
  perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin'
  senha_hash: string
  created_at?: string
}

interface ImportStats {
  pedidos: number
  itens: number
}

interface VendedorApiItem {
  codigo: number | string
  nome: string
}

interface VendedorExportacao {
  codigo: string
  nome: string
}

type PerfilCadastro = 'vendedor' | 'supervisor' | 'gerencia'

interface NovoUsuarioForm {
  usuario: string
  perfil: PerfilCadastro
  senha: string
}

const MAX_UPLOAD_SIZE_MB_RAW = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB ?? 50)
const MAX_UPLOAD_SIZE_MB = Number.isFinite(MAX_UPLOAD_SIZE_MB_RAW) && MAX_UPLOAD_SIZE_MB_RAW > 0
  ? MAX_UPLOAD_SIZE_MB_RAW
  : 50
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
const USERS_ROW_HEIGHT = 56
const USERS_TABLE_VIEWPORT_HEIGHT = 480
const USERS_TABLE_OVERSCAN = 6

export default function AdminPage() {
  usePageTracking('Administrador')

  const notificationEditorRef = useRef<HTMLDivElement | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const [isImporting, setIsImporting] = useState(false)
  const [isUploadingDadosApp, setIsUploadingDadosApp] = useState(false)
  const [isUploadingNaoPositivados, setIsUploadingNaoPositivados] = useState(false)
  const [isUploadingTopClientes, setIsUploadingTopClientes] = useState(false)
  const [isUploadingSortimentos, setIsUploadingSortimentos] = useState(false)
  const [selectedFileDadosApp, setSelectedFileDadosApp] = useState<File | null>(null)
  const [selectedFileNaoPositivados, setSelectedFileNaoPositivados] = useState<File | null>(null)
  const [selectedFileTopClientes, setSelectedFileTopClientes] = useState<File | null>(null)
  const [selectedFileSortimentos, setSelectedFileSortimentos] = useState<File | null>(null)
  const [stats, setStats] = useState<ImportStats | null>(null)
  const [activeTab, setActiveTab] = useState<'import' | 'usuarios' | 'notificacoes'>('import')
  
  // Detectar se está em produção
  const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [usersTableScrollTop, setUsersTableScrollTop] = useState(0)
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [tipoEnvioNotificacao, setTipoEnvioNotificacao] = useState<'todos' | 'selecionados'>('todos')
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([])
  const [mensagemNotificacao, setMensagemNotificacao] = useState('')
  const [isSendingNotificacao, setIsSendingNotificacao] = useState(false)
  const [isStartingBulkPdf, setIsStartingBulkPdf] = useState(false)
  const [isLoadingVendedoresExportacao, setIsLoadingVendedoresExportacao] = useState(false)
  const [vendedoresExportacao, setVendedoresExportacao] = useState<VendedorExportacao[]>([])
  const [filtroVendedorExportacao, setFiltroVendedorExportacao] = useState('')
  const [vendedoresSelecionadosExportacao, setVendedoresSelecionadosExportacao] = useState<string[]>([])
  const [novoUsuario, setNovoUsuario] = useState<NovoUsuarioForm>({
    usuario: '',
    perfil: 'vendedor',
    senha: '',
  })

  useEffect(() => {
    if (user?.perfil === 'admin') {
      if (activeTab === 'usuarios' || activeTab === 'notificacoes') carregarUsuarios();
      if (activeTab === 'usuarios') carregarVendedoresExportacao();
    }
  }, [activeTab, user?.perfil]);

  // Verificar se é admin
  if (!user || user.perfil !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center"
        >
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Negado</h1>
          <p className="text-white/70 mb-6">
            Você não tem permissão para acessar esta página.
            <br />
            Somente administradores podem acessar.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </motion.div>
      </div>
    )
  }

  const carregarUsuarios = async () => {
    try {
      setIsLoadingUsers(true)
      const response = await fetch('/api/admin/users', {
        cache: 'no-store',
      })

      const payload = (await response.json()) as { usuarios?: Usuario[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao carregar usuários')
      }

      setUsuarios(payload.usuarios || [])
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar usuários')
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleAddUsuario = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!novoUsuario.usuario || !novoUsuario.senha) {
      toast.error('Preencha todos os campos')
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoUsuario),
      })

      const payload = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Erro ao criar usuário')
      }

      toast.success(`Usuário ${novoUsuario.usuario} criado com sucesso!`)
      setNovoUsuario({ usuario: '', perfil: 'vendedor', senha: '' })
      setShowForm(false)
      carregarUsuarios()
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      toast.error('Erro ao criar usuário')
    }
  }

  const handleDeleteUsuario = async (usuario: string) => {
    if (usuario === 'admin') {
      toast.error('Não é possível deletar o usuário admin')
      return
    }

    if (!confirm(`Tem certeza que deseja deletar o usuário ${usuario}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(usuario)}`, {
        method: 'DELETE',
      })

      const payload = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Erro ao deletar usuário')
      }

      toast.success(`Usuário ${usuario} deletado com sucesso!`)
      carregarUsuarios()
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
      toast.error('Erro ao deletar usuário')
    }
  }

  const handleImportLocal = async () => {
    setIsImporting(true)
    const loadingToast = toast.loading('Importando dados do arquivo local...')

    try {
      const response = await fetch('/api/import-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao importar dados')
      }

      setStats(data.stats)
      useLastUpdateStore.getState().setLastUpdate(Date.now())
      toast.success('Dados importados com sucesso!', { id: loadingToast })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao importar dados'
      toast.error(message, { id: loadingToast })
    } finally {
      setIsImporting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'dados_app' | 'nao_positivados' | 'top_20_clientes' | 'sortimentos') => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar extensão
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xlsm')) {
        toast.error('Formato inválido. Envie arquivo .xlsx ou .xlsm')
        return
      }

      // Validar tamanho máximo
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        toast.error(`Arquivo muito grande. O limite é ${MAX_UPLOAD_SIZE_MB}MB`)
        e.target.value = ''
        return
      }

      if (tipo === 'dados_app') {
        setSelectedFileDadosApp(file)
      } else if (tipo === 'nao_positivados') {
        setSelectedFileNaoPositivados(file)
      } else if (tipo === 'top_20_clientes') {
        setSelectedFileTopClientes(file)
      } else {
        setSelectedFileSortimentos(file)
      }
      toast.success(`Arquivo selecionado: ${file.name}`)
    }
  }

  const handleUpload = async (tipo: 'dados_app' | 'nao_positivados' | 'top_20_clientes' | 'sortimentos') => {
    const selectedFile =
      tipo === 'dados_app'
        ? selectedFileDadosApp
        : tipo === 'nao_positivados'
        ? selectedFileNaoPositivados
        : tipo === 'top_20_clientes'
        ? selectedFileTopClientes
        : selectedFileSortimentos
    
    if (!selectedFile) {
      toast.error('Selecione um arquivo primeiro')
      return
    }

    if (selectedFile.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error(`Arquivo muito grande. O limite é ${MAX_UPLOAD_SIZE_MB}MB`)
      return
    }

    const datasetNome =
      tipo === 'dados_app'
        ? 'dados_app'
        : tipo === 'nao_positivados'
        ? 'nao_positivados'
        : tipo === 'top_20_clientes'
        ? 'top_20_clientes'
        : 'sortimentos'
    const loadingToast = toast.loading(`Enviando ${datasetNome}...`)
    
    if (tipo === 'dados_app') {
      setIsUploadingDadosApp(true)
    } else if (tipo === 'nao_positivados') {
      setIsUploadingNaoPositivados(true)
    } else if (tipo === 'top_20_clientes') {
      setIsUploadingTopClientes(true)
    } else {
      setIsUploadingSortimentos(true)
    }

    try {
      // 1) Solicitar URL assinada para upload
      const signedUrlResponse = await fetch('/api/upload-excel/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo,
          fileName: selectedFile.name,
        }),
      })

      const signedUrlData = await signedUrlResponse.json()

      if (!signedUrlResponse.ok || !signedUrlData?.signedUrl) {
        throw new Error(signedUrlData?.error || 'Erro ao preparar upload')
      }

      // 2) Upload direto do navegador para o Supabase Storage
      const uploadResponse = await fetch(signedUrlData.signedUrl as string, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'x-upsert': 'true',
        },
        body: selectedFile,
      })

      if (!uploadResponse.ok) {
        const uploadErrorText = await uploadResponse.text()
        throw new Error(uploadErrorText || `Erro HTTP ${uploadResponse.status} ao enviar arquivo para o Storage`)
      }

      toast.success(`Arquivo ${datasetNome} enviado com sucesso!`, { id: loadingToast })
      
      // Grava timestamp no Supabase apenas para dados_app
      if (tipo === 'dados_app') {
        await fetch('/api/update-timestamp', { method: 'POST' })
      }
      
      // Atualizar timestamp com o valor do servidor (hora exata do upload)
      useLastUpdateStore.getState().setLastUpdate(Date.now())
      
      if (tipo === 'dados_app') {
        setSelectedFileDadosApp(null)
        const fileInput = document.getElementById('file-upload-dados-app') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else if (tipo === 'nao_positivados') {
        setSelectedFileNaoPositivados(null)
        const fileInput = document.getElementById('file-upload-nao-positivados') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else if (tipo === 'top_20_clientes') {
        setSelectedFileTopClientes(null)
        const fileInput = document.getElementById('file-upload-top-clientes') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setSelectedFileSortimentos(null)
        const fileInput = document.getElementById('file-upload-sortimentos') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao enviar arquivo'
      toast.error(message, { id: loadingToast })
    } finally {
      if (tipo === 'dados_app') {
        setIsUploadingDadosApp(false)
      } else if (tipo === 'nao_positivados') {
        setIsUploadingNaoPositivados(false)
      } else if (tipo === 'top_20_clientes') {
        setIsUploadingTopClientes(false)
      } else {
        setIsUploadingSortimentos(false)
      }
    }
  }

  const handleIniciarExportacaoPdfEmMassa = async () => {
    try {
      setIsStartingBulkPdf(true)
      const loadingToast = toast.loading('Preparando exportacao em massa...')

      const sellers = vendedoresSelecionadosExportacao.length > 0
        ? vendedoresExportacao.filter((item) => vendedoresSelecionadosExportacao.includes(item.codigo))
        : vendedoresExportacao

      if (sellers.length === 0) {
        throw new Error('Nenhum vendedor encontrado para exportacao')
      }

      clearBulkPdfJob()
      saveBulkPdfJob({
        status: 'running',
        currentIndex: 0,
        currentPage: 'dashboard',
        sellers,
        startedAt: Date.now(),
      })

      toast.success(
        vendedoresSelecionadosExportacao.length > 0
          ? `Exportacao iniciada para ${sellers.length} vendedor(es) selecionado(s).`
          : `Exportacao iniciada para ${sellers.length} vendedor(es).`,
        { id: loadingToast }
      )
      router.push('/dashboard')
    } catch (error) {
      console.error('Erro ao iniciar exportacao em massa:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar exportacao em massa')
      setIsStartingBulkPdf(false)
    }
  }

  const carregarVendedoresExportacao = async () => {
    try {
      setIsLoadingVendedoresExportacao(true)

      const response = await fetch('/api/vendedores/lista', {
        cache: 'no-store',
      })

      const payload = (await response.json()) as { vendedores?: VendedorApiItem[]; error?: string }
      if (!response.ok || !payload.vendedores) {
        throw new Error(payload.error || 'Nao foi possivel carregar vendedores')
      }

      const lista = payload.vendedores
        .map((item) => ({ codigo: String(item.codigo), nome: item.nome || String(item.codigo) }))
        .sort((a, b) => Number(a.codigo) - Number(b.codigo))

      setVendedoresExportacao(lista)
      setVendedoresSelecionadosExportacao((prev) => prev.filter((codigo) => lista.some((item) => item.codigo === codigo)))
    } catch (error) {
      console.error('Erro ao carregar vendedores para exportacao:', error)
      toast.error('Erro ao carregar vendedores para exportacao')
    } finally {
      setIsLoadingVendedoresExportacao(false)
    }
  }

  const alternarVendedorExportacao = (codigo: string) => {
    setVendedoresSelecionadosExportacao((prev) =>
      prev.includes(codigo) ? prev.filter((item) => item !== codigo) : [...prev, codigo]
    )
  }

  const vendedoresExportacaoFiltrados = vendedoresExportacao.filter((item) => {
    const termo = filtroVendedorExportacao.trim().toLowerCase()
    if (!termo) return true
    return item.codigo.toLowerCase().includes(termo) || item.nome.toLowerCase().includes(termo)
  })

  const selecionarTodosVendedoresFiltrados = () => {
    const codigos = vendedoresExportacaoFiltrados.map((item) => item.codigo)
    setVendedoresSelecionadosExportacao((prev) => Array.from(new Set([...prev, ...codigos])))
  }

  const limparSelecaoVendedoresExportacao = () => {
    setVendedoresSelecionadosExportacao([])
  }

  const usuariosOrdenados = usuarios
    .slice()
    .sort((a, b) => a.usuario.localeCompare(b.usuario, 'pt-BR'))

  const totalUsuarios = usuarios.length
  const visibleUsersCount = Math.ceil(USERS_TABLE_VIEWPORT_HEIGHT / USERS_ROW_HEIGHT)
  const usersStartIndex = Math.max(0, Math.floor(usersTableScrollTop / USERS_ROW_HEIGHT) - USERS_TABLE_OVERSCAN)
  const usersEndIndex = Math.min(totalUsuarios, usersStartIndex + visibleUsersCount + USERS_TABLE_OVERSCAN * 2)
  const usuariosVisiveis = usuarios.slice(usersStartIndex, usersEndIndex)
  const usersTopSpacerHeight = usersStartIndex * USERS_ROW_HEIGHT
  const usersBottomSpacerHeight = Math.max(0, (totalUsuarios - usersEndIndex) * USERS_ROW_HEIGHT)

  const usuariosFiltradosNotificacao = usuariosOrdenados.filter((u) =>
    u.usuario.toLowerCase().includes(filtroUsuario.trim().toLowerCase())
  )

  const alternarUsuarioSelecionado = (usuarioId: string) => {
    setUsuariosSelecionados((prev) =>
      prev.includes(usuarioId) ? prev.filter((u) => u !== usuarioId) : [...prev, usuarioId]
    )
  }

  const selecionarTodosFiltrados = () => {
    const idsFiltrados = usuariosFiltradosNotificacao.map((u) => u.usuario)
    setUsuariosSelecionados((prev) => Array.from(new Set([...prev, ...idsFiltrados])))
  }

  const limparSelecaoNotificacao = () => {
    setUsuariosSelecionados([])
  }

  const syncNotificationEditorValue = () => {
    if (!notificationEditorRef.current) {
      return ''
    }

    const sanitized = sanitizeNotificationHtml(notificationEditorRef.current.innerHTML)
    if (notificationEditorRef.current.innerHTML !== sanitized) {
      notificationEditorRef.current.innerHTML = sanitized
    }
    setMensagemNotificacao(sanitized)
    return sanitized
  }

  const insertHtmlAtCursor = (html: string) => {
    if (!notificationEditorRef.current) {
      return
    }

    notificationEditorRef.current.focus()
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      notificationEditorRef.current.insertAdjacentHTML('beforeend', html)
      syncNotificationEditorValue()
      return
    }

    const range = selection.getRangeAt(0)
    range.deleteContents()
    const fragment = range.createContextualFragment(html)
    const lastNode = fragment.lastChild
    range.insertNode(fragment)

    if (lastNode) {
      const newRange = document.createRange()
      newRange.setStartAfter(lastNode)
      newRange.collapse(true)
      selection.removeAllRanges()
      selection.addRange(newRange)
    }

    syncNotificationEditorValue()
  }

  const handleNotificationPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find((item) => item.type.startsWith('image/'))

    if (!imageItem) {
      requestAnimationFrame(() => {
        syncNotificationEditorValue()
      })
      return
    }

    e.preventDefault()
    const file = imageItem.getAsFile()
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result) {
        toast.error('Não foi possível colar a imagem')
        return
      }

      insertHtmlAtCursor(`<img src="${result}" alt="Imagem colada na notificação" />`)
    }
    reader.onerror = () => {
      toast.error('Não foi possível processar a imagem colada')
    }
    reader.readAsDataURL(file)
  }

  const handleEnviarNotificacaoMassa = async (e: React.FormEvent) => {
    e.preventDefault()

    const mensagem = normalizeNotificationMessageInput(syncNotificationEditorValue())
    if (!mensagem) {
      toast.error('Digite a mensagem da notificação')
      return
    }

    const destinatarios =
      tipoEnvioNotificacao === 'todos'
        ? usuariosOrdenados.map((u) => u.usuario)
        : usuariosSelecionados

    if (destinatarios.length === 0) {
      toast.error('Selecione ao menos um usuário')
      return
    }

    try {
      setIsSendingNotificacao(true)

      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mensagem,
          destinatarios,
        }),
      })

      const payload = (await response.json()) as { success?: boolean; total?: number; error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Erro ao enviar notificação em massa')
      }

      toast.success(`Notificação enviada para ${payload.total ?? destinatarios.length} usuário(s)`)
      setMensagemNotificacao('')
      if (notificationEditorRef.current) {
        notificationEditorRef.current.innerHTML = ''
      }
      if (tipoEnvioNotificacao === 'selecionados') {
        setUsuariosSelecionados([])
      }
    } catch (error) {
      console.error('Erro ao enviar notificação em massa:', error)
      toast.error('Erro ao enviar notificação em massa')
    } finally {
      setIsSendingNotificacao(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Sidebar />
      <div className="flex-1 max-w-4xl mx-auto p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            Painel de Administração
          </h1>
          <p className="text-white/70">
            Gerencie usuários e importe dados
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 font-semibold transition-colors ${
              activeTab === 'import'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4 inline mr-2" />
            Importar Dados
          </button>
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`pb-3 font-semibold transition-colors ${
              activeTab === 'usuarios'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Usuários ({usuarios.length})
          </button>
          <button
            onClick={() => setActiveTab('notificacoes')}
            className={`pb-3 font-semibold transition-colors ${
              activeTab === 'notificacoes'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <BellRing className="w-4 h-4 inline mr-2" />
            Notificações
          </button>
        </div>


        {/* Import Tab */}
        {activeTab === 'import' && (
          <>
            {/* Arquivo Local Card - apenas em desenvolvimento */}
            {!isProduction && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6 border-2 border-yellow-500/50"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-yellow-500/20 rounded-xl">
                    <Database className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-white">
                        Importar de Arquivo Local
                      </h2>
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-semibold rounded">
                        DESENVOLVIMENTO
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-white/70 text-sm space-y-2 mb-6">
                  <p>1. Atualize o arquivo local em: <code className="bg-black/30 px-2 py-1 rounded text-xs">public/dados_app.xlsm</code></p>
                  <p>2. Clique no botão abaixo para importar automaticamente</p>
                  <p className="text-xs text-white/50">Esta opção só funciona em ambiente local (localhost).</p>
                </div>

                <button
                  onClick={handleImportLocal}
                  disabled={isImporting}
                  className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Importar do Arquivo Local
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* Upload de Arquivo Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-6 mb-6">
              {/* Upload dados_app.xlsx */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-[#b480ff]/50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-[#b480ff]/20 rounded-lg">
                    <Upload className="w-6 h-6 text-[#b480ff]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      dados_app
                    </h3>
                    <p className="text-xs text-white/50">Dashboard principal</p>
                  </div>
                </div>

                <div className="text-white/70 text-sm space-y-1 mb-4">
                  <p className="text-xs">Envie <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">dados_app.xlsx</code> ou <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">.xlsm</code> (máx. {MAX_UPLOAD_SIZE_MB}MB)</p>
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="file-upload-dados-app"
                    className="block w-full py-3 bg-white/5 border-2 border-dashed border-white/20 rounded-xl text-center cursor-pointer hover:bg-white/10 hover:border-[#b480ff]/50 transition-all"
                  >
                    <input
                      id="file-upload-dados-app"
                      type="file"
                      accept=".xlsx,.xlsm"
                      onChange={(e) => handleFileSelect(e, 'dados_app')}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      {selectedFileDadosApp ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                          <p className="text-white font-semibold text-sm">{selectedFileDadosApp.name}</p>
                          <p className="text-white/50 text-xs">
                            {(selectedFileDadosApp.size / 1024).toFixed(2)} KB
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-white/30" />
                          <p className="text-white/70 text-sm">Selecionar arquivo</p>
                        </>
                      )}
                    </div>
                  </label>

                  <button
                    onClick={() => handleUpload('dados_app')}
                    disabled={!selectedFileDadosApp || isUploadingDadosApp}
                    className="w-full py-3 bg-gradient-to-r from-[#b480ff] to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-[#b480ff] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {isUploadingDadosApp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Enviar dados_app
                      </>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Upload nao_positivados.xlsx */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-cyan-500/50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Upload className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      nao_positivados
                    </h3>
                    <p className="text-xs text-white/50">Não positivados</p>
                  </div>
                </div>

                <div className="text-white/70 text-sm space-y-1 mb-4">
                  <p className="text-xs">Envie <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">nao_positivados.xlsx</code> ou <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">.xlsm</code> (máx. {MAX_UPLOAD_SIZE_MB}MB)</p>
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="file-upload-nao-positivados"
                    className="block w-full py-3 bg-white/5 border-2 border-dashed border-white/20 rounded-xl text-center cursor-pointer hover:bg-white/10 hover:border-cyan-500/50 transition-all"
                  >
                    <input
                      id="file-upload-nao-positivados"
                      type="file"
                      accept=".xlsx,.xlsm"
                      onChange={(e) => handleFileSelect(e, 'nao_positivados')}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      {selectedFileNaoPositivados ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                          <p className="text-white font-semibold text-sm">{selectedFileNaoPositivados.name}</p>
                          <p className="text-white/50 text-xs">
                            {(selectedFileNaoPositivados.size / 1024).toFixed(2)} KB
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-white/30" />
                          <p className="text-white/70 text-sm">Selecionar arquivo</p>
                        </>
                      )}
                    </div>
                  </label>

                  <button
                    onClick={() => handleUpload('nao_positivados')}
                    disabled={!selectedFileNaoPositivados || isUploadingNaoPositivados}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {isUploadingNaoPositivados ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Enviar nao_positivados
                      </>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Upload top_20_clientes.xlsx */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-amber-500/50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Upload className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      top_20_clientes
                    </h3>
                    <p className="text-xs text-white/50">Top 20 Clientes</p>
                  </div>
                </div>

                <div className="text-white/70 text-sm space-y-1 mb-4">
                  <p className="text-xs">Envie <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">top_20_clientes.xlsx</code> ou <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">.xlsm</code> (máx. {MAX_UPLOAD_SIZE_MB}MB)</p>
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="file-upload-top-clientes"
                    className="block w-full py-3 bg-white/5 border-2 border-dashed border-white/20 rounded-xl text-center cursor-pointer hover:bg-white/10 hover:border-amber-500/50 transition-all"
                  >
                    <input
                      id="file-upload-top-clientes"
                      type="file"
                      accept=".xlsx,.xlsm"
                      onChange={(e) => handleFileSelect(e, 'top_20_clientes')}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      {selectedFileTopClientes ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                          <p className="text-white font-semibold text-sm">{selectedFileTopClientes.name}</p>
                          <p className="text-white/50 text-xs">
                            {(selectedFileTopClientes.size / 1024).toFixed(2)} KB
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-white/30" />
                          <p className="text-white/70 text-sm">Selecionar arquivo</p>
                        </>
                      )}
                    </div>
                  </label>

                  <button
                    onClick={() => handleUpload('top_20_clientes')}
                    disabled={!selectedFileTopClientes || isUploadingTopClientes}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {isUploadingTopClientes ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Enviar top_20_clientes
                      </>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Upload sortimentos.xlsx */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-emerald-500/50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Upload className="w-6 h-6 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      sortimentos
                    </h3>
                    <p className="text-xs text-white/50">Lista de produtos/categorias</p>
                  </div>
                </div>

                <div className="text-white/70 text-sm space-y-1 mb-4">
                  <p className="text-xs">Envie <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">sortimentos.xlsx</code> ou <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">.xlsm</code> (máx. {MAX_UPLOAD_SIZE_MB}MB)</p>
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="file-upload-sortimentos"
                    className="block w-full py-3 bg-white/5 border-2 border-dashed border-white/20 rounded-xl text-center cursor-pointer hover:bg-white/10 hover:border-emerald-500/50 transition-all"
                  >
                    <input
                      id="file-upload-sortimentos"
                      type="file"
                      accept=".xlsx,.xlsm"
                      onChange={(e) => handleFileSelect(e, 'sortimentos')}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      {selectedFileSortimentos ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                          <p className="text-white font-semibold text-sm">{selectedFileSortimentos.name}</p>
                          <p className="text-white/50 text-xs">
                            {(selectedFileSortimentos.size / 1024).toFixed(2)} KB
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-white/30" />
                          <p className="text-white/70 text-sm">Selecionar arquivo</p>
                        </>
                      )}
                    </div>
                  </label>

                  <button
                    onClick={() => handleUpload('sortimentos')}
                    disabled={!selectedFileSortimentos || isUploadingSortimentos}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {isUploadingSortimentos ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Enviar sortimentos
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Stats */}
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-8"
              >
                <h3 className="text-xl font-semibold text-white mb-6">
                  Resultado da Importação
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/20 rounded-xl p-4">
                    <p className="text-green-400 text-sm">Registros de faturamento</p>
                    <p className="text-3xl font-bold text-white">{stats.pedidos}</p>
                  </div>
                  <div className="bg-blue-500/20 rounded-xl p-4">
                    <p className="text-blue-400 text-sm">Detalhes de faturamento</p>
                    <p className="text-3xl font-bold text-white">{stats.itens}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Usuarios Tab */}
        {activeTab === 'usuarios' && (
          <>
            {/* Novo Usuário Form */}
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6"
              >
                <h2 className="mb-6 text-xl font-semibold text-white">Novo Usuário</h2>
                <form onSubmit={handleAddUsuario} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-white/70">
                        Usuário
                      </label>
                      <input
                        type="text"
                        value={novoUsuario.usuario}
                        onChange={(e) =>
                          setNovoUsuario({
                            ...novoUsuario,
                            usuario: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/30 focus:border-blue-400 focus:outline-none"
                        placeholder="ex: vendedor123"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70">
                        Perfil
                      </label>
                      <select
                        value={novoUsuario.perfil}
                        onChange={(e) =>
                          setNovoUsuario({
                            ...novoUsuario,
                            perfil: e.target.value as PerfilCadastro,
                          })
                        }
                        className="mt-1 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:outline-none"
                      >
                        <option value="vendedor">Vendedor</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="gerencia">Gerência</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70">
                        Senha
                      </label>
                      <input
                        type="password"
                        value={novoUsuario.senha}
                        onChange={(e) =>
                          setNovoUsuario({
                            ...novoUsuario,
                            senha: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/30 focus:border-blue-400 focus:outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-500 px-4 py-2 text-white font-medium hover:bg-blue-600 transition-colors"
                    >
                      Criar Usuário
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-lg border border-white/20 px-4 py-2 text-white hover:bg-white/10 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Usuários List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Usuários ({usuarios.length})</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleIniciarExportacaoPdfEmMassa}
                    disabled={isStartingBulkPdf}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-400/60 bg-amber-500/20 px-4 py-2 text-white font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isStartingBulkPdf ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Iniciando...
                      </>
                    ) : (
                      <>
                        <FileDown className="w-4 h-4" />
                        Exportar PDF em Massa
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-white font-medium hover:bg-blue-600 transition-colors"
                  >
                    {showForm ? '✕ Cancelar' : '+ Novo'}
                  </button>
                </div>
              </div>

              <p className="mb-6 text-sm text-white/70">
                O processo em massa exporta a pagina Dashboard e depois Top 20 para cada vendedor, um por vez.
              </p>

              <div className="mb-6 rounded-xl border border-white/15 bg-black/20 p-4">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-sm font-semibold text-white/90">
                    Vendedores para exportacao ({vendedoresSelecionadosExportacao.length} selecionado(s))
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selecionarTodosVendedoresFiltrados}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                    >
                      Selecionar filtrados
                    </button>
                    <button
                      type="button"
                      onClick={limparSelecaoVendedoresExportacao}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <p className="mb-3 text-xs text-white/60">
                  Se nenhum vendedor for selecionado, a exportacao usa todos automaticamente.
                </p>

                <input
                  type="text"
                  value={filtroVendedorExportacao}
                  onChange={(e) => setFiltroVendedorExportacao(e.target.value)}
                  placeholder="Buscar vendedor por codigo ou nome"
                  className="saas-filter-control mb-3 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/35 focus:border-blue-400 focus:outline-none"
                />

                {isLoadingVendedoresExportacao ? (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-400" />
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {vendedoresExportacaoFiltrados.map((item) => (
                      <label
                        key={item.codigo}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{item.codigo} - {item.nome}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={vendedoresSelecionadosExportacao.includes(item.codigo)}
                          onChange={() => alternarVendedorExportacao(item.codigo)}
                          className="h-4 w-4 accent-blue-500"
                        />
                      </label>
                    ))}

                    {vendedoresExportacaoFiltrados.length === 0 && (
                      <p className="py-2 text-sm text-white/60">Nenhum vendedor encontrado com esse filtro.</p>
                    )}
                  </div>
                )}
              </div>

              {isLoadingUsers ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                </div>
              ) : (
                <div className="saas-section-card">
                  <div className="saas-table-shell overflow-hidden">
                    <div
                      className="saas-table-scroll max-h-[480px] overflow-auto"
                      onScroll={(event) => setUsersTableScrollTop(event.currentTarget.scrollTop)}
                    >
                      <table className="saas-table w-full min-w-max text-sm">
                    <thead>
                      <tr>
                        <th className="saas-table-head saas-table-sticky-col">
                          Usuário
                        </th>
                        <th className="saas-table-head">
                          Perfil
                        </th>
                        <th className="saas-table-head">
                          Criado
                        </th>
                        <th className="saas-table-head text-right">
                          Ação
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersTopSpacerHeight > 0 && (
                        <tr>
                          <td className="p-0" colSpan={4} style={{ height: usersTopSpacerHeight }} />
                        </tr>
                      )}

                      {usuariosVisiveis.map((u) => (
                        <tr
                          key={u.usuario}
                          className="saas-table-row"
                        >
                          <td className="saas-table-cell saas-table-sticky-col saas-table-cell-primary whitespace-nowrap">
                            {u.usuario}
                          </td>
                          <td className="saas-table-cell whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                u.perfil === 'admin'
                                  ? 'bg-red-500/20 text-red-400'
                                  : u.perfil === 'gerencia'
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : u.perfil === 'supervisor'
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'bg-green-500/20 text-green-400'
                              }`}
                            >
                              {u.perfil}
                            </span>
                          </td>
                          <td className="saas-table-cell whitespace-nowrap text-[var(--text-muted)]">
                            {u.created_at
                              ? new Date(u.created_at).toLocaleDateString('pt-BR')
                              : '-'}
                          </td>
                          <td className="saas-table-cell text-right">
                            <button
                              onClick={() => handleDeleteUsuario(u.usuario)}
                              disabled={u.usuario === 'admin'}
                              className="text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {usersBottomSpacerHeight > 0 && (
                        <tr>
                          <td className="p-0" colSpan={4} style={{ height: usersBottomSpacerHeight }} />
                        </tr>
                      )}
                    </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* Notificacoes em Massa Tab */}
        {activeTab === 'notificacoes' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8"
          >
            <h2 className="text-xl font-semibold text-white mb-2">Enviar Notificação</h2>
            <p className="text-white/60 text-sm mb-6">
              Envie um comunicado para todos os usuários ou apenas para usuários específicos.
            </p>

            <form onSubmit={handleEnviarNotificacaoMassa} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoEnvioNotificacao('todos')}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    tipoEnvioNotificacao === 'todos'
                      ? 'border-blue-400 bg-blue-500/20 text-white'
                      : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <p className="font-semibold">Todos os usuários</p>
                  <p className="text-xs opacity-80">Enviar para toda a base ({usuariosOrdenados.length})</p>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoEnvioNotificacao('selecionados')}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    tipoEnvioNotificacao === 'selecionados'
                      ? 'border-blue-400 bg-blue-500/20 text-white'
                      : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <p className="font-semibold">Usuários específicos</p>
                  <p className="text-xs opacity-80">Selecionar manualmente quem receberá</p>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Mensagem</label>
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 focus-within:border-blue-400">
                  {!mensagemNotificacao && (
                    <p className="pointer-events-none mb-2 text-sm text-white/35">
                      Digite o recado e cole imagens diretamente aqui.
                    </p>
                  )}
                  <div
                    ref={notificationEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={syncNotificationEditorValue}
                    onPaste={handleNotificationPaste}
                    className="min-h-28 w-full whitespace-pre-wrap break-words text-white focus:outline-none [&_img]:mt-3 [&_img]:max-h-64 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-white/10"
                  />
                </div>
                <p className="mt-2 text-xs text-white/55">
                  Imagens coladas ficam embutidas no corpo da notificação.
                </p>
              </div>

              {tipoEnvioNotificacao === 'selecionados' && (
                <div className="rounded-xl border border-white/15 bg-black/20 p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-white/90">
                      Selecionar usuários ({usuariosSelecionados.length} selecionado(s))
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selecionarTodosFiltrados}
                        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                      >
                        Selecionar filtrados
                      </button>
                      <button
                        type="button"
                        onClick={limparSelecaoNotificacao}
                        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={filtroUsuario}
                    onChange={(e) => setFiltroUsuario(e.target.value)}
                    placeholder="Buscar usuário"
                    className="saas-filter-control mb-3 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/35 focus:border-blue-400 focus:outline-none"
                  />

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {usuariosFiltradosNotificacao.map((u) => (
                      <label
                        key={u.usuario}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{u.usuario}</p>
                          <p className="text-xs text-white/60 capitalize">{u.perfil}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={usuariosSelecionados.includes(u.usuario)}
                          onChange={() => alternarUsuarioSelecionado(u.usuario)}
                          className="h-4 w-4 accent-blue-500"
                        />
                      </label>
                    ))}

                    {usuariosFiltradosNotificacao.length === 0 && (
                      <p className="text-sm text-white/60 py-2">Nenhum usuário encontrado com esse filtro.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSendingNotificacao}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingNotificacao ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar notificação
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}



        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-white/70 hover:text-white transition-colors"
          >
            ← Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
