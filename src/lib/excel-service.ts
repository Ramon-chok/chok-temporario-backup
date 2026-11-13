/**
 * Busca a linha da planilha "Mês" onde o nome do vendedor é "gerencia" (linha de totais gerenciais)
 */
export async function buscarLinhaGerencia(): Promise<VendedorData | null> {
  try {
    const excelPath = await downloadExcelFromStorage()
    if (!fs.existsSync(excelPath)) {
      return null
    }
    const buffer = fs.readFileSync(excelPath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const planilha = workbook.Sheets['Mês']
    if (!planilha) {
      return null
    }
    const rows: MesRow[] = XLSX.utils.sheet_to_json(planilha)

    const gerenciaRow = rows.find((row) => {
      const nome = String(row['Nome Vendedor'] ?? '').trim().toLowerCase()
      const vendedor = String(row['Vendedor'] ?? '').trim().toLowerCase()
      return nome === 'gerencia' || vendedor === 'gerencia'
    })

    if (!gerenciaRow) {
      return null
    }

    return mapRowToVendedor(gerenciaRow, null)
  } catch {
    return null
  }
}

/**
 * Busca a linha TOTAL da equipe (linha amarela) pelo código do supervisor/equipe
 */
export async function buscarLinhaTotalEquipe(codigoSupervisor: number): Promise<VendedorData | null> {
  try {
    const excelPath = await downloadExcelFromStorage()
    if (!fs.existsSync(excelPath)) {
      return null
    }
    const buffer = fs.readFileSync(excelPath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const planilha = workbook.Sheets['Mês']
    if (!planilha) {
      return null
    }
    const rows: MesRow[] = XLSX.utils.sheet_to_json(planilha)
    // Procurar linha onde Nome Vendedor = 'TOTAL' e Vendedor = codigoSupervisor
    const totalRow = rows.find(
      (row) => {
        const nome = String(row['Nome Vendedor'] ?? '').trim().toUpperCase()
        const codigo = toNumber(row['Vendedor'])
        return nome === 'TOTAL' && codigo === codigoSupervisor
      }
    )
    if (!totalRow) return null
    // Mapear para VendedorData
    return mapRowToVendedor(totalRow, codigoSupervisor)
  } catch {
    return null
  }
}

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase com privilégios admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type XlsxReadOptions = NonNullable<Parameters<typeof XLSX.read>[1]>

type WorkbookCacheEntry = {
  path: string
  mtimeMs: number
  size: number
  workbook: XLSX.WorkBook
}

const workbookCache = new Map<string, WorkbookCacheEntry>()

function getWorkbookCached(
  excelPath: string,
  namespace: string,
  readOptions: XlsxReadOptions = { type: 'buffer' }
): XLSX.WorkBook {
  const stats = fs.statSync(excelPath)
  const cacheKey = `${namespace}:${excelPath}`
  const cached = workbookCache.get(cacheKey)

  if (
    cached &&
    cached.path === excelPath &&
    cached.mtimeMs === stats.mtimeMs &&
    cached.size === stats.size
  ) {
    return cached.workbook
  }

  const buffer = fs.readFileSync(excelPath)
  const workbook = XLSX.read(buffer, readOptions)
  workbookCache.set(cacheKey, {
    path: excelPath,
    mtimeMs: stats.mtimeMs,
    size: stats.size,
    workbook,
  })

  return workbook
}

/**
 * Baixa o arquivo Excel do Supabase Storage sempre
 * Em produção: SEMPRE baixa do Supabase
 * Em desenvolvimento: usa public/ se existir, senão baixa do Supabase
 */
async function downloadExcelFromStorage(): Promise<string> {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL
  const publicXlsxPath = path.join(process.cwd(), 'public', 'dados_app.xlsx')
  const publicXlsmPath = path.join(process.cwd(), 'public', 'dados_app.xlsm')
  
  // Apenas em desenvolvimento, tentar usar arquivo local (xlsm/xlsx)
  if (!isProduction) {
    const localCandidates = [publicXlsmPath, publicXlsxPath].filter((p) => fs.existsSync(p))

    if (localCandidates.length > 0) {
      // Prioriza o arquivo mais recente para facilitar testes locais
      const selected = localCandidates.sort(
        (a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs
      )[0]
      // [EXCEL-SERVICE] Usando arquivo local (desenvolvimento):', selected)
      return selected
    }
  }
  
  // SEMPRE baixar do Supabase Storage em produção (sem cache)
  // [EXCEL-SERVICE] Baixando do Supabase Storage...
  const { data, error } = await supabaseAdmin.storage
    .from('excel-files')
    .download('dados_app.xlsx')
  
  if (error) {
    // [EXCEL-SERVICE] Erro ao baixar arquivo do Supabase Storage:', error)
    throw new Error('Arquivo Excel não encontrado no Supabase Storage')
  }
  
  // Salvar em /tmp com timestamp único para evitar cache
  const buffer = Buffer.from(await data.arrayBuffer())
  const tmpDir = '/tmp'
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true })
  }
  
  const tmpPath = `/tmp/dados_app_${Date.now()}.xlsx`
  fs.writeFileSync(tmpPath, buffer)
  
  // [EXCEL-SERVICE] Arquivo baixado com sucesso (${buffer.length} bytes) -> ${tmpPath}
  return tmpPath
}

async function resolveExcelPath(dataset: 'dados_app' | 'nao_positivados' | 'top_20_clientes'): Promise<string> {
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL
  const baseName = dataset

  const localCandidates = [
    path.join(process.cwd(), 'public', `${baseName}.xlsm`),
    path.join(process.cwd(), 'public', `${baseName}.xlsx`),
  ]

  // In development, prefer local files to speed up iteration.
  if (!isProduction) {
    const existingLocal = localCandidates.filter((p) => fs.existsSync(p))
    if (existingLocal.length > 0) {
      return existingLocal.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0]
    }
  }

  const storageCandidates = [`${baseName}.xlsx`, `${baseName}.xlsm`]
  for (const fileName of storageCandidates) {
    const { data, error } = await supabaseAdmin.storage.from('excel-files').download(fileName)
    if (!error && data) {
      const buffer = Buffer.from(await data.arrayBuffer())
      const tmpDir = '/tmp'
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }

      const ext = fileName.endsWith('.xlsm') ? 'xlsm' : 'xlsx'
      const tmpPath = `/tmp/${baseName}_${Date.now()}.${ext}`
      fs.writeFileSync(tmpPath, buffer)
      return tmpPath
    }
  }

  // Fallback for current behavior used by existing code paths.
  if (dataset === 'dados_app') {
    return downloadExcelFromStorage()
  }

  throw new Error(`Arquivo Excel ${baseName} nao encontrado localmente nem no storage`)
}

/**
 * Converte valor para número de forma segura
 * Funciona com strings, números ou null/undefined
 */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  return isNaN(num) ? null : num
}

