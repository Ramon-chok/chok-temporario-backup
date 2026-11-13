import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 45

type SortimentoRow = {
  codigo: string
  descricao: string
  fabricante: string
  [key: string]: unknown
}

type SortimentosCacheEntry = {
  sourceKey: string
  mtimeRef: string
  loadedAt: number
  rows: SortimentoRow[]
}

const CACHE_TTL_MS = 10 * 60 * 1000
let sortimentosCache: SortimentosCacheEntry | null = null

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getText(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') {
      return String(value)
    }
  }
  return ''
}

async function resolveLocalWorkbookPath(): Promise<string | null> {
  const candidates = [
    path.join(process.cwd(), 'public', 'Sortimentos 2026.xlsx'),
    path.join(process.cwd(), 'public', 'sortimentos.xlsx'),
    path.join(process.cwd(), 'public', 'sortimentos.xlsm'),
  ]

  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // Try next candidate.
    }
  }

  return null
}

async function resolveStorageWorkbookPath(): Promise<{ tmpPath: string; updatedAt: string; storageName: string } | null> {
  const candidates = ['sortimentos.xlsx', 'sortimentos.xlsm', 'Sortimentos 2026.xlsx']

  for (const storageName of candidates) {
    const { data, error } = await supabaseAdmin.storage.from('excel-files').download(storageName)
    if (error || !data) continue

    const listName = storageName.includes('/') ? storageName.split('/').pop() || storageName : storageName
    const { data: files } = await supabaseAdmin.storage.from('excel-files').list('', {
      search: listName,
      limit: 100,
      offset: 0,
    })

    const fileMeta = (files || []).find((item) => item.name === listName)
    const updatedAt = fileMeta?.updated_at || fileMeta?.created_at || '0'

    const tmpDir = '/tmp'
    const ext = storageName.toLowerCase().endsWith('.xlsm') ? 'xlsm' : 'xlsx'
    const tmpPath = `${tmpDir}/sortimentos_${Date.now()}.${ext}`

    const bytes = Buffer.from(await data.arrayBuffer())

    const fs = await import('node:fs')
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }
    fs.writeFileSync(tmpPath, bytes)

    return { tmpPath, updatedAt, storageName }
  }

  return null
}

async function loadSortimentosFromWorkbook(workbookPath: string): Promise<SortimentoRow[]> {
  const workbookBuffer = await readFile(workbookPath)
  const workbook = XLSX.read(workbookBuffer, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('Planilha de sortimentos sem abas validas')
  }

  const sheet = workbook.Sheets[firstSheetName]

  if (!sheet) {
    throw new Error('Nao foi possivel carregar a aba principal da planilha de sortimentos')
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  return rows.map((row) => ({
    codigo: getText(row, ['Codigo', 'Código', 'CODIGO', 'CÓDIGO', 'A']),
    descricao: getText(row, ['Descricao', 'Descrição', 'DESCRICAO', 'DESCRIÇÃO', 'B']),
    fabricante: getText(row, ['Fabricante', 'FABRICANTE', 'Categoria', 'C']),
    ...row,
  }))
}

export async function GET() {
  try {
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL

    let workbookPath: string | null = null
    let sourceKey = ''
    let mtimeRef = ''

    if (!isProduction) {
      const localPath = await resolveLocalWorkbookPath()
      if (localPath) {
        const fileStats = await stat(localPath)
        workbookPath = localPath
        sourceKey = `local:${localPath}`
        mtimeRef = String(fileStats.mtimeMs)
      }
    }

    if (!workbookPath) {
      const storageData = await resolveStorageWorkbookPath()
      if (!storageData) {
        return NextResponse.json(
          { error: 'Arquivo de sortimentos nao encontrado no Storage nem em public/' },
          { status: 404 }
        )
      }

      workbookPath = storageData.tmpPath
      sourceKey = `storage:${storageData.storageName}`
      mtimeRef = storageData.updatedAt
    }

    const now = Date.now()
    if (
      sortimentosCache &&
      sortimentosCache.sourceKey === sourceKey &&
      sortimentosCache.mtimeRef === mtimeRef &&
      now - sortimentosCache.loadedAt < CACHE_TTL_MS
    ) {
      return NextResponse.json(sortimentosCache.rows, {
        headers: {
          'Cache-Control': 'private, max-age=60',
        },
      })
    }

    const rows = await loadSortimentosFromWorkbook(workbookPath)
    sortimentosCache = {
      sourceKey,
      mtimeRef,
      loadedAt: now,
      rows,
    }

    return NextResponse.json(rows, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('Erro ao carregar sortimentos:', error)
    const detail = error instanceof Error ? error.message : 'erro-desconhecido'

    return NextResponse.json(
      {
        error: 'Erro ao carregar lista de sortimentos',
        ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
      },
      { status: 500 }
    )
  }
}
