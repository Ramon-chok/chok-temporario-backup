import type { SupabaseClient } from '@supabase/supabase-js'

export const EXCEL_BUCKET = 'excel-files'

// Único arquivo mantido por tipo de importação (sempre sobrescrito no upload).
export const EXCEL_FILE_BY_TIPO = {
  dados_app: 'dados_app.xlsx',
  nao_positivados: 'nao_positivados.xlsx',
  top_20_clientes: 'top_20_clientes.xlsx',
  sortimentos: 'sortimentos.xlsx',
} as const

export type ExcelTipo = keyof typeof EXCEL_FILE_BY_TIPO

/**
 * Remove do bucket todo arquivo que não seja um dos arquivos vigentes
 * (ex.: .xlsm antigos, versões renomeadas), mantendo só a última importação.
 * Nunca lança erro: falha na limpeza não pode derrubar o upload.
 */
export async function limparArquivosAntigos(supabase: SupabaseClient): Promise<string[]> {
  try {
    const keep = new Set<string>(Object.values(EXCEL_FILE_BY_TIPO))
    const { data: files, error } = await supabase.storage
      .from(EXCEL_BUCKET)
      .list('', { limit: 1000 })

    if (error || !files) return []

    const present = new Set(files.map((f) => f.name))

    // Itens sem "id" são pastas; ignorados para não apagar nada inesperado.
    // Um arquivo legado só é removido se o arquivo vigente equivalente já existir,
    // evitando perder dados caso ele seja a única cópia.
    const stale = files
      .filter((f) => {
        if (!f.id || keep.has(f.name)) return false
        const base = f.name.toLowerCase().startsWith('sortimentos')
          ? 'sortimentos'
          : f.name.replace(/\.[^.]+$/, '')
        return present.has(`${base}.xlsx`)
      })
      .map((f) => f.name)

    if (stale.length === 0) return []

    const { error: removeError } = await supabase.storage.from(EXCEL_BUCKET).remove(stale)
    if (removeError) {
      console.error('[CLEANUP] Erro ao remover arquivos antigos:', removeError.message)
      return []
    }

    console.log(`[CLEANUP] Removidos do Storage: ${stale.join(', ')}`)
    return stale
  } catch (err) {
    console.error('[CLEANUP] Falha inesperada na limpeza:', err)
    return []
  }
}