export interface VendedorData {
  gerencia: string | null
  supervisor: number | null
  codigoVendedor: number
  nomeVendedor: string
  metaFaturamento: number | null
  realizadoFaturamento: number
  metaCobertura: number | null
  realizadoCobertura: number
  metaSortimento: number | null
  realizadoSortimento: number | null
  percentualMargem: number | null
  metaFaseamento: number | null
  realizadoFaseamento: number | null
  dataInicialFaseamento: number | null
  dataFinalFaseamento: number | null
  metaFaseamentoII: number | null
  realizadoFaseamentoII: number | null
  dataInicialFaseamentoII: number | null
  dataFinalFaseamentoII: number | null
  metaDesconcentracao: number | null
  realizadoDesconcentracao: number | null
  dataInicialDesconcentracao: number | null
  dataFinalDesconcentracao: number | null
  visitasDiaria: number | null
  positivacaoDiaria: number | null
  foraDeRotaDiaria: number | null
  visitasAcumulada: number | null
  positivacaoAcumulada: number | null
  foraDeRotaAcumulada: number | null
}

export interface DadosAgregados {
  faturamento: {
    meta: number
    realizado: number
    percentual: number
  }
  cobertura: {
    meta: number
    realizado: number
    percentual: number
  }
  sortimento: {
    meta: number | null
    realizado: number
    percentual: number
  }
  margem: {
    percentual: number
  }
}

export interface DadosSAR {
  positivacaoDiaria: {
    visitas: number
    positivacao: number
    percentual: number
  }
  positivacaoAcumulada: {
    visitas: number
    positivacao: number
    percentual: number
  }
  foraDeRotaDiario: {
    visitas: number
    foraDeRota: number
    percentual: number
  }
  foraDeRotaAcumulado: {
    visitas: number
    foraDeRota: number
    percentual: number
  }
}

export interface CategoriaData {
  gerencia: string | null
  equipe: number | null
  codigoVendedor: number
  nomeVendedor: string
  categoria: string
  metaFaturamento: number
  realizadoFaturamento: number
  metaCobertura: number
  realizadoCobertura: number
  percentualMargem: number
}

type MesRow = Record<string, unknown>

function toGerencia(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = String(value).trim()
  return parsed.length > 0 ? parsed : null
}

function getGerenciaFromRow(row: MesRow): string | null {
  return toGerencia(row['Gerência'] ?? row['Gerencia'])
}

function isTotalRow(row: MesRow): boolean {
  const nome = String(row['Nome Vendedor'] ?? '').trim().toUpperCase()
  return nome === 'TOTAL'
}

function isValidVendedorRow(row: MesRow): boolean {
  if (isTotalRow(row)) return false
  const codigo = toNumber(row['Vendedor'])
  const nome = String(row['Nome Vendedor'] ?? '').trim()
  return codigo !== null && !isNaN(codigo) && nome.length > 0
}

function mapRowToVendedor(row: MesRow, supervisor: number | null): VendedorData {
  return {
    gerencia: getGerenciaFromRow(row),
    supervisor,
    codigoVendedor: toNumber(row['Vendedor']) ?? 0,
    nomeVendedor: String(row['Nome Vendedor'] || ''),
    metaFaturamento: toNumber(row['Meta Faturamento']),
    realizadoFaturamento: toNumber(row['Realizado Faturamento']) || 0,
    metaCobertura: toNumber(row['Meta Cobertura']),
    realizadoCobertura: toNumber(row['Realizado Cobertura']) || 0,
    metaSortimento: toNumber(row['Meta Sortimento']),
    realizadoSortimento: toNumber(row['Realizado Sortimento']) || 0,
    percentualMargem: toNumber(row['%Margem']) || 0,
    metaFaseamento: toNumber(row['Meta Faseamento']),
    realizadoFaseamento: toNumber(row['Realizado Faseamento']),
    dataInicialFaseamento: toNumber(row['Data Inicial Faseamento']),
    dataFinalFaseamento: toNumber(row['Data Final Faseamento']),
    metaFaseamentoII: toNumber(row['Meta Faseamento II']),
    realizadoFaseamentoII: toNumber(row['Realizado Faseamento II']),
    dataInicialFaseamentoII: toNumber(row['Data Inicial Faseamento II']),
    dataFinalFaseamentoII: toNumber(
      row['Data Final Faseamento II'] ?? row['Data Final  Faseamento II']
    ),
    metaDesconcentracao: toNumber(row['Meta Desconcentração']),
    realizadoDesconcentracao: toNumber(row['Realizado Desconcentração']),
    dataInicialDesconcentracao: toNumber(row['Data Inicial Desconcentração']),
    dataFinalDesconcentracao: toNumber(
      row['Data Final Desconcentração'] ?? row['Data Final  Desconcentração']
    ),
    visitasDiaria: toNumber(row['Visitas Diária']),
    positivacaoDiaria: toNumber(row['Positivação Diária']),
    foraDeRotaDiaria: toNumber(row['Fora de Rota Diária']),
    visitasAcumulada: toNumber(row['Visitas Acumulada']),
    positivacaoAcumulada: toNumber(row['Positivação Acumulada']),
    foraDeRotaAcumulada: toNumber(row['Fora de Rota Acumulada']),
  }
}

// Suporta dois formatos de planilha:
// 1) Formato antigo: coluna "Supervisor" preenchida por linha de vendedor
// 2) Novo formato: sem coluna "Supervisor", com linha "TOTAL" ao fim de cada equipe
function normalizeVendedoresFromMesRows(rows: MesRow[]): VendedorData[] {
  const hasTotalRows = rows.some((row) => isTotalRow(row))

  // Prioriza agrupamento por linha TOTAL quando existir,
  // mesmo se a coluna Supervisor estiver parcialmente preenchida.
  if (hasTotalRows) {
    const vendedores: VendedorData[] = []
    let equipeAtual: MesRow[] = []

    rows.forEach((row) => {
      if (isTotalRow(row)) {
        const codigoEquipe = toNumber(row['Vendedor'])
        equipeAtual
          .filter(isValidVendedorRow)
          .forEach((vendedorRow) => {
            vendedores.push(mapRowToVendedor(vendedorRow, codigoEquipe))
          })
        equipeAtual = []
        return
      }

      if (isValidVendedorRow(row)) {
        equipeAtual.push(row)
      }
    })

    // Fallback para linhas restantes sem TOTAL final
    equipeAtual
      .filter(isValidVendedorRow)
      .forEach((vendedorRow) => {
        vendedores.push(mapRowToVendedor(vendedorRow, null))
      })

    return vendedores
  }

  const hasSupervisorColumn = rows.some((row) => {
    if (!isValidVendedorRow(row)) return false
    return toNumber(row['Supervisor']) !== null
  })

  if (hasSupervisorColumn) {
    return rows
      .filter(isValidVendedorRow)
      .map((row) => mapRowToVendedor(row, toNumber(row['Supervisor'])))
  }

  return rows
    .filter(isValidVendedorRow)
    .map((row) => mapRowToVendedor(row, toNumber(row['Supervisor'])))
}

