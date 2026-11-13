import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'
import { getSessionUserFromRequest } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type FileType = 'excel' | 'csv'

type PreparedImportData = {
  cleanRegistrosFaturamento: Record<string, unknown>[]
  cleanDetalhesFaturamento: Record<string, unknown>[]
}

type ImportCacheEntry = {
  sourcePath: string
  sourceMtimeMs: number
  sourceSize: number
  prepared: PreparedImportData
}

let preparedImportCache: ImportCacheEntry | null = null

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function parseCSV(csv: string): Record<string, unknown>[] {
  const lines = csv.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  // Parser CSV que respeita aspas
  function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseCSVLine(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length > 0) {
      const row: Record<string, unknown> = {}
      headers.forEach((header, index) => {
        const value = values[index]
        if (value !== undefined && value !== '') {
          // Converter números
          row[header] = isNaN(Number(value)) ? value : Number(value)
        } else {
          row[header] = value
        }
      })
      rows.push(row)
    }
  }

  return rows
}

function parseValue(value: unknown): unknown {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'string') {
    let str = value.trim()
    if (str === '-' || str === '–' || str === '—') return null
    str = str.replace(/[^\d,.-]/g, '')
    if (str === '' || str === '-') return null
    str = str.replace(',', '.')

    const parsed = parseFloat(str)
    if (!isNaN(parsed)) return parsed
    return null
  }

  if (typeof value === 'number') return value
  return value
}

function normalizeHeaderName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function assertDadosAppRequiredHeaders(rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) {
    throw new Error('Nenhuma linha valida encontrada na aba de extracao do dados_app')
  }

  const headers = Object.keys(rows[0]).map(normalizeHeaderName)
  const requiredHeaderGroups = [
    ['nu_ped'],
    ['dt_ped'],
    ['cod_vend'],
    ['nome vendedor'],
    ['cd_clien'],
    ['razao social'],
    ['municipio'],
    ['qtd venda'],
    ['valor unitario'],
    ['vl_venda'],
  ]

  const missingGroups = requiredHeaderGroups.filter(
    (group) => !group.some((header) => headers.includes(header))
  )

  if (missingGroups.length > 0) {
    throw new Error(
      `Colunas obrigatorias ausentes no dados_app: ${missingGroups.map((group) => group[0]).join(', ')}`
    )
  }
}

function loadDadosExtracao(filePath: string, fileType: FileType): Record<string, unknown>[] {
  if (fileType === 'excel') {
    const buffer = fs.readFileSync(filePath)
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      sheetRows: 0,
      cellFormula: false,
      cellHTML: false,
    })

    const sheetName =
      workbook.SheetNames.find(
        (name) =>
          name.toLowerCase().includes('extração') ||
          name.toLowerCase().includes('extracao') ||
          name.toLowerCase() === 'sheet1'
      ) || workbook.SheetNames[0]

    const worksheet = workbook.Sheets[sheetName]
    let dadosExtracao = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      raw: false,
      defval: '',
      range: 3,
      blankrows: false,
    })

    assertDadosAppRequiredHeaders(dadosExtracao)

    dadosExtracao = dadosExtracao.filter((linha: Record<string, unknown>) => {
      const nuPed = linha['nu_ped'] || linha['Nu_ped'] || linha['NU_PED'] || ''
      return nuPed.toString().trim() !== '' && nuPed.toString().trim() !== '-'
    })

    return dadosExtracao
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCSV(csvContent)
  assertDadosAppRequiredHeaders(rows)
  return rows
}

