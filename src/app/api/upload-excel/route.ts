import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUserFromRequest } from '@/lib/session'
import { limparArquivosAntigos } from '@/lib/storage-cleanup'

// Cliente Supabase com privilégios admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const defaultMaxUploadSizeMb = 50
    const configuredMaxUploadSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB ?? process.env.NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB ?? defaultMaxUploadSizeMb)
    const maxUploadSizeMb = Number.isFinite(configuredMaxUploadSizeMb) && configuredMaxUploadSizeMb > 0
      ? configuredMaxUploadSizeMb
      : defaultMaxUploadSizeMb
    const maxUploadSizeBytes = Math.floor(maxUploadSizeMb * 1024 * 1024)
    const sessionUser = await getSessionUserFromRequest()
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tipo = formData.get('tipo') as string // 'dados_app', 'nao_positivados', 'top_20_clientes' ou 'sortimentos'

    if (!sessionUser || sessionUser.perfil !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Somente administradores podem fazer upload.' },
        { status: 403 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    if (!tipo || (tipo !== 'dados_app' && tipo !== 'nao_positivados' && tipo !== 'top_20_clientes' && tipo !== 'sortimentos')) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Use: dados_app, nao_positivados, top_20_clientes ou sortimentos' },
        { status: 400 }
      )
    }

    // Validar extensão
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xlsm')) {
      return NextResponse.json(
        { error: 'Formato inválido. Envie arquivo .xlsx ou .xlsm' },
        { status: 400 }
      )
    }

    if (file.size > maxUploadSizeBytes) {
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2)
      return NextResponse.json(
        { error: `Arquivo muito grande (${fileSizeMb}MB). O limite é ${maxUploadSizeMb}MB` },
        { status: 400 }
      )
    }

    // Converter arquivo para buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Definir nome do arquivo no Supabase baseado no tipo
    const supabaseFileName =
      tipo === 'dados_app'
        ? 'dados_app.xlsx'
        : tipo === 'nao_positivados'
        ? 'nao_positivados.xlsx'
        : tipo === 'top_20_clientes'
        ? 'top_20_clientes.xlsx'
        : 'sortimentos.xlsx'

    // Upload para Supabase Storage (ÚNICA FONTE DE VERDADE)
    const { error } = await supabaseAdmin.storage
      .from('excel-files')
      .upload(supabaseFileName, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true, // Sobrescrever se já existir
        cacheControl: 'no-cache, no-store, must-revalidate, max-age=0',
      })

    if (error) {
      console.error('Erro no upload do Supabase Storage:', error)
      return NextResponse.json(
        { error: 'Erro ao fazer upload no Supabase: ' + error.message },
        { status: 500 }
      )
    }

    // Mantém no Supabase apenas a última importação
    await limparArquivosAntigos(supabaseAdmin)

    console.log(`[UPLOAD] Arquivo enviado com sucesso: ${file.name} (${buffer.length} bytes) -> ${supabaseFileName}`)

    return NextResponse.json({
      success: true,
      message: `Arquivo ${tipo} enviado e salvo com sucesso no Supabase`,
      fileName: file.name,
      size: buffer.length,
      savedAs: supabaseFileName,
      storage: 'supabase',
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Erro no upload de arquivo:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer upload: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const maxDuration = 45
