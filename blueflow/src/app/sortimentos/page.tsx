"use client"
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { DataTable } from '@/components/DataTable'
import { useSortimentos } from '@/hooks/useSortimentos'
import { useState, useMemo } from 'react'
import { usePageTracking } from '@/hooks/usePageTracking'

export default function SortimentosPage() {
  usePageTracking('Sortimentos')

  const { data = [], isLoading } = useSortimentos()
  const [codigoBusca, setCodigoBusca] = useState('')
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('')

  // Extrair categorias únicas (fabricantes)
  const categorias = useMemo(() => {
    const set = new Set<string>()
    data.forEach((row) => {
      if (row.fabricante) set.add(row.fabricante)
    })
    return Array.from(set).sort()
  }, [data])

  // Filtrar dados
  const dadosFiltrados = useMemo(() => {
    return data.filter(row => {
      if (codigoBusca && !String(row.codigo).toLowerCase().includes(codigoBusca.toLowerCase())) return false
      if (categoriaSelecionada && row.fabricante !== categoriaSelecionada) return false
      return true
    })
  }, [data, codigoBusca, categoriaSelecionada])

  const columns = [
    { header: 'Código', accessor: 'codigo' },
    { header: 'Descrição', accessor: 'descricao' },
    { header: 'Categoria', accessor: 'fabricante' },
    // Adicione mais colunas se necessário
  ]

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Sortimentos"
          subtitle="Aqui você encontra a lista de sortimentos"
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="saas-filter-card mb-4 flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 md:flex-row md:p-5">
              <input
                type="text"
                placeholder="Buscar código..."
                value={codigoBusca}
                onChange={e => setCodigoBusca(e.target.value)}
                className="saas-filter-control rounded-md border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-[var(--foreground)] focus:border-[#818cf8] focus:outline-none focus:ring-2 focus:ring-[#818cf8]"
                style={{ minWidth: 180 }}
              />
              <select
                value={categoriaSelecionada}
                onChange={e => setCategoriaSelecionada(e.target.value)}
                className="saas-filter-control saas-filter-select rounded-md border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-[var(--foreground)] focus:border-[#818cf8] focus:outline-none focus:ring-2 focus:ring-[#818cf8]"
                style={{ minWidth: 180 }}
              >
                <option value="">Todas as categorias</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <DataTable
              title="Lista de Sortimentos"
              columns={columns}
              data={dadosFiltrados}
              isLoading={isLoading}
              pageSize={20}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
