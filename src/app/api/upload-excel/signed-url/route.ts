import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUserFromRequest } from '@/lib/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SignedUrlRequest {
  tipo: 'dados_app' | 'nao_positivados' | 'top_20_clientes' | 'sortimentos'
  fileName: string
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUserFromRequest()
    const body = (await request.json()) as SignedUrlRequest
    const { tipo, fileName } = body

    if (!sessionUser || sessionUser.perfil !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Somente administradores podem fazer upload.' },
        { status: 403 }
      )
    }

    if (!tipo || (tipo !== 'dados_app' && tipo !== 'nao_positivados' && tipo !== 'top_20_clientes' && tipo !== 'sortimentos')) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Use: dados_app, nao_positivados, top_20_clientes ou sortimentos' },
        { status: 400 }
      )
    }

    const normalizedFileName = (fileName || '').toLowerCase()
    if (!normalizedFileName.endsWith('.xlsx') && !normalizedFileName.endsWith('.xlsm')) {
      return NextResponse.json(
        { error: 'Formato inválido. Envie arquivo .xlsx ou .xlsm' },
        { status: 400 }
      )
    }

    const storagePath =
      tipo === 'dados_app'
        ? 'dados_app.xlsx'
        : tipo === 'nao_positivados'
        ? 'nao_positivados.xlsx'
        : tipo === 'top_20_clientes'
        ? 'top_20_clientes.xlsx'
        : 'sortimentos.xlsx'

    // Deletar arquivo existente para permitir sobrescrita
    await supabaseAdmin.storage
      .from('excel-files')
      .remove([storagePath])
    // Ignoramos erros aqui - se o arquivo não existir, não há problema

    const { data, error } = await supabaseAdmin.storage
      .from('excel-files')
      .createSignedUploadUrl(storagePath)

    if (error || !data) {
      return NextResponse.json(
        { error: 'Erro ao gerar URL de upload: ' + (error?.message || 'desconhecido') },
        { status: 500 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const signedUrl = data.signedUrl.startsWith('http')
      ? data.signedUrl
      : `${supabaseUrl}${data.signedUrl}`

    return NextResponse.json({
      success: true,
      bucket: 'excel-files',
      path: data.path,
      token: data.token,
      signedUrl,
      storagePath,
      timestamp: Date.now(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao preparar upload: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const maxDuration = 45
