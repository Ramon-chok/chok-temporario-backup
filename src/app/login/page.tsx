'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useTheme } from '@/contexts/ThemeContext'
import { Eye, EyeOff } from 'lucide-react'
import { usePageTracking } from '@/hooks/usePageTracking'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, isLoading } = useAuth()
  const { setTheme } = useTheme()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  usePageTracking('Login')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!usuario || !senha) {
      toast.error('Por favor, preencha todos os campos')
      return
    }

    const { error } = await signIn(usuario, senha)
    if (error) {
      toast.error(error)
    } else {
      // Dashboard deve iniciar em modo escuro por padrão após login
      setTheme('dark')
      toast.success('Login realizado com sucesso!')
      router.push('/dashboard')
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(180,128,255,0.2),transparent_42%),radial-gradient(circle_at_85%_15%,rgba(96,165,250,0.18),transparent_40%),linear-gradient(145deg,#050815_0%,#0b1228_55%,#120d26_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-12 h-80 w-80 rounded-full bg-[#7b2cbf33] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-[#3b82f633] blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(17,24,39,0.86)_0%,rgba(15,23,42,0.84)_48%,rgba(30,27,57,0.86)_100%)] shadow-[0_35px_90px_-45px_rgba(2,6,23,0.95)] backdrop-blur-xl">
          <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="relative hidden border-r border-white/8 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(180,128,255,0.2),transparent_48%),radial-gradient(circle_at_80%_75%,rgba(59,130,246,0.16),transparent_48%)]" />

              <div className="relative z-10">
                <div className="relative mb-8 h-12 w-40">
                  <Image
                    src="/images/logo-escuro.png"
                    alt="ChokFlow"
                    height={48}
                    width={160}
                    priority
                    className="h-12 w-auto"
                  />
                </div>

                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#b8c6df]">
                  Dashboard de Vendas
                </p>
                <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-[-0.02em] text-[#eef3fb]">
                  Inteligencia comercial para operar com precisão.
                </h1>
                <p className="mt-5 max-w-md text-base leading-relaxed text-[#b7c4db]">
                  Visualize indicadores, performance de equipe e oportunidades em uma experiência fluida e consistente.
                </p>
              </div>

              <div className="relative z-10 rounded-2xl border border-white/10 bg-white/6 p-5 shadow-[0_24px_45px_-35px_rgba(180,128,255,0.55)]">
                <p className="text-sm text-[#dbe6fb]">
                  Ambiente seguro para acesso de vendedores, supervisores e gerência.
                </p>
              </div>
            </section>

            <section className="flex items-center p-6 sm:p-9 lg:p-12">
              <div className="w-full">
                <div className="mb-8 text-center lg:mb-10 lg:text-left">
                  <div className="mb-5 flex justify-center lg:hidden">
                    <div className="relative h-10 w-36">
                      <Image
                        src="/images/logo-escuro.png"
                        alt="ChokFlow"
                        height={40}
                        width={144}
                        priority
                        className="h-10 w-auto"
                      />
                    </div>
                  </div>
                  <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[#eef3fb]">
                    Bem-vindo ao Dashboard
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#aeb9cd]">
                    Entre com suas credenciais para acessar o painel.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="usuario" className="mb-1.5 block text-sm font-medium text-[#c4d0e3]">
                      Usuario
                    </label>
                    <input
                      id="usuario"
                      type="text"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      className="w-full rounded-xl border border-white/12 bg-[rgba(15,23,42,0.76)] px-4 py-3 text-white placeholder:text-[#9aa7c4]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 focus:border-[#9299ff] focus:outline-none focus:ring-4 focus:ring-[#818cf833]"
                      style={{ color: '#fff', WebkitTextFillColor: '#fff' }}
                      placeholder="seu usuario"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label htmlFor="senha" className="mb-1.5 block text-sm font-medium text-[#c4d0e3]">
                      Senha
                    </label>
                    <div className="relative">
                      <input
                        id="senha"
                        type={showPassword ? 'text' : 'password'}
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        className="w-full rounded-xl border border-white/12 bg-[rgba(15,23,42,0.76)] px-4 py-3 pr-12 text-white placeholder:text-[#9aa7c4]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 focus:border-[#9299ff] focus:outline-none focus:ring-4 focus:ring-[#818cf833]"
                        style={{ color: '#fff', WebkitTextFillColor: '#fff' }}
                        placeholder="••••••••"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9aa7c0] transition-colors duration-200 hover:text-[#b9c6ff] disabled:opacity-50"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#2563eb] py-3 font-semibold text-white shadow-[0_20px_34px_-20px_rgba(109,64,219,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:from-[#6d28d9] hover:to-[#1d4ed8] hover:shadow-[0_24px_40px_-22px_rgba(37,99,235,0.9)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>

                <div className="mt-7 border-t border-white/10 pt-4 text-center text-xs text-[#95a5c0] lg:text-left">
                  <p>
                    Desenvolvido por{' '}
                    <a
                      href="https://www.linkedin.com/in/laura-fradique-8b818320b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#e7efff] underline-offset-2 transition-colors hover:text-white hover:underline"
                    >
                      Laura Fradique
                    </a>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