function prepareImportData(dadosExtracao: Record<string, unknown>[]): PreparedImportData {
  // A nomenclatura das tabelas (ped_vda/it_pedv) e legado historico.
  // No contexto atual, os dados sao derivados da planilha dados_app.
  const columnMap: { [key: string]: string } = {
    'dt_ped': 'dt_ped',
    'nu_ped': 'nu_ped',
    'cd_clien': 'cd_clie',
    'razão social': 'nm_clie',
    'cd_ibge': 'cd_cid',
    'municipio': 'nm_cid',
    'categoria': 'nm_cat',
    'cd_prod': 'cd_prod',
    'descrição do produto': 'nm_prod',
    'qtd venda': 'qtd',
    'valor unitário': 'vl_unit',
    'valor unitário ': 'vl_unit',
    ' valor unitário ': 'vl_unit',
    'vl_venda': 'vl_venda',
    'vl_venda ': 'vl_venda',
    ' vl_venda ': 'vl_venda',
    'mgbr + fin$': 'vl_mg_brt',
    'cod_vend': 'cd_vend',
    'nome vendedor': 'nm_vend',
    'valor nota': 'total',
  }

  const itemCounterPerPedido: { [key: string]: number } = {}
  const dadosNormalizados = dadosExtracao.map((linha) => {
    const linhaNormalizada: Record<string, unknown> = {}

    Object.keys(linha).forEach((colOriginal) => {
      const colNormalizada = columnMap[colOriginal.toLowerCase().trim()]
      if (colNormalizada) {
        linhaNormalizada[colNormalizada] = linha[colOriginal]
      }
    })

    if (linhaNormalizada.nu_ped) {
      const pedidoId = String(linhaNormalizada.nu_ped)
      if (!itemCounterPerPedido[pedidoId]) {
        itemCounterPerPedido[pedidoId] = 0
      }
      itemCounterPerPedido[pedidoId]++
      linhaNormalizada.nu_item = itemCounterPerPedido[pedidoId]
    }

    return linhaNormalizada
  })

  const pedidosMap = new Map<string | number, Record<string, unknown>>()
  const itensArray: Record<string, unknown>[] = []
  const validItensColumns = ['nu_ped', 'nu_item', 'qtd', 'vl_unit', 'vl_venda', 'vl_mg_brt', 'cd_prod', 'nm_prod']
  const numericItemColumns = new Set(['qtd', 'vl_unit', 'vl_venda', 'vl_mg_brt'])

  dadosNormalizados.forEach((linha) => {
    if (linha.nu_ped && !pedidosMap.has(linha.nu_ped as string | number)) {
      const pedido: Record<string, unknown> = {
        nu_ped: linha.nu_ped,
        dt_ped: linha.dt_ped,
        total: 0,
        cd_vend: linha.cd_vend || 'SEM_VENDEDOR',
        nm_vend: linha.nm_vend || 'Não informado',
        cd_clie: linha.cd_clie || 'SEM_CLIENTE',
        nm_clie: linha.nm_clie || 'Não informado',
        cd_cat: linha.cd_cat || 'SEM_CATEGORIA',
        nm_cat: linha.nm_cat || 'Sem Categoria',
        cd_cid: linha.cd_cid || 'SEM_CIDADE',
        nm_cid: linha.nm_cid || 'Não informado',
      }

      if (pedido.nu_ped && pedido.dt_ped) {
        pedidosMap.set(linha.nu_ped as string | number, pedido)
      }
    }

    if (linha.nu_ped && linha.nu_item) {
      const item: Record<string, unknown> = {}
      validItensColumns.forEach((col) => {
        if (linha[col] !== undefined && linha[col] !== null && linha[col] !== '') {
          if (numericItemColumns.has(col)) {
            item[col] = parseValue(linha[col])
          } else {
            item[col] = linha[col]
          }
        }
      })

      if (!item.cd_prod) item.cd_prod = 'SEM_CODIGO'
      if (!item.nm_prod) item.nm_prod = 'Produto não informado'

      if (item.nu_ped && item.nu_item && item.qtd && item.vl_unit && item.vl_venda) {
        itensArray.push(item)
      }
    }
  })

  const cleanRegistrosFaturamento = Array.from(pedidosMap.values())
  const cleanDetalhesFaturamento = itensArray

  cleanRegistrosFaturamento.forEach((pedido) => {
    if (!pedido.cd_vend || pedido.cd_vend === null) pedido.cd_vend = 'SEM_VENDEDOR'
    if (!pedido.nm_vend || pedido.nm_vend === null) pedido.nm_vend = 'Não informado'
    if (!pedido.cd_clie || pedido.cd_clie === null) pedido.cd_clie = 'SEM_CLIENTE'
    if (!pedido.nm_clie || pedido.nm_clie === null) pedido.nm_clie = 'Não informado'
    if (!pedido.cd_cat || pedido.cd_cat === null) pedido.cd_cat = 'SEM_CATEGORIA'
    if (!pedido.nm_cat || pedido.nm_cat === null) pedido.nm_cat = 'Sem Categoria'
    if (!pedido.cd_cid || pedido.cd_cid === null) pedido.cd_cid = 'SEM_CIDADE'
    if (!pedido.nm_cid || pedido.nm_cid === null) pedido.nm_cid = 'Não informado'
  })

  // Evita custo O(n²): indexa pedidos por nu_ped para somar totais em O(n).
  const pedidosByNumero = new Map<string, Record<string, unknown>>()
  cleanRegistrosFaturamento.forEach((pedido) => {
    pedidosByNumero.set(String(pedido.nu_ped), pedido)
  })

  cleanDetalhesFaturamento.forEach((item) => {
    item.qtd = parseValue(item.qtd) || 0
    item.vl_unit = parseValue(item.vl_unit) || 0
    item.vl_venda = parseValue(item.vl_venda) || 0
    item.vl_mg_brt = parseValue(item.vl_mg_brt) || 0

    const pedido = pedidosByNumero.get(String(item.nu_ped))
    if (pedido) {
      pedido.total = (Number(pedido.total) || 0) + (Number(item.vl_venda) || 0)
    }
  })

  return {
    cleanRegistrosFaturamento,
    cleanDetalhesFaturamento,
  }
}