function getSupervisoresFromMesRows(rows: MesRow[]): number[] {
  const hasTotalRows = rows.some((row) => isTotalRow(row))
  const hasSupervisorColumn = rows.some((row) => {
    if (!isValidVendedorRow(row)) return false
    return toNumber(row['Supervisor']) !== null
  })

  const supervisoresSet = new Set<number>()

  if (hasTotalRows) {
    rows.forEach((row) => {
      if (!isTotalRow(row)) return
      const codigoEquipe = toNumber(row['Vendedor'])
      if (codigoEquipe !== null && !isNaN(codigoEquipe)) {
        supervisoresSet.add(codigoEquipe)
      }
    })
  } else if (hasSupervisorColumn) {
    rows.forEach((row) => {
      if (!isValidVendedorRow(row)) return
      const supervisor = toNumber(row['Supervisor'])
      if (supervisor !== null && !isNaN(supervisor)) {
        supervisoresSet.add(supervisor)
      }
    })
  }

  return Array.from(supervisoresSet).sort((a, b) => a - b)
}

function getGerenciasFromMesRows(rows: MesRow[]): string[] {
  const gerenciasSet = new Set<string>()

  rows.forEach((row) => {
    if (!isValidVendedorRow(row)) return
    const gerencia = getGerenciaFromRow(row)
    if (gerencia) gerenciasSet.add(gerencia)
  })

  return Array.from(gerenciasSet).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
}

/**
 * Busca dados do vendedor da planilha Excel
 */
