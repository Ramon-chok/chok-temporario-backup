const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const PERFIS_VALIDOS = new Set(['vendedor', 'supervisor', 'gerencia', 'admin'])

function simpleHash(text) {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return 'hash_' + Math.abs(hash).toString(16)
}

function normalizarCabecalho(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getValor(obj, aliases) {
  for (const alias of aliases) {
    const key = Object.keys(obj).find((k) => normalizarCabecalho(k) === alias)
    if (key) return obj[key]
  }
  return undefined
}

async function main() {
  const fileArg = process.argv[2]
  if (!fileArg) {
    console.error('Uso: node scripts/importar_usuarios_excel.js <caminho_da_planilha.xlsx>')
    process.exit(1)
  }

  const filePath = path.resolve(process.cwd(), fileArg)
  if (!fs.existsSync(filePath)) {
    console.error('Arquivo nao encontrado:', filePath)
    process.exit(1)
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Variaveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias.')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const workbook = XLSX.readFile(filePath)
  const firstSheet = workbook.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
    defval: '',
    raw: false,
  })

  if (!rows.length) {
    console.error('Planilha vazia.')
    process.exit(1)
  }

  const validRows = []
  const skipped = []

  rows.forEach((row, index) => {
    const usuario = String(
      getValor(row, ['usuario', 'user', 'login', 'codigo', 'cod_usuario'])
    ).trim()
    const senha = String(
      getValor(row, ['senha', 'password', 'pass'])
    )
      .trim()
    const perfilRaw = String(
      getValor(row, ['perfil', 'role', 'papel'])
    )
      .trim()
      .toLowerCase()

    const linha = index + 2

    if (!usuario || !senha || !perfilRaw) {
      skipped.push({ linha, motivo: 'usuario/senha/perfil ausentes' })
      return
    }

    if (!PERFIS_VALIDOS.has(perfilRaw)) {
      skipped.push({ linha, motivo: `perfil invalido: ${perfilRaw}` })
      return
    }

    validRows.push({
      usuario,
      perfil: perfilRaw,
      senha_hash: simpleHash(senha),
    })
  })

  if (!validRows.length) {
    console.error('Nenhuma linha valida para importar.')
    if (skipped.length) {
      console.error('Linhas ignoradas:')
      skipped.slice(0, 20).forEach((s) => console.error(`- linha ${s.linha}: ${s.motivo}`))
    }
    process.exit(1)
  }

  const BATCH_SIZE = 300
  let totalProcessado = 0

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('usuarios')
      .upsert(batch, { onConflict: 'usuario' })

    if (error) {
      console.error('Erro no upsert do lote:', error.message)
      process.exit(1)
    }

    totalProcessado += batch.length
    console.log(`Lote processado: ${totalProcessado}/${validRows.length}`)
  }

  console.log('\nImportacao concluida com sucesso!')
  console.log(`Total importado/atualizado: ${validRows.length}`)
  console.log(`Total ignorado: ${skipped.length}`)

  if (skipped.length) {
    console.log('\nPrimeiras linhas ignoradas:')
    skipped.slice(0, 20).forEach((s) => console.log(`- linha ${s.linha}: ${s.motivo}`))
  }
}

main().catch((error) => {
  console.error('Erro inesperado:', error)
  process.exit(1)
})