function getPreparedImportData(filePath: string, fileType: FileType): PreparedImportData {
  const stats = fs.statSync(filePath)

  if (
    preparedImportCache &&
    preparedImportCache.sourcePath === filePath &&
    preparedImportCache.sourceMtimeMs === stats.mtimeMs &&
    preparedImportCache.sourceSize === stats.size
  ) {
    return preparedImportCache.prepared
  }

  const dadosExtracao = loadDadosExtracao(filePath, fileType)
  const prepared = prepareImportData(dadosExtracao)

  preparedImportCache = {
    sourcePath: filePath,
    sourceMtimeMs: stats.mtimeMs,
    sourceSize: stats.size,
    prepared,
  }

  return prepared
}

export async function POST() {
  try {
    const sessionUser = await getSessionUserFromRequest()
    if (!sessionUser || sessionUser.perfil !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Somente administradores podem importar dados.' },
        { status: 403 }
      )
    }

    // Copiar arquivo da origem para public/dados_app.xlsx
    const sourceFile = 'C:\\Users\\laura.barbosa\\Documents\\dados_app.xlsm'
    const publicDir = path.join(process.cwd(), 'public')
    const targetFile = path.join(publicDir, 'dados_app.xlsx')
    
    // Verificar se arquivo de origem existe
    if (!fs.existsSync(sourceFile)) {
      return NextResponse.json(
        { error: `Arquivo não encontrado em: ${sourceFile}. Certifique-se de que o arquivo existe neste local.` },
        { status: 400 }
      )
    }
    
    // Copiar apenas quando o arquivo de origem mudar, evitando I/O desnecessário.
    const sourceStats = fs.statSync(sourceFile)
    const targetExists = fs.existsSync(targetFile)
    const targetStats = targetExists ? fs.statSync(targetFile) : null
    const shouldCopy =
      !targetExists ||
      !targetStats ||
      sourceStats.mtimeMs > targetStats.mtimeMs ||
      sourceStats.size !== targetStats.size

    if (shouldCopy) {
      fs.copyFileSync(sourceFile, targetFile)
    }
    
    const dataDir = publicDir
    const possibleFiles = ['dados_app.xlsx']
    
    let filePath: string | null = null
    let fileType: 'excel' | 'csv' | null = null
    
    for (const filename of possibleFiles) {
      const testPath = path.join(dataDir, filename)
      if (fs.existsSync(testPath)) {
        filePath = testPath
        fileType = filename.includes('.csv') ? 'csv' : 'excel'
        break
      }
    }

    // Verificar se arquivo existe
    if (!filePath || !fileType) {
      const availableFiles = fs.readdirSync(dataDir).join(', ')
      return NextResponse.json(
        { error: `Arquivo não encontrado. Arquivos em public/: ${availableFiles}` },
        { status: 400 }
      )
    }

    const { cleanRegistrosFaturamento, cleanDetalhesFaturamento } = getPreparedImportData(filePath, fileType)

    if (cleanRegistrosFaturamento.length === 0 || cleanDetalhesFaturamento.length === 0) {
      return NextResponse.json(
        { error: `Nenhum dado valido encontrado apos processamento. Registros: ${cleanRegistrosFaturamento.length}, Detalhes: ${cleanDetalhesFaturamento.length}. Verifique se os campos obrigatorios (nu_ped, dt_ped, total, qtd, vl_unit, vl_venda) estao preenchidos.` },
        { status: 400 }
      )
    }

    const incomingPedidoIds = Array.from(
      new Set(cleanRegistrosFaturamento.map((pedido) => String(pedido.nu_ped)))
    )

    const { data: existingPedidosData, error: existingPedidosError } = await supabase
      .from('ped_vda')
      .select('nu_ped')

    if (existingPedidosError) {
      throw new Error(`Erro ao buscar pedidos existentes: ${existingPedidosError.message}`)
    }

    const existingPedidoIds = new Set(
      (existingPedidosData || []).map((row) => String(row.nu_ped))
    )

    const idsToDeleteOnly = Array.from(existingPedidoIds).filter(
      (pedidoId) => !incomingPedidoIds.includes(pedidoId)
    )

    // Remove pedidos que sumiram do arquivo atual.
    for (const loteIds of chunkArray(idsToDeleteOnly, 500)) {
      const { error: itensDeleteError } = await supabase
        .from('it_pedv')
        .delete()
        .in('nu_ped', loteIds)
      if (itensDeleteError) {
        throw new Error(`Erro ao remover itens antigos (it_pedv): ${itensDeleteError.message}`)
      }

      const { error: pedidosDeleteError } = await supabase
        .from('ped_vda')
        .delete()
        .in('nu_ped', loteIds)
      if (pedidosDeleteError) {
        throw new Error(`Erro ao remover pedidos antigos (ped_vda): ${pedidosDeleteError.message}`)
      }
    }

    // Reposição segmentada: remove e reinsere apenas os pedidos presentes no arquivo atual.
    for (const loteIds of chunkArray(incomingPedidoIds, 500)) {
      const { error: itensDeleteError } = await supabase
        .from('it_pedv')
        .delete()
        .in('nu_ped', loteIds)
      if (itensDeleteError) {
        throw new Error(`Erro ao substituir itens (it_pedv): ${itensDeleteError.message}`)
      }

      const { error: pedidosDeleteError } = await supabase
        .from('ped_vda')
        .delete()
        .in('nu_ped', loteIds)
      if (pedidosDeleteError) {
        throw new Error(`Erro ao substituir pedidos (ped_vda): ${pedidosDeleteError.message}`)
      }
    }

    // Inserir pedidos em lotes para evitar payloads muito grandes.
    for (const lotePedidos of chunkArray(cleanRegistrosFaturamento, 500)) {
      const { error: pedError } = await supabase.from('ped_vda').insert(lotePedidos)
      if (pedError) throw new Error(`Erro ao inserir ped_vda: ${pedError.message}`)
    }

    // Inserir itens em lotes menores (otimizado para grandes volumes 500k+)
    const chunk = 250
    for (let i = 0; i < cleanDetalhesFaturamento.length; i += chunk) {
      const lote = cleanDetalhesFaturamento.slice(i, i + chunk)
      const { error: itenError } = await supabase.from('it_pedv').insert(lote)
      if (itenError) throw new Error(`Erro ao inserir it_pedv: ${itenError.message}`)
    }

    // Validar
    const { count: pedCount } = await supabase
      .from('ped_vda')
      .select('*', { count: 'exact', head: true })

    const { count: itenCount } = await supabase
      .from('it_pedv')
      .select('*', { count: 'exact', head: true })

    // Testar KPIs
    const { data: kpis } = await supabase.rpc('get_kpis', {
      start_date: null,
      end_date: null,
    })

    return NextResponse.json({
      success: true,
      message: 'Dados de faturamento importados com sucesso do arquivo local (dados_app)!',
      stats: {
        pedidos: pedCount,
        itens: itenCount,
        registrosFaturamento: pedCount,
        detalhesFaturamento: itenCount,
        kpis: kpis?.[0] || null,
      },
    })
  } catch (error: unknown) {
    console.error('Erro na importação:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro ao importar dados'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