export async function buscarDadosVendedor(codigoVendedor: number): Promise<VendedorData | null> {
  try {
    const excelPath = await downloadExcelFromStorage()
    // Verificar se arquivo existe
    if (!fs.existsSync(excelPath)) {
      // Arquivo Excel não encontrado:', excelPath
      return null
    }

    // Ler arquivo Excel
    const buffer = fs.readFileSync(excelPath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Acessar planilha "Mês"
    const planilha = workbook.Sheets['Mês']
    if (!planilha) {
      // Planilha "Mês" não encontrada
      return null
    }

    // Converter para JSON e normalizar estrutura
    const rows: MesRow[] = XLSX.utils.sheet_to_json(planilha)
    const vendedores = normalizeVendedoresFromMesRows(rows)

    // Buscar linha com o código do vendedor
    const vendedorData = vendedores.find((row) => row.codigoVendedor === codigoVendedor)

    if (!vendedorData) {
      return null
    }

    return vendedorData
  } catch {
    // Erro ao buscar dados do vendedor:', error
    return null
  }
}

/**
 * Busca dados de todos os vendedores da planilha Excel
 */
export async function buscarTodosVendedores(): Promise<VendedorData[] | null> {
  try {
    const excelPath = await downloadExcelFromStorage()
    // Verificar se arquivo existe
    if (!fs.existsSync(excelPath)) {
      console.error('Arquivo Excel não encontrado:', excelPath)
      return null
    }

    // Ler arquivo Excel
    const buffer = fs.readFileSync(excelPath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Acessar planilha "Mês"
    const planilha = workbook.Sheets['Mês']
    if (!planilha) {
      console.error('Planilha "Mês" não encontrada')
      return null
    }

    // Converter para JSON
    const rows: MesRow[] = XLSX.utils.sheet_to_json(planilha)

    if (!rows || rows.length === 0) {
      return null
    }

    const vendedores = normalizeVendedoresFromMesRows(rows)

    return vendedores
  } catch (error) {
    console.error('Erro ao buscar todos os vendedores:', error)
    return null
  }
}

/**
 * Busca o realizado de cobertura da última linha (TOTAL) da aba "Mês"
 * Usa para gerência/admin quando é total da empresa
 */
export async function buscarTotalEmpresaCobertura(): Promise<number | null> {
  try {
    const excelPath = await downloadExcelFromStorage()
    // Verificar se arquivo existe
    if (!fs.existsSync(excelPath)) {
      console.error('Arquivo Excel não encontrado:', excelPath)
      return null
    }

    // Ler arquivo Excel
    const buffer = fs.readFileSync(excelPath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    // Acessar planilha "Mês"
    const planilha = workbook.Sheets['Mês']
    if (!planilha) {
      console.error('Planilha "Mês" não encontrada')
      return null
    }

    // Converter para JSON
    const rows: MesRow[] = XLSX.utils.sheet_to_json(planilha)

    if (!rows || rows.length === 0) {
      return null
    }

    // Buscar a última linha de TOTAL geral (última linha com "TOTAL")
    let ultimaTotalRow: MesRow | null = null
    for (let i = rows.length - 1; i >= 0; i--) {
      if (isTotalRow(rows[i])) {
        ultimaTotalRow = rows[i]
        break
      }
    }

    if (!ultimaTotalRow) {
      console.warn('Nenhuma linha TOTAL encontrada na aba Mês')
      return null
    }

    const realizadoCobertura = toNumber(ultimaTotalRow['Realizado Cobertura']) || 0
    return realizadoCobertura
  } catch (error) {
    console.error('Erro ao buscar total empresa cobertura:', error)
    return null
  }
}

/**
 * Busca vendedores de uma equipe específica (por supervisor)
 */
export async function buscarVendedoresPorSupervisor(
  codigoSupervisor: number
): Promise<Array<{ codigo: number; nome: string }> | null> {
  try {
    const excelPath = await downloadExcelFromStorage()
    if (!fs.existsSync(excelPath)) {
      console.error('Arquivo Excel não encontrado:', excelPath)
      return null
    }

    const buffer = fs.readFileSync(excelPath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const planilha = workbook.Sheets['Mês']
    
    if (!planilha) {
      console.error('Planilha "Mês" não encontrada')
      return null
    }

    const rows: MesRow[] = XLSX.utils.sheet_to_json(planilha)
    const vendedoresNormalizados = normalizeVendedoresFromMesRows(rows)

    // Filtrar vendedores do supervisor e mapear para formato simplificado
    const vendedores = vendedoresNormalizados
      .filter((row) => row.supervisor === codigoSupervisor)
      .map((row) => ({
        codigo: row.codigoVendedor,
        nome: row.nomeVendedor,
      }))
      .filter((v) => v.codigo && v.nome) // Remover entradas inválidas

    console.log(`[EXCEL-SERVICE] Encontrados ${vendedores.length} vendedores para supervisor ${codigoSupervisor}`)
    
    return vendedores
  } catch (error) {
    console.error('Erro ao buscar vendedores do supervisor:', error)
    return null
  }
}

export async function buscarVendedoresPorGerencia(
  codigoGerencia: string
): Promise<VendedorData[] | null> {
  try {
    const vendedores = await buscarTodosVendedores()
    if (!vendedores) return null

    const filtrados = vendedores.filter((v) => v.gerencia === codigoGerencia)
    return filtrados
  } catch (error) {
    console.error('Erro ao buscar vendedores por gerência:', error)
    return null
  }
}

/**
 * Busca TODOS os vendedores (código e nome) - para gerencia e admin
 */
export async function buscarTodosVendedoresSimplificado(): Promise<Array<{ codigo: number; nome: string }> | null> {
  try {
    const excelPath = await downloadExcelFromStorage()
    if (!fs.existsSync(excelPath)) {
      console.error('Arquivo Excel não encontrado:', excelPath)
      return null
    }

    const buffer = fs.readFileSync(excelPath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const planilha = workbook.Sheets['Mês']
    
    if (!planilha) {
      console.error('Planilha "Mês" não encontrada')
      return null
    }

    const rows: MesRow[] = XLSX.utils.sheet_to_json(planilha)
    const vendedoresNormalizados = normalizeVendedoresFromMesRows(rows)

    // Mapear TODOS os vendedores para formato simplificado
    const vendedores = vendedoresNormalizados
      .map((row) => ({
        codigo: row.codigoVendedor,
        nome: row.nomeVendedor,
      }))
      .filter((v) => v.codigo && v.nome) // Remover entradas inválidas

    console.log(`[EXCEL-SERVICE] Encontrados ${vendedores.length} vendedores no total`)
    
    return vendedores
  } catch (error) {
    console.error('Erro ao buscar todos os vendedores:', error)
    return null
  }
}

/**
 * Busca lista de supervisores (códigos únicos da coluna Supervisor)
 */
export async function buscarSupervisores(): Promise<number[] | null> {
  try {
    const excelPath = await downloadExcelFromStorage()
    if (!fs.existsSync(excelPath)) {
      console.error('Arquivo Excel não encontrado:', excelPath)
      return null
    }

    const buffer = fs.readFileSync(excelPath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const planilha = workbook.Sheets['Mês']
    
    if (!planilha) {
      console.error('Planilha "Mês" não encontrada')
      return null
    }

    const rows: MesRow[] = XLSX.utils.sheet_to_json(planilha)
    const supervisores = getSupervisoresFromMesRows(rows)

    console.log(`[EXCEL-SERVICE] Encontrados ${supervisores.length} supervisores únicos`)
    
    return supervisores
  } catch (error) {
    console.error('Erro ao buscar supervisores:', error)
    return null
  }
}

export async function buscarGerencias(): Promise<string[] | null> {
  try {
    const excelPath = await downloadExcelFromStorage()
    if (!fs.existsSync(excelPath)) {
      console.error('Arquivo Excel não encontrado:', excelPath)
      return null
    }

    const buffer = fs.readFileSync(excelPath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const planilha = workbook.Sheets['Mês']

    if (!planilha) {
      console.error('Planilha "Mês" não encontrada')
      return null
    }

    const rows: MesRow[] = XLSX.utils.sheet_to_json(planilha)
    const gerencias = getGerenciasFromMesRows(rows)

    console.log(`[EXCEL-SERVICE] Encontradas ${gerencias.length} gerências únicas`)

    return gerencias
  } catch (error) {
    console.error('Erro ao buscar gerências:', error)
    return null
  }
}

// ==================== CATEGORIAS ====================

type CategoriaRow = Record<string, unknown>

function isValidCategoriaRow(row: CategoriaRow): boolean {
  const meta = toNumber(row['Meta']) || 0
  const realizado = toNumber(row['Realizado']) || 0
  const metaCob = toNumber(row['Cobertura']) || 0
  const realizadoCob = toNumber(row['Realizado Cob.']) || 0
  const margem = toNumber(row['%Margem']) || 0

  // Só retorna true se algum valor for > 0
  return meta > 0 || realizado > 0 || metaCob > 0 || realizadoCob > 0 || margem > 0
}

function mapRowToCategoria(row: CategoriaRow): CategoriaData {
  return {
    gerencia: toGerencia(row['Gerências']),
    equipe: toNumber(row['Equipes']),
    codigoVendedor: toNumber(row['Cod']) || 0,
    nomeVendedor: String(row['Vendedor'] || ''),
    categoria: String(row['Fabricantes'] || ''),
    metaFaturamento: toNumber(row['Meta']) || 0,
    realizadoFaturamento: toNumber(row['Realizado']) || 0,
    metaCobertura: toNumber(row['Cobertura']) || 0,
    realizadoCobertura: toNumber(row['Realizado Cob.']) || 0,
    percentualMargem: toNumber(row['%Margem']) || 0,
  }
}

export async function buscarTodasCategorias(): Promise<CategoriaData[] | null> {
  try {
    const excelPath = await downloadExcelFromStorage()
    if (!fs.existsSync(excelPath)) {
      console.error('Arquivo Excel não encontrado:', excelPath)
      return null
    }

    const buffer = fs.readFileSync(excelPath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const planilha = workbook.Sheets['Categorias']

    if (!planilha) {
      console.error('Planilha "Categorias" não encontrada')
      return null
    }

    const rows: CategoriaRow[] = XLSX.utils.sheet_to_json(planilha)
    const categorias = rows
      .filter(isValidCategoriaRow)
      .map(mapRowToCategoria)

    console.log(`[EXCEL-SERVICE] Encontradas ${categorias.length} categorias válidas`)

    return categorias
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return null
  }
}

export async function buscarCategoriasPorVendedor(codigoVendedor: number): Promise<CategoriaData[] | null> {
  try {
    const todasCategorias = await buscarTodasCategorias()
    if (!todasCategorias) return null

    const categorias = todasCategorias.filter(
      (cat) => cat.codigoVendedor === codigoVendedor
    )

    console.log(`[EXCEL-SERVICE] Encontradas ${categorias.length} categorias para vendedor ${codigoVendedor}`)

    return categorias
  } catch (error) {
    console.error('Erro ao buscar categorias por vendedor:', error)
    return null
  }
}

export async function buscarCategoriasPorSupervisor(codigoSupervisor: number): Promise<CategoriaData[] | null> {
  try {
    const todasCategorias = await buscarTodasCategorias()
    if (!todasCategorias) return null

    const categorias = todasCategorias.filter(
      (cat) => cat.equipe === codigoSupervisor
    )

    console.log(`[EXCEL-SERVICE] Encontradas ${categorias.length} categorias para supervisor ${codigoSupervisor}`)

    return categorias
  } catch (error) {
    console.error('Erro ao buscar categorias por supervisor:', error)
    return null
  }
}

export async function buscarCategoriasPorGerencia(gerencia: string | null): Promise<CategoriaData[] | null> {
  try {
    const todasCategorias = await buscarTodasCategorias()
    if (!todasCategorias) return null

    if (!gerencia) {
      // Se não há filtro de gerência, retorna todas
      return todasCategorias
    }

    const categorias = todasCategorias.filter(
      (cat) => cat.gerencia === gerencia
    )

    console.log(`[EXCEL-SERVICE] Encontradas ${categorias.length} categorias para gerência ${gerencia}`)

    return categorias
  } catch (error) {
    console.error('Erro ao buscar categorias por gerência:', error)
    return null
  }
}

export function calcularDadosAgregados(vendedor: VendedorData): DadosAgregados {
  const metaFaturamento = vendedor.metaFaturamento || 1
  const metaCobertura = vendedor.metaCobertura || 1
  const metaSortimento = vendedor.metaSortimento

  return {
    faturamento: {
      meta: metaFaturamento,
      realizado: vendedor.realizadoFaturamento,
      percentual:
        metaFaturamento > 0
          ? Math.round((vendedor.realizadoFaturamento / metaFaturamento) * 1000) / 10
          : 0,
    },
    cobertura: {
      meta: metaCobertura,
      realizado: vendedor.realizadoCobertura,
      percentual:
        metaCobertura > 0
          ? Math.round((vendedor.realizadoCobertura / metaCobertura) * 1000) / 10
          : 0,
    },
    sortimento: {
      meta: metaSortimento,
      realizado: vendedor.realizadoSortimento || 0,
      percentual:
        metaSortimento && metaSortimento > 0
          ? Math.round(
              ((vendedor.realizadoSortimento || 0) / metaSortimento) * 1000
            ) / 10
          : 0,
    },
    margem: {
      percentual: vendedor.percentualMargem || 0,
    },
  }
}

export function calcularDadosSAR(vendedor: VendedorData): DadosSAR {
  const visitasDiaria = vendedor.visitasDiaria || 0
  const positivacaoDiaria = vendedor.positivacaoDiaria || 0
  const foraDeRotaDiaria = vendedor.foraDeRotaDiaria || 0
  const visitasAcumulada = vendedor.visitasAcumulada || 0
  const positivacaoAcumulada = vendedor.positivacaoAcumulada || 0
  const foraDeRotaAcumulada = vendedor.foraDeRotaAcumulada || 0

  return {
    positivacaoDiaria: {
      visitas: visitasDiaria,
      positivacao: positivacaoDiaria,
      percentual:
        visitasDiaria > 0
          ? Math.round((positivacaoDiaria / visitasDiaria) * 1000) / 10
          : 0,
    },
    positivacaoAcumulada: {
      visitas: visitasAcumulada,
      positivacao: positivacaoAcumulada,
      percentual:
        visitasAcumulada > 0
          ? Math.round((positivacaoAcumulada / visitasAcumulada) * 1000) / 10
          : 0,
    },
    foraDeRotaDiario: {
      visitas: visitasDiaria,
      foraDeRota: foraDeRotaDiaria,
      percentual:
        visitasDiaria > 0
          ? Math.round((foraDeRotaDiaria / visitasDiaria) * 1000) / 10
          : 0,
    },
    foraDeRotaAcumulado: {
      visitas: visitasAcumulada,
      foraDeRota: foraDeRotaAcumulada,
      percentual:
        visitasAcumulada > 0
          ? Math.round((foraDeRotaAcumulada / visitasAcumulada) * 1000) / 10
          : 0,
    },
  }
}

export function agregarDadosSAR(vendedores: VendedorData[]): DadosSAR {
  let visitasDiaria = 0
  let positivacaoDiaria = 0
  let foraDeRotaDiaria = 0
  let visitasAcumulada = 0
  let positivacaoAcumulada = 0
  let foraDeRotaAcumulada = 0

  vendedores.forEach((v) => {
    visitasDiaria += v.visitasDiaria || 0
    positivacaoDiaria += v.positivacaoDiaria || 0
    foraDeRotaDiaria += v.foraDeRotaDiaria || 0
    visitasAcumulada += v.visitasAcumulada || 0
    positivacaoAcumulada += v.positivacaoAcumulada || 0
    foraDeRotaAcumulada += v.foraDeRotaAcumulada || 0
  })

  return {
    positivacaoDiaria: {
      visitas: visitasDiaria,
      positivacao: positivacaoDiaria,
      percentual:
        visitasDiaria > 0
          ? Math.round((positivacaoDiaria / visitasDiaria) * 1000) / 10
          : 0,
    },
    positivacaoAcumulada: {
      visitas: visitasAcumulada,
      positivacao: positivacaoAcumulada,
      percentual:
        visitasAcumulada > 0
          ? Math.round((positivacaoAcumulada / visitasAcumulada) * 1000) / 10
          : 0,
    },
    foraDeRotaDiario: {
      visitas: visitasDiaria,
      foraDeRota: foraDeRotaDiaria,
      percentual:
        visitasDiaria > 0
          ? Math.round((foraDeRotaDiaria / visitasDiaria) * 1000) / 10
          : 0,
    },
    foraDeRotaAcumulado: {
      visitas: visitasAcumulada,
      foraDeRota: foraDeRotaAcumulada,
      percentual:
        visitasAcumulada > 0
          ? Math.round((foraDeRotaAcumulada / visitasAcumulada) * 1000) / 10
          : 0,
    },
  }
}

/**
 * Interface para dados de clientes nao positivados
 */
export interface ClienteNaoPositivadoData {
  codigoCliente: number
  nomeCliente: string
  nomeFantasia: string | null
  municipio: string | null
  codigoVendedor: number | null
  codigoEquipe: number | null
  gerencia: string | null
  categoria: string
  valor: number
  nomeVendedor?: string | null
}

export interface Top20ClienteData {
  nivel: 'GLOBAL' | 'GERENCIA' | 'EQUIPE' | 'VENDEDOR'
  gerencias: string | null
  equipes: number | null
  codigoVendedor: number | null
  vendedor: string | null
  pasta: string | null
  tipoRegistro: 'CLIENTE' | 'REDE'
  codigoCliente: number | null
  clienteRedes: string
  tri25: number
  tri26: number
  percCrescTri: number
  mai25: number
  mai26: number
  percCrescMes: number
}

export interface Top20MonthLabels {
  mes25: string
  mes26: string
}

export interface Top20ClientesResult {
  clientes: Top20ClienteData[]
  monthLabels: Top20MonthLabels
}

type Top20Nivel = 'GLOBAL' | 'GERENCIA' | 'EQUIPE' | 'VENDEDOR'

export type NaoPositivadosSource = 'VENDEDOR' | 'EQUIPE' | 'CHOK'

/**
 * Normaliza texto para comparacao sem acentos/case.
 */
function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function findSheetName(workbook: XLSX.WorkBook, expected: string): string | null {
  const expectedNorm = normalizeKey(expected)
  const name = workbook.SheetNames.find((sheetName) => normalizeKey(sheetName) === expectedNorm)
  return name || null
}

function findHeaderName(headers: string[], expected: string): string | null {
  const expectedNorm = normalizeKey(expected)
  const header = headers.find((name) => normalizeKey(name) === expectedNorm)
  return header || null
}

function findHeaderNameAny(headers: string[], expectedList: string[]): string | null {
  for (const expected of expectedList) {
    const found = findHeaderName(headers, expected)
    if (found) return found
  }
  return null
}

function assertWorkbookFileExists(excelPath: string, dataset: 'nao_positivados' | 'top_20_clientes') {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Arquivo da planilha ${dataset} nao encontrado em ${excelPath}`)
  }
}

function assertSheetName(sheetName: string | null, dataset: 'nao_positivados' | 'top_20_clientes', details: string) {
  if (!sheetName) {
    throw new Error(`Aba obrigatoria nao encontrada para ${dataset}: ${details}`)
  }
  return sheetName
}

function assertWorksheetExists<T>(worksheet: T | undefined, dataset: 'nao_positivados' | 'top_20_clientes', sheetName: string) {
  if (!worksheet) {
    throw new Error(`Falha ao abrir a aba ${sheetName} da planilha ${dataset}`)
  }
  return worksheet
}

function assertRequiredHeaders(headers: string[], dataset: 'nao_positivados', requiredHeaders: string[]) {
  const missingHeaders = requiredHeaders.filter((header) => !findHeaderName(headers, header))
  if (missingHeaders.length > 0) {
    throw new Error(`Colunas obrigatorias ausentes em ${dataset}: ${missingHeaders.join(', ')}`)
  }
}

function resolveNaoPositivadosSource(
  perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin' | null,
  vendedor: number | null,
  equipe: number | null,
  gerencia: string | null
): NaoPositivadosSource {
  if (vendedor !== null) return 'VENDEDOR'
  if (equipe !== null) return 'EQUIPE'
  if (gerencia !== null && (perfil === 'gerencia' || perfil === 'admin')) return 'EQUIPE'
  if (perfil === 'supervisor') return 'EQUIPE'
  if (perfil === 'vendedor') return 'VENDEDOR'
  return 'CHOK'
}

function findNaoPositivadosSheetName(
  workbook: XLSX.WorkBook,
  source: NaoPositivadosSource
): string | null {
  const candidates: Record<NaoPositivadosSource, string[]> = {
    VENDEDOR: [
      'Não positivados VND com fórmula',
      'Nao positivados VND com formula',
      'Não positivados VENDEDOR',
      'Nao positivados VENDEDOR',
    ],
    EQUIPE: [
      'Não positivados EQP com fórmula',
      'Nao positivados EQP com formula',
      'Não positivados EQUIPE',
      'Nao positivados EQUIPE',
    ],
    CHOK: [
      'Não positivados CHD com fórmula',
      'Nao positivados CHD com formula',
      'Não positivados CHOK',
      'Nao positivados CHOK',
    ],
  }

  for (const candidate of candidates[source]) {
    const sheetName = findSheetName(workbook, candidate)
    if (sheetName) return sheetName
  }

  return null
}

function assertNaoPositivadosHeadersBySource(headers: string[], source: NaoPositivadosSource) {
  assertRequiredHeaders(headers, 'nao_positivados', ['cd_clien', 'nome', 'municipio'])

  if (source === 'VENDEDOR') {
    const cdVendHeader = findHeaderName(headers, 'cd_vend')
    if (!cdVendHeader) {
      throw new Error('Coluna obrigatoria ausente em nao_positivados para fonte VENDEDOR: cd_vend')
    }
  }

  if (source === 'EQUIPE') {
    const cdEquipeHeader = findHeaderNameAny(headers, ['cd_equipe', 'Cd Equipe'])
    if (!cdEquipeHeader) {
      throw new Error('Coluna obrigatoria ausente em nao_positivados para fonte EQUIPE: cd_equipe')
    }
  }
}

function findTop20SheetName(workbook: XLSX.WorkBook): string | null {
  const candidates = [
    'Top 20 vendedores c formula',
    'Top 20 vendedores c fórmula',
    'Top 20 Clientes',
  ]

  for (const candidate of candidates) {
    const sheetName = findSheetName(workbook, candidate)
    if (sheetName) return sheetName
  }

  return null
}

/**
 * Busca lista de categorias disponiveis na planilha de nao positivados.
 */
export async function buscarCategoriasNaoPositivados(
  perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin' | null,
  vendedor: number | null,
  equipe: number | null
): Promise<string[]> {
  try {
    const excelPath = await resolveExcelPath('nao_positivados')
    assertWorkbookFileExists(excelPath, 'nao_positivados')

    const workbook = getWorkbookCached(excelPath, 'nao-positivados-categorias')

    const source = resolveNaoPositivadosSource(perfil, vendedor, equipe, null)
    const sheetName = assertSheetName(
      findNaoPositivadosSheetName(workbook, source),
      'nao_positivados',
      `fonte ${source}`
    )

    const planilha = assertWorksheetExists(workbook.Sheets[sheetName], 'nao_positivados', sheetName)

    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(planilha, { defval: null })
    if (!rows || rows.length === 0) return []

    const headers = Object.keys(rows[0])
    assertNaoPositivadosHeadersBySource(headers, source)

    const descricaoGerenciaHeader = findHeaderName(headers, 'descricao gerencia') || 'descricao gerencia'
    const nomeFantasiaHeader = findHeaderName(headers, 'Nome Fantasia') || 'Nome Fantasia'
    const cdEquipeHeader = findHeaderNameAny(headers, ['cd_equipe', 'Cd Equipe'])
    const fixedColumns = new Set([
      'cd_clien',
      'nome',
      'municipio',
      'cd_vend',
      ...(cdEquipeHeader ? [cdEquipeHeader] : []),
      nomeFantasiaHeader,
      descricaoGerenciaHeader,
    ])

    const categorias = headers.filter((h) => !fixedColumns.has(h))
    return categorias.filter((c) => c !== 'GERAL').sort()
  } catch (error) {
    console.error('Erro ao buscar categorias nao positivados:', error)
    return []
  }
}

/**
 * Busca clientes nao positivados com filtros.
 */
export async function buscarClientesNaoPositivados(
  vendedor: number | null,
  equipe: number | null,
  gerencia: string | null,
  categoria: string | null,
  perfil: 'vendedor' | 'supervisor' | 'gerencia' | 'admin' | null
): Promise<ClienteNaoPositivadoData[]> {
  try {
    const excelPath = await resolveExcelPath('nao_positivados')
    assertWorkbookFileExists(excelPath, 'nao_positivados')

    const workbook = getWorkbookCached(excelPath, 'nao-positivados-clientes')

    const source = resolveNaoPositivadosSource(perfil, vendedor, equipe, gerencia)
    const sheetName = assertSheetName(
      findNaoPositivadosSheetName(workbook, source),
      'nao_positivados',
      `fonte ${source}`
    )

    const planilha = assertWorksheetExists(workbook.Sheets[sheetName], 'nao_positivados', sheetName)

    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(planilha, { defval: null })
    if (!rows || rows.length === 0) return []

    const headers = Object.keys(rows[0])
    assertNaoPositivadosHeadersBySource(headers, source)
    const cdVendHeader = findHeaderName(headers, 'cd_vend')
    const descricaoGerenciaHeader = findHeaderName(headers, 'descricao gerencia')
    const cdEquipeHeader = findHeaderNameAny(headers, ['cd_equipe', 'Cd Equipe'])
    const nomeFantasiaHeader = findHeaderName(headers, 'Nome Fantasia') || 'Nome Fantasia'

    const colunaValor = categoria || 'GERAL'
    if (!headers.includes(colunaValor)) {
      throw new Error(`Coluna de categoria nao encontrada em nao_positivados: ${colunaValor}`)
    }

    const filtrados = rows.filter((row) => {
      const cdClien = toNumber(row['cd_clien'])
      const cdVend = cdVendHeader ? toNumber(row[cdVendHeader]) : null
      const cdEquipe = cdEquipeHeader ? toNumber(row[cdEquipeHeader]) : null
      const gerenciaRow = descricaoGerenciaHeader ? String(row[descricaoGerenciaHeader] || '').trim() : ''

      if (cdClien === null) return false

      if (vendedor !== null && cdVend !== vendedor) return false
      if (equipe !== null && cdEquipe !== equipe) return false
      if (gerencia !== null && gerenciaRow && normalizeKey(gerenciaRow) !== normalizeKey(gerencia)) return false

      return true
    })

    const clientes: ClienteNaoPositivadoData[] = filtrados.map((row) => ({
      codigoCliente: toNumber(row['cd_clien']) || 0,
      nomeCliente: String(row['nome'] || ''),
      nomeFantasia: row[nomeFantasiaHeader] ? String(row[nomeFantasiaHeader]) : null,
      municipio: row['municipio'] ? String(row['municipio']) : null,
      codigoVendedor: toNumber(row['cd_vend']),
      codigoEquipe: cdEquipeHeader ? toNumber(row[cdEquipeHeader]) : null,
      gerencia: descricaoGerenciaHeader && row[descricaoGerenciaHeader] ? String(row[descricaoGerenciaHeader]) : null,
      categoria: colunaValor,
      valor: toNumber(row[colunaValor]) || 0,
    }))

    return clientes
  } catch (error) {
    console.error('Erro ao buscar clientes nao positivados:', error)
    return []
  }
}

function toNumberFlexible(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const text = String(value).trim()
  if (!text) return null

  const normalized = text
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace('%', '')

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function findHeaderIndex(headerRow: Array<string | number | null>, expected: string): number {
  const expectedNorm = normalizeKey(expected)
  return headerRow.findIndex((cell) => normalizeKey(String(cell || '')) === expectedNorm)
}

function findDuplicateHeaderIndexes(headerRow: Array<string | number | null>, expected: string): number[] {
  const expectedNorm = normalizeKey(expected)
  return headerRow.reduce<number[]>((acc, cell, index) => {
    if (normalizeKey(String(cell || '')) === expectedNorm) {
      acc.push(index)
    }
    return acc
  }, [])
}

function findHeaderIndexAny(headerRow: Array<string | number | null>, expectedList: string[]): number {
  for (const expected of expectedList) {
    const idx = findHeaderIndex(headerRow, expected)
    if (idx !== -1) return idx
  }
  return -1
}

function formatTop20MonthHeader(cellValue: string | number | null, fallback: string): string {
  if (typeof cellValue === 'string') {
    const trimmed = cellValue.trim()
    if (trimmed) return trimmed
  }

  if (typeof cellValue === 'number' && Number.isFinite(cellValue)) {
    const parsedDate = XLSX.SSF.parse_date_code(cellValue)
    if (parsedDate?.m && parsedDate?.y) {
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
      const month = months[parsedDate.m - 1]
      if (month) {
        return `${month}/${String(parsedDate.y).slice(-2)}`
      }
    }
  }

  return fallback
}

function normalizeTop20Nivel(value: unknown): Top20Nivel | null {
  const normalized = normalizeKey(String(value || ''))

  if (normalized === 'global') return 'GLOBAL'
  if (normalized === 'gerencia') return 'GERENCIA'
  if (normalized === 'equipe') return 'EQUIPE'
  if (normalized === 'vendedor') return 'VENDEDOR'

  return null
}

function calcularPercentualCrescimento(totalAtual: number, totalAnterior: number): number {
  if (totalAnterior === 0) return totalAtual > 0 ? 1 : 0
  return totalAtual / totalAnterior - 1
}

export async function buscarTop20Clientes(
  vendedor: number | null,
  equipe: number | null,
  gerencia: string | null,
  nivelContexto: Top20Nivel | null = null
): Promise<Top20ClientesResult> {
  try {
    const excelPath = await resolveExcelPath('top_20_clientes')
    assertWorkbookFileExists(excelPath, 'top_20_clientes')

    const workbook = getWorkbookCached(excelPath, 'top20-clientes', {
      type: 'buffer',
      cellFormula: false,
      raw: true,
    })

    const sheetName = assertSheetName(
      findTop20SheetName(workbook),
      'top_20_clientes',
      'Top 20 vendedores c formula / Top 20 Clientes'
    )

    const planilha = assertWorksheetExists(workbook.Sheets[sheetName], 'top_20_clientes', sheetName)

    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(planilha, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    })

    if (!rows || rows.length === 0) {
      return {
        clientes: [],
        monthLabels: {
          mes25: 'jul/25',
          mes26: 'jul/26',
        },
      }
    }

    const headerIndex = rows.findIndex((row) => {
      const first = normalizeKey(String(row[0] || ''))
      const second = normalizeKey(String(row[1] || ''))
      return first === 'nivel' && second === 'gerencias'
    })

    if (headerIndex === -1) {
      throw new Error('Cabecalho esperado nao encontrado na aba Top 20 Clientes')
    }

    const headerRow = rows[headerIndex]
    const percentIndexesDot = findDuplicateHeaderIndexes(headerRow, '% Cresc.')
    const percentIndexesNoDot = findDuplicateHeaderIndexes(headerRow, '% Cresc')
    const sortedPercentIndexes = Array.from(new Set([...percentIndexesDot, ...percentIndexesNoDot])).sort((a, b) => a - b)

    const pickPercentAfter = (baseIndex: number, used: Set<number>): number => {
      const found = sortedPercentIndexes.find((idx) => idx > baseIndex && !used.has(idx))
      if (found === undefined) return -1
      used.add(found)
      return found
    }

    const usedPercentIndexes = new Set<number>()

    const tri25Index = findHeaderIndexAny(headerRow, ['Trimestre 25', 'Tri 25', 'tri 25', 'Tri/25', 'tri/25'])
    const tri26Index = findHeaderIndexAny(headerRow, ['Trimestre 26', 'Tri 26', 'tri 26', 'Tri/26', 'tri/26'])
    const percCrescTriIndex =
      tri26Index !== -1
        ? pickPercentAfter(tri26Index, usedPercentIndexes)
        : (sortedPercentIndexes[0] ?? -1)

    // Em alguns arquivos reais, os cabeçalhos de mês vêm como número serial de data.
    // Nesse caso, usamos a posição após o primeiro "% Cresc" como fallback.
    const mai25ByName = findHeaderIndexAny(headerRow, ['jun/25', 'mai/25'])
    const mai26ByName = findHeaderIndexAny(headerRow, ['jun/26', 'mai/26'])
    const fallbackMai25 = percCrescTriIndex !== -1 ? percCrescTriIndex + 1 : -1
    const fallbackMai26 = percCrescTriIndex !== -1 ? percCrescTriIndex + 2 : -1
    const resolvedMai25 = mai25ByName !== -1 ? mai25ByName : fallbackMai25
    const resolvedMai26 = mai26ByName !== -1 ? mai26ByName : fallbackMai26

    const percCrescMesIndex =
      resolvedMai26 !== -1
        ? pickPercentAfter(resolvedMai26, usedPercentIndexes)
        : (sortedPercentIndexes[1] ?? -1)

    const columnIndexes = {
      nivel: findHeaderIndex(headerRow, 'Nível'),
      gerencias: findHeaderIndex(headerRow, 'Gerências'),
      equipes: findHeaderIndex(headerRow, 'Equipes'),
      cod: findHeaderIndex(headerRow, 'Cod'),
      vendedor: findHeaderIndex(headerRow, 'Vendedor'),
      pasta: findHeaderIndex(headerRow, 'Pasta'),
      codCliente: (() => {
        const exact = findHeaderIndex(headerRow, 'Cod Cliente')
        if (exact !== -1) return exact
        return findHeaderIndex(headerRow, 'Cod cliente')
      })(),
      clienteRedes: findHeaderIndexAny(headerRow, ['Cliente/Rede', 'Cliente/Redes']),
      tri25: tri25Index,
      tri26: tri26Index,
      percCrescTri: percCrescTriIndex,
      mai25: resolvedMai25,
      mai26: resolvedMai26,
      percCrescMes: percCrescMesIndex,
    }

    const monthLabels = {
      mes25: formatTop20MonthHeader(headerRow[resolvedMai25] ?? null, 'jul/25'),
      mes26: formatTop20MonthHeader(headerRow[resolvedMai26] ?? null, 'jul/26'),
    }

    console.info('[TOP20] Column mapping resolved:', columnIndexes)

    const requiredColumns = ['nivel', 'gerencias', 'equipes', 'cod', 'vendedor', 'pasta', 'codCliente', 'clienteRedes', 'tri25', 'tri26', 'percCrescTri', 'mai25', 'mai26', 'percCrescMes'] as const
    const missingColumns = requiredColumns.filter((key) => columnIndexes[key] === -1)

    if (missingColumns.length > 0) {
      throw new Error(`[TOP20] Colunas obrigatorias ausentes: ${missingColumns.join(', ')}`)
    }

    const dataRows = rows.slice(headerIndex + 1)
    const agregados = new Map<string, Top20ClienteData>()

    for (const row of dataRows) {
      const nivel = normalizeTop20Nivel(row[columnIndexes.nivel])
      if (!nivel) continue

      const gerencias = row[columnIndexes.gerencias] ? String(row[columnIndexes.gerencias]).trim() : null
      const codigoEquipe = toNumberFlexible(row[columnIndexes.equipes])
      const codigoVendedor = toNumberFlexible(row[columnIndexes.cod])
      const vendedorNome = row[columnIndexes.vendedor] ? String(row[columnIndexes.vendedor]).trim() : null
      const pasta = row[columnIndexes.pasta] ? String(row[columnIndexes.pasta]).trim() : null
      const codigoClienteBruto = row[columnIndexes.codCliente]
      const codigoCliente = toNumberFlexible(codigoClienteBruto)
      const clienteRedes = String(row[columnIndexes.clienteRedes] || '').trim()
      const tipoRegistro: 'CLIENTE' | 'REDE' = codigoCliente === null ? 'REDE' : 'CLIENTE'

      if (!clienteRedes) continue

      if (nivelContexto !== null && nivel !== nivelContexto) continue
      if (vendedor !== null && codigoVendedor !== vendedor) continue
      if (equipe !== null && codigoEquipe !== equipe) continue
      if (gerencia !== null && gerencias && normalizeKey(gerencias) !== normalizeKey(gerencia)) continue

      const tri25 = toNumberFlexible(row[columnIndexes.tri25]) || 0
      const tri26 = toNumberFlexible(row[columnIndexes.tri26]) || 0
      const mai25 = toNumberFlexible(row[columnIndexes.mai25]) || 0
      const mai26 = toNumberFlexible(row[columnIndexes.mai26]) || 0

      // Consolida linhas por cliente/rede no mesmo contexto (nivel, gerencia, equipe, vendedor).
      const chave = [
        nivel,
        gerencias || '',
        String(codigoEquipe || ''),
        String(codigoVendedor || ''),
        tipoRegistro,
        String(codigoCliente || ''),
        clienteRedes,
      ].join('|')

      const existente = agregados.get(chave)
      if (existente) {
        existente.tri25 += tri25
        existente.tri26 += tri26
        existente.mai25 += mai25
        existente.mai26 += mai26
        existente.percCrescTri = calcularPercentualCrescimento(existente.tri26, existente.tri25)
        existente.percCrescMes = calcularPercentualCrescimento(existente.mai26, existente.mai25)
      } else {
        agregados.set(chave, {
          nivel: nivel as 'GLOBAL' | 'GERENCIA' | 'EQUIPE' | 'VENDEDOR',
          gerencias,
          equipes: codigoEquipe,
          codigoVendedor,
          vendedor: vendedorNome,
          pasta,
          tipoRegistro,
          codigoCliente,
          clienteRedes,
          tri25,
          tri26,
          percCrescTri: calcularPercentualCrescimento(tri26, tri25),
          mai25,
          mai26,
          percCrescMes: calcularPercentualCrescimento(mai26, mai25),
        })
      }
    }

    const resultado = Array.from(agregados.values())

    if (resultado.length > 0) {
      console.info('[TOP20] Primeiro registro processado:', resultado[0])
    }

    console.info('[TOP20] Total de registros apos filtros:', {
      nivelContexto,
      vendedor,
      equipe,
      gerencia,
      total: resultado.length,
    })

    return {
      clientes: resultado,
      monthLabels,
    }
  } catch (error) {
    console.error('Erro ao buscar top 20 clientes:', error)
    return {
      clientes: [],
      monthLabels: {
        mes25: 'jul/25',
        mes26: 'jul/26',
      },
    }
  }
}

export async function buscarCategoriasTop20(
  vendedor: number | null,
  equipe: number | null,
  gerencia: string | null
): Promise<string[]> {
  void vendedor
  void equipe
  void gerencia
  // A coluna "Categorias" foi removida da planilha Top 20. Retorna lista vazia.
  return []
}